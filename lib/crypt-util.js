var crypto = require('crypto');
var consts = require('./consts');

var PUBNUB_CRYPT_IV = '0123456789012345'; /* slow clap ... */
var PUBNUB_CRYPT_ALGORITHM = 'aes-256-cbc';

exports.encryptSync = function(key, plaintext) {
	var key_hashed = crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
	var cipher = crypto.createCipheriv(PUBNUB_CRYPT_ALGORITHM, key_hashed, PUBNUB_CRYPT_IV);
	return Buffer.concat([cipher.update(plaintext, consts.STRING_ENCODING), cipher.final()]).toString('base64');
};

exports.decryptSync = function(key, ciphertext) {
	var key_hashed = crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
	var decipher = crypto.createDecipheriv(PUBNUB_CRYPT_ALGORITHM, key_hashed, PUBNUB_CRYPT_IV);
	return decipher.update(ciphertext, 'base64', consts.STRING_ENCODING) + decipher.final(consts.STRING_ENCODING);
};

exports.hmacSHA256Sync = function(key, data) {
	return crypto.createHmac('sha256', new Buffer(key, consts.STRING_ENCODING)).update(data).digest('base64');
};