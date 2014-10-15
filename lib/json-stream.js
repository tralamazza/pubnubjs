var Transform = require('stream').Transform;
var util = require('util');
var JsonParse = require('jsonparse');
var cryptUtil = require('./crypt-util');

var JSONStream = function(options) {
	var self = this;
	options = options || {};
	Transform.call(self, options);
	self._writableState.objectMode = false;
	self._readableState.objectMode = true;

	var parser = new JsonParse();

	parser.onValue = function(value) {
		if (this.stack.length === 0) {
			if (options.cipher_key) {
				var items = value[0];
				for (var i = 0; i < items.length; i++) {
					items[i] = cryptUtil.decryptSync(options.cipher_key, items[i]);
				}
			}
			if (value === undefined || value === null) {
				self.emit('error', new Error('error parsing: null or undefined onValue()'));
			} else {
				self.push(value);
			}
		}
	};

	parser.onError = function(err) {}; /* XXX ignore */

	self._transform = function(chunk, enc, done) {
		parser.write(chunk);
		done();
	};

	return self;
};

util.inherits(JSONStream, Transform);

module.exports = function(options) {
	return new JSONStream(options);
};