var crypto = require('crypto');
var consts = require('./consts');

exports.encryptSync = function(key, plaintext) {
	var key_hashed = crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
	var cipher = crypto.createCipheriv(consts.PUBNUB_CRYPT_ALGORITHM, key_hashed, consts.PUBNUB_CRYPT_IV);
	return Buffer.concat([cipher.update(plaintext, consts.StringEncoding), cipher.final()]).toString('base64');
};

exports.decryptSync = function(key, ciphertext) {
	var key_hashed = crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
	var decipher = crypto.createDecipheriv(consts.PUBNUB_CRYPT_ALGORITHM, key_hashed, consts.PUBNUB_CRYPT_IV);
	return decipher.update(ciphertext, 'base64', consts.StringEncoding) + decipher.final(consts.StringEncoding);
};