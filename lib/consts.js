exports.STRING_ENCODING = 'utf-8';
exports.HTTP_OK = 200;
exports.CRLF = "\r\n";
exports.HTTP_StatusLine = /HTTP\/\d+\.\d+\s(\d{3})\s(.+)$/;
exports.HTTP_Header = /([^:]+):(.*)/;
exports.PUBNUB_CRYPT_IV = '0123456789012345'; /* slow clap ... */
exports.PUBNUB_CRYPT_ALGORITHM = 'aes-256-cbc';