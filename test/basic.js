var tape = require('tape');
var rc = require('rc')('pubnubjs', {
	subscribe_key: '',
	publish_key: '',
	secret_key: '',
	pool_idletimeout: 1000
});
var pubnubjs = require('..')(rc);
var uuid = require('uuid');

var gchannel = uuid.v4();
var gtimetoken;

tape('publish', function(t) {
	t.plan(1);
	var payload = { some: 'data' };
	pubnubjs.publish(gchannel, payload, function(err, data) {
		t.error(err, 'publish success');
		gtimetoken = data[1] - 10;
	});
});

tape('subscribe with buffered messages', function(t) {
	t.plan(2);
	pubnubjs.subscribe(gchannel, { timetoken: gtimetoken }, function(err, stream, unsub) {
		t.error(err, 'subscribe success');
		stream.on('data', function(data) {
			t.equal(data[0].length, 1, 'exactly 1 message');
			unsub();
		});
	});
});

tape('subscribe without buffered messages', function(t) {
	t.plan(3);
	var channel = uuid.v4();
	pubnubjs.subscribe(channel, { timetoken: '0' }, function(err, stream, unsub) {
		t.error(err, 'subscribe success');
		stream.on('data', function(data) {
			t.pass('received timetoken ' + data[1]);
			pubnubjs.subscribe(channel, { timetoken: data[1] }, function(err2, stream2, unsub2) {
				t.error(err2, 'subscribe success');
				stream2.on('data', function(data) {
					t.fail('should not receive data');
				});
				setTimeout(unsub2, 500);
				unsub();
			});
		});
	});
});
