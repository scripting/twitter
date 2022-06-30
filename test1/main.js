const fs = require ("fs"); 
const utils = require ("daveutils");
const davetwitter = require ("davetwitter");

var config = {
	twitterConsumerKey: "xxx",
	twitterConsumerSecret: "yyy"
	};

function readConfig (f, theConfig, callback) { 
	fs.readFile (f, function (err, jsontext) {
		if (err) {
			console.log ("readConfig: err.message == " + err.message);
			}
		else {
			try {
				var jstruct = JSON.parse (jsontext);
				for (var x in jstruct) {
					theConfig [x] = jstruct [x];
					}
				}
			catch (err) {
				console.log ("readConfig: err.message == " + err.message);
				}
			}
		callback ();
		});
	}

readConfig ("config.json", config, function (err) {
	config.httpPort = 1491;
	davetwitter.start (config, function () {
		});
	});


