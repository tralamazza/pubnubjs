# PubNub JS client

WIP - NOT production ready

	npm install pubnubjs

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
	subscribe_key: 'sub-c- ...', /* required */
	publish_key: 'pub-c- ...' /* required */
});
setInterval(function() {
	client.publish('my_little_channel', { ts: Date.now() }, {
		// cipher_key: 'my encryption key',
		// params: { auth: 'my auth key' }
	}, function(res) {
		console.log(res);
	});
}, 100);
```

Subscribes for 10s:

```js
client.subscribe('my_little_channel', {
	// cipher_key: 'my encryption key',
	// params: { auth: 'my auth key' }
}, function(err, stream) {
	setTimeout(function() {
		stream.end();
	}, 10000);
	stream.on('data', console.log);
});
```

Grant read & write access to a channel:

```js
streamer.grant({
	// ttl: 1440,
	w: 1, r: 1,
	channel: 'my_little_channel_with_auth',
	auth: '12345'
}, function(data) {
	console.log('grant', data);
});
```

## Important

* The module keeps 2 socket pools with a default idle timeout of 20s.
* You can only publish js objects or JSON strings.
* Subscribe will always yield objects.

## TODO

* Examples
* Docs
