var Transform = require('stream').Transform;
var StringDecoder = require('string_decoder').StringDecoder;
var util = require('util');
var consts = require('./consts');

var HTTPStatusLineRE = /HTTP\/\d+\.\d+\s(\d{3})\s(.+)$/;
var HTTPHeaderRE = /([^:]+):(.*)/;
var States = {
	TRY_STATUS: 1,
	TRY_HEADERS: 2,
	TRY_CHUNK: 3,
	TRY_CONTENT: 4
};

var HTTPReaderStream = function(options) {
	var self = this;
	Transform.call(self, options);
	var state = States.TRY_STATUS;
	var data = '';
	var decoder = new StringDecoder(consts.STRING_ENCODING);
	var contentLength = null;

	var parseStatusLine = function() {
		var p = data.indexOf(consts.CRLF);
		if (p === -1) {
			return;
		}
		var statusLine = HTTPStatusLineRE.exec(data.slice(0, p));
		if (!statusLine) {
			return;
		}
		data = data.slice(p + 2);
		state = States.TRY_HEADERS;
		self.emit('status', statusLine[1]);
		parseHeaders();
	};

	var parseHeaders = function() {
		var p = data.indexOf(consts.CRLF + consts.CRLF);
		if (p === -1) {
			return;
		}
		var headers = data.slice(0, p).split(consts.CRLF);
		if (!headers || !headers.length) {
			return;
		}
		data = data.slice(p + 4);
		state = States.TRY_CONTENT;
		contentLength = null;
		headers.forEach(function(line) {
			var match = HTTPHeaderRE.exec(line.toLowerCase());
			if (match) {
				if (match[1] === 'transfer-encoding' && match[2].trim() === 'chunked') {
					state = States.TRY_CHUNK;
				} else if (match[1] === 'content-length') {
					contentLength = parseInt(match[2].trim());
				}
			}
		});
		self.emit('headers', headers);
		handleState();
	};

	var parseChunk = function() {
		var p = data.indexOf(consts.CRLF);
		if (p === -1) {
			return;
		}
		var size = parseInt(data.slice(0, p), 16);
		if (size === 0) {
			data = data.slice(p + 4);
			state = States.TRY_STATUS;
			return process.nextTick(parseStatusLine);
		}
		var tmp = data.slice(p + 2);
		if (tmp.length < (size + 2)) {
			return;
		}
		self.push(tmp.slice(0, size));
		data = tmp.slice(size + 2);
		parseChunk(); // XXX convert this to a proper loop
	};

	var parseContent = function() {
		var len = contentLength !== null ? contentLength : data.length;
		if (len > data.length) {
			// XXX we should have a limit here, or we could buffer "forever"
			return;
		}
		self.push(data.slice(0, len));
		data = data.slice(len);
		state = States.TRY_STATUS;
		process.nextTick(parseStatusLine);
	};

	var handleState = function() {
		switch (state) {
		case States.TRY_STATUS:
			parseStatusLine();
			break;
		case States.TRY_HEADERS:
			parseHeaders();
			break;
		case States.TRY_CHUNK:
			parseChunk();
			break;
		case States.TRY_CONTENT:
			parseContent();
			break;
		}
	};

	self._transform = function(chunk, enc, done) {
		data += decoder.write(chunk);
		handleState();
		done();
	};

	self._flush = function(done) {
		handleState();
		done();		
	};

	return self;
};

util.inherits(HTTPReaderStream, Transform);

module.exports = function(options) {
	return new HTTPReaderStream(options);
};