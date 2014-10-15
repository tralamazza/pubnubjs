var assert = require('assert');
var dns = require('dns');
var querystring = require('querystring');
var net = require('net');
var tls = require('tls');
var GenericPool = require('generic-pool');
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

	var poolSub = GenericPool.Pool({
		name: 'pubnub',
		create: function(callback) {
			dns.resolve(options.host, function(err, ips) {
				var client = (options.insecure ? net : tls).connect({
					port: options.port,
					host: ips[Math.floor(Math.random() * ips.length)],
					servername: options.host
				}, function() {
					callback(null, client);
				});
				client.setEncoding(consts.STRING_ENCODING);
				client.on('error', function(err) {
					poolSub.destroy(client);
				});
			});
		},
		destroy: function(client) {
			client.end();
		},
		max: options.pool_max,
		idleTimeoutMillis: options.pool_idletimeout
	});

	var poolPub = GenericPool.Pool({
		name: 'pubnub',
		create: function(callback) {
			dns.resolve(options.host, function(err, ips) {
				var client = (options.insecure ? net : tls).connect({
					port: options.port,
					host: ips[Math.floor(Math.random() * ips.length)],
					servername: options.host
				}, function() {
					callback(null, client);
				});
				client._QUEUE = [];
				client.setEncoding(consts.STRING_ENCODING);
				client.on('error', function(err) {
					poolPub.destroy(client);
				});
				var stream = client.pipe(HTTPReaderStream());
				stream.pipe(JSONStream()).on('data', function(data) {
					var callback = client._QUEUE.shift();
					if (typeof callback === 'function') {
						callback(data);
					}
				});
			});
		},
		destroy: function(client) {
			client._QUEUE.clear();
			client.end();
		},
		max: options.pool_max,
		idleTimeoutMillis: options.pool_idletimeout
	});

	self.publish = function(channel, payload, pub_options, callback) {
		pub_options = pub_options || {};
		var headers = ['Host: ' + options.host];
		if (typeof payload === 'object') {
			payload = JSON.stringify(payload);
		}
		if (pub_options.cipher_key) {
			payload = '"' + cryptUtil.encryptSync(pub_options.cipher_key, payload) + '"';
		}
		poolPub.acquire(function(err, client) {
			// GET /publish/PUB_KEY/SUB_KEY/0/CHANNEL/0/PAYLOAD HTTP/1.1\r\n
			// Host: pubsub.pubnub.com\r\n\r\n
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
			poolPub.release(client);
		});
	};

	self.subscribe = function(channel, sub_options, callback) {
		if (typeof params === 'function') {
			callback = params;
			sub_options = {};
		} else {
			sub_options = sub_options || {};
		}
		var headers = ['Host: ' + options.host];
		poolSub.acquire(function(err, client) {
			// GET /stream/SUB_KEY/CHANNEL/0/10000 HTTP/1.1\r\n
			// Host: pubsub.pubnub.com\r\n\r\n
			var get = ['/stream',
				options.subscribe_key,
				querystring.escape(channel),
				'0',
				'10000'
			];
			client.write('GET ' + get.join('/') + '?' + querystring.stringify(sub_options.params || {}) +
				' HTTP/1.1' + consts.CRLF + headers.join(consts.CRLF) + consts.CRLF + consts.CRLF);
			client.on('end', function() {
				poolSub.release(client);
			});
			callback(null, client.pipe(HTTPReaderStream()).pipe(JSONStream(sub_options)));
		});
	};

	return self;
};

module.exports = function(options) {
	return new PubNubClient(options);
};