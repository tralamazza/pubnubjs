# PubNub JS client

WIP - NOT production ready

	npm install pubnubjs

## Usage

Publishes every 100ms:

	var PubNubJS = require('pubnubjs');

	var client = PubNubJS({
		// insecure: true,
		subscribe_key: 'sub-c- ...',
		publish_key: 'pub-c- ...'
	});
	setInterval(function() {
		client.publish('my_little_channel', { ts: Date.now() }, {
			// cipher_key: 'my encryption key',
			// params: { auth: 'my auth key' }
		}, function(res) {
			console.log(res);
		});
	}, 100);


Subscribes for 10s:

	client.subscribe('my_little_channel', {
		// cipher_key: 'my encryption key',
		// params: { auth: 'my auth key' }
	}, function(err, stream) {
		setTimeout(function() {
			stream.end();
		}, 10000);
		stream.on('data', console.log);
	});


## Important

This module keeps 2 socket pools with a default idle timeout of 20s.

## TODO

* 'grant'
* Examples
* Docs
