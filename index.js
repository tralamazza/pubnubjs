var assert = require('assert');
var dns = require('dns');
var querystring = require('querystring');
var net = require('net');
var tls = require('tls');
var zlib = require('zlib');
var genericPool = require('generic-pool');
var HTTPReaderStream = require('./lib/http-reader-stream');
var consts = require('./lib/consts');
var cryptUtil = require('./lib/crypt-util');
var JSONStream = require('./lib/json-stream');

var PubNubClient = function(options) {
	assert(options.subscribe_key, 'missing subscribe_key');
	assert(options.publish_key, 'missing publish_key');
	var self = this;
	options.port = options.port || 443;
	options.host = options.host || 'pubsub.pubnub.com';
	options.pool_max = options.pool_max || 50;
	options.pool_idletimeout = options.pool_idletimeout || 20000;

	var createSocketConnection = function(callback) {
		// We manually resolve DNS for each new socket connection.
		// This avoids *getaddrinfo()* issues.
		dns.resolve(options.host, function(err, ips) {
			if (err) {
				return callback(err);
			}
			var client = (options.insecure ? net : tls).connect({
				port: options.port,
				host: ips[Math.floor(Math.random() * ips.length)],
				servername: options.host,
				secureOptions: require('constants').SSL_OP_NO_SSLv3
			}, function() {
				callback(null, client);
			});
		});
	};

	var poolResponse = genericPool.Pool({
		name: 'response',
		create: function(callback) {
			createSocketConnection(function(err, client) {
				if (err) {
					return callback(err);
				}
				// `client._QUEUE` keeps a FIFO of user callbacks.
				client._QUEUE = [];
				client.on('error', function(err) {
					poolResponse.destroy(client);
				});
				var reader = HTTPReaderStream();
				var json = JSONStream();
				client.pipe(reader).pipe(json).on('data', function(data) {
					// This works because HTTP pipelining guarantees ordering.
					var cb = client._QUEUE.shift();
					if (typeof cb === 'function') {
						cb(null, data);
					}
				});
				callback(null, client);
			});
		},
		destroy: function(client) {
			client.destroy();
			delete client._QUEUE;
		},
		max: options.pool_max,
		idleTimeoutMillis: options.pool_idletimeout
	});

	self.publish = function(channel, payload, pub_options, callback) {
		if (typeof pub_options === 'function') {
			callback = pub_options;
			pub_options = {};
		} else {
			pub_options = pub_options || {};
		}
		var headers = ['Host: ' + options.host];
		if (typeof payload === 'object') {
			payload = JSON.stringify(payload);
		}
		if (pub_options.cipher_key) {
			payload = '"' + cryptUtil.encryptSync(pub_options.cipher_key, payload) + '"';
		}
		poolResponse.acquire(function(err, client) {
			if (err) {
				return callback && callback(err);
			}
			var get = ['/publish',
				options.publish_key,
				options.subscribe_key,
				'0',
				querystring.escape(channel),
				'0',
				querystring.escape(payload)
			];
			client.write('GET ' + get.join('/') + '?' + querystring.stringify(pub_options.params) +
				' HTTP/1.1' + consts.CRLF + headers.join(consts.CRLF) + consts.CRLF + consts.CRLF);
			client._QUEUE.push(callback);
			poolResponse.release(client);
		});
	};

	self.subscribe = function(channel, sub_options, callback) {
		if (typeof sub_options === 'function') {
			callback = sub_options;
			sub_options = {};
		} else {
			sub_options = sub_options || {};
		}
		var headers = ['Host: ' + options.host];
		if (sub_options.gzip) {
			headers.push('Accept-Encoding: gzip');
		}
		createSocketConnection(function(err, client) {
			if (err) {
				return callback && callback(err);
			}
			var get = ['/stream',
				options.subscribe_key,
				querystring.escape(channel),
				'0',
				(typeof sub_options.timetoken !== 'undefined') ? sub_options.timetoken : '10000'
			];
			var request = 'GET ' + get.join('/') + '?' + querystring.stringify(sub_options.params || {}) +
				' HTTP/1.1' + consts.CRLF + headers.join(consts.CRLF) + consts.CRLF + consts.CRLF;
			client.write(request);
			var reader = HTTPReaderStream();
			client.pipe(reader);
			reader.on('chunked_end', client.write.bind(client, request));
			var json = JSONStream(sub_options);
			reader.on('headers', function(headers) {
				reader.unpipe();
				if (headers.indexOf('Content-Encoding: gzip') >= 0) {
					reader.pipe(zlib.createGunzip()).pipe(json);
				} else {
					reader.pipe(json);
				}
			});
			callback(null, json, client.destroy.bind(client));
		});
	};

	self.grant = function(grant_params, callback) {
		assert(options.secret_key, 'missing secret_key');
		if (typeof grant_params === 'function') {
			callback = grant_params;
			grant_params = {};
		} else {
			grant_params = grant_params || {};
		}
		var params = grant_params || {
			w: 0, r: 0, // ttl: 0, channel: '', auth: ''
		};
		params.timestamp = Math.round(Date.now() / 1000);
		var sorted_params = Object.keys(params).sort().map(function(item) {
			return item + '=' + querystring.escape(params[item]);
		}).join('&');
		var signature = cryptUtil.hmacSHA256Sync(options.secret_key, [options.subscribe_key,
			options.publish_key, 'grant', sorted_params].join("\n"))
			.replace(/\+/g,'-').replace(/\//g, '_');
		var headers = ['Host: ' + options.host];
		poolResponse.acquire(function(err, client) {
			if (err) {
				return callback && callback(err);
			}
			client.write('GET /v1/auth/grant/sub-key/' + options.subscribe_key +
				'?signature=' + querystring.escape(signature) + '&' + sorted_params +
				' HTTP/1.1' + consts.CRLF + headers.join(consts.CRLF) + consts.CRLF + consts.CRLF);
			client._QUEUE.push(callback);
			poolResponse.release(client);
		});
	};

	return self;
};

module.exports = function(options) {
	return new PubNubClient(options);
};