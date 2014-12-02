[![Stories in Ready](https://badge.waffle.io/tralamazza/pubnubjs.png?label=ready&title=Ready)](https://waffle.io/tralamazza/pubnubjs)
# PubNub JS client [![Build Status](https://travis-ci.org/tralamazza/pubnubjs.svg?branch=master)](https://travis-ci.org/tralamazza/pubnubjs) [![NPM version](https://badge.fury.io/js/pubnubjs.svg)](http://badge.fury.io/js/pubnubjs) [![Dependency Status](https://gemnasium.com/tralamazza/pubnubjs.svg)](https://gemnasium.com/tralamazza/pubnubjs)

	npm install pubnubjs

## Characteristics

* Implemented using PubNub's HTTP pipelining API
* Authentication and Encryption keys are supplied per request
* Supports gzip compression for `subscribe`
* SSL by default

## Usage

Publishes every 100ms:

```js
var PubNubJS = require('pubnubjs');

var client = PubNubJS({
	// port: 443,
	// host: 'pubsub.pubnub.com',
	// insecure: false,
	// pool_max: 50,
	// pool_idletimeout: 20000,
	// secret_key: '', /* required for .grant() */
	subscribe_key: 'sub-c- ...', /* required */
	publish_key: 'pub-c- ...' /* required */
});
setInterval(function() {
	client.publish('my_little_channel', { ts: Date.now() }, {
		// cipher_key: 'my encryption key',
		// params: { auth: 'my auth key' }
	}, function(err, data) {
		console.log('publish', err, data);
	});
}, 100);
```

Subscribes for 10s:

```js
client.subscribe('my_little_channel', {
	// timetoken: '0',
	// cipher_key: 'my encryption key',
	// gzip: false,
	// params: { auth: 'my auth key' }
}, function(err, stream, unsubscribe) {
	setTimeout(unsubscribe, 10000);
	stream.on('data', console.log);
});
```

Grant read & write access to a channel:

```js
client.grant({
	// ttl: 1440,
	w: 1, r: 1,
	channel: 'my_little_channel_with_auth',
	auth: '12345'
}, function(err, data) {
	console.log('grant', err, data);
});
```

## Important

* We keep a socket pool with a default idle timeout of 20s, see `options.pool_idletimeout`
* You should only publish objects or JSON strings.
* `.subscribe()` returns an object stream.

## MIT Licensed

	The MIT License (MIT)

	Copyright (c) 2014 Daniel Tralamazza <tralamazza@relayr.de>

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
