var myVersion = "0.5.24", myProductName = "davetwitter"; 

const fs = require ("fs");
const twitterAPI = require ("node-twitter-api");
const utils = require ("daveutils");
const request = require ("request");
const davehttp = require ("davehttp");

exports.start = start; 
exports.getScreenName = getScreenName;
exports.getUserInfo = getUserInfo; //1/2/18 by DW
exports.sendTweet = sendTweet; //12/17/18 by DW
exports.getTimeline = getTimeline; //3/8/21 by DW
exports.getTweet = getTweet; //3/8/21 by DW

var config = {
	httpPort: 1401,
	myDomain: "localhost",
	twitterConsumerKey: undefined,
	twitterConsumerSecret: undefined,
	flForceTwitterLogin: false,
	flLogToConsole: false, //1/2/18 by DW
	flAllowAccessFromAnywhere: true, //1/2/18 by DW
	flPostEnabled: false, //1/3/18 by DW
	httpRequestCallback: function (theRequest) {
		return (false); //not consumed
		},
	http404Callback: function (theRequest) { //1/24/21 by DW
		return (false); //not consumed
		},
	blockedAddresses: new Array () //4/17/18 by DW
	};
var requestTokens = []; //used in the OAuth dance
var screenNameCache = []; 

function newTwitter (myCallback) {
	var twitter = new twitterAPI ({
		consumerKey: config.twitterConsumerKey,
		consumerSecret: config.twitterConsumerSecret,
		callback: myCallback
		});
	return (twitter);
	}
function getScreenName (accessToken, accessTokenSecret, callback) {
	for (var i = 0; i < screenNameCache.length; i++) { //see if we can get it from the cache first
		var obj = screenNameCache [i];
		if ((obj.accessToken == accessToken) && (obj.accessTokenSecret == accessTokenSecret)) {
			obj.ctAccesses++;
			callback (obj.screenName);
			return;
			}
		}
	newTwitter ().verifyCredentials (accessToken, accessTokenSecret, function (error, data, response) {
		if (error) {
			callback (undefined);    
			}
		else {
			screenNameCache [screenNameCache.length] = {
				accessToken:  accessToken,
				accessTokenSecret:  accessTokenSecret,
				screenName:  data.screen_name, 
				ctAccesses:  0
				};
			callback (data.screen_name);
			}
		});
	}
	
function deleteInScreenNameCache (accessToken, accessTokenSecret, callback) { //3/24/19 by DW
	for (var i = 0; i < screenNameCache.length; i++) {
		var obj = screenNameCache [i];
		if ((obj.accessToken == accessToken) && (obj.accessTokenSecret == accessTokenSecret)) {
			callback (obj);
			screenNameCache.splice (i, 1);
			return;
			}
		}
	callback ({
		});
	}
function getUserInfo (accessToken, accessTokenSecret, screenName, callback) { //1/2/18 by DW
	var params = {screen_name: screenName};
	newTwitter ().users ("show", params, accessToken, accessTokenSecret, function (error, data, response) {
		if (error) {
			callback (error);
			}
		else {
			callback (undefined, data);
			}
		});
	}
function saveRequestToken (requestToken, requestTokenSecret) {
	var obj = new Object ();
	obj.rt = requestToken;
	obj.secret = requestTokenSecret;
	requestTokens [requestTokens.length] = obj;
	}
function findRequestToken (theRequestToken) {
	for (var i = 0; i < requestTokens.length; i++) {
		if (requestTokens [i].rt == theRequestToken) {
			var secret = requestTokens [i].secret;
			requestTokens.splice (i, 1);
			return (secret);
			}
		}
	return (undefined);
	}
function sendTweet (accessToken, accessTokenSecret, status, inReplyToId, callback) {
	var params = {status: status, in_reply_to_status_id: inReplyToId};
	newTwitter ().statuses ("update", params, accessToken, accessTokenSecret, callback);
	}

function getTimeline (accessToken, accessTokenSecret, whichTimeline, userId, sinceId, callback) { //2/11/21 by DW
	var twitter = newTwitter ();
	var params = {
		user_id: userId, 
		trim_user: "false",
		tweet_mode: "extended"
		};
	if (sinceId !== undefined) {
		params.since_id = sinceId;
		}
	newTwitter ().getTimeline (whichTimeline, params, accessToken, accessTokenSecret, callback);
	}
function getTweet (id, callback) { //3/8/21 by DW
	var params = {
		id, 
		tweet_mode: "extended"
		};
	newTwitter ().statuses ("show", params, undefined, undefined, callback);
	}

function handleRequest (theRequest) {
	var params = theRequest.params;
	const token = params.oauth_token;
	const secret = params.oauth_token_secret;
	function returnData (jstruct) {
		if (jstruct === undefined) {
			jstruct = {};
			}
		theRequest.httpReturn (200, "application/json", utils.jsonStringify (jstruct));
		}
	function returnError (jstruct) {
		console.log ("returnError: jstruct == " + utils.jsonStringify (jstruct));
		theRequest.httpReturn (500, "application/json", utils.jsonStringify (jstruct));
		}
	function httpReturn (err, jstruct) {
		if (err) {
			returnError (err);
			}
		else {
			returnData (jstruct);
			}
		}
	if (!config.httpRequestCallback (theRequest)) { //it wasn't handled by the higher level code
		switch (theRequest.lowerpath) {
			case "/connect": 
				var urlCallback = "http://" + config.myDomain + "/callbackFromTwitter?redirectUrl=" + encodeURIComponent (theRequest.params.redirect_url);
				var twitter = new twitterAPI ({
					consumerKey: config.twitterConsumerKey,
					consumerSecret: config.twitterConsumerSecret,
					callback: urlCallback
					});
				console.log ("davetwitter/handleRequest: urlCallback == " + urlCallback); //4/19/19 by DW
				twitter.getRequestToken (function (error, requestToken, requestTokenSecret, results) {
					if (error) {
						theRequest.httpReturn (500, "text/plain", error.data);
						}
					else {
						saveRequestToken (requestToken, requestTokenSecret);
						
						var twitterOauthUrl = "https://twitter.com/oauth/authenticate?oauth_token=" + requestToken;
						if (config.flForceTwitterLogin) { //2/19/16 by DW
							twitterOauthUrl += "&force_login=true"; //https://dev.twitter.com/oauth/reference/get/oauth/authenticate
							}
						theRequest.sysResponse.writeHead (302, {"location": twitterOauthUrl});
						theRequest.sysResponse.end ("302 REDIRECT");    
						}
					});
				return;
			case "/disconnect": //3/24/19 by DW
				deleteInScreenNameCache (token, secret, function (data) {
					theRequest.httpReturn (200, "application/json", utils.jsonStringify (data));
					});
				return;
			case "/callbackfromtwitter":
				
				var twitter = new twitterAPI ({
					consumerKey: config.twitterConsumerKey,
					consumerSecret: config.twitterConsumerSecret,
					callback: undefined
					});
				
				var myRequestToken = theRequest.params.oauth_token;
				var myTokenSecret = findRequestToken (myRequestToken);
				
				
				twitter.getAccessToken (myRequestToken, myTokenSecret, theRequest.params.oauth_verifier, function (error, accessToken, accessTokenSecret, results) {
					if (error) {
						console.log ("twitter.getAccessToken: error == " + error.message);
						}
					else {
						var url = theRequest.params.redirectUrl + "?oauth_token=" + encodeURIComponent (accessToken) + "&oauth_token_secret=" + encodeURIComponent (accessTokenSecret) + "&user_id=" + encodeURIComponent (results.user_id) + "&screen_name=" + encodeURIComponent (results.screen_name);
						
						theRequest.sysResponse.writeHead (302, {"location": url});
						theRequest.sysResponse.end ("302 REDIRECT");    
						}
					});
				return;
			case "/getmyscreenname":
				getScreenName (token, secret, function (screenName) {
					var obj = {
						screenName: screenName
						};
					theRequest.httpReturn (200, "application/json", utils.jsonStringify (obj));
					});
				return;
			case "/getuserinfo": //11/19/17 by DW
				var screenName = theRequest.params.screen_name;
				var params = {screen_name: screenName};
				var twitter = newTwitter ();
				twitter.users ("show", params, token, secret, function (error, data, response) {
					if (error) {
						theRequest.httpReturn (500, "text/plain", error.data);
						}
					else {
						theRequest.httpReturn (200, "application/json", utils.jsonStringify (data));
						}
					});
				return;
			case "/derefurl": //11/19/17 by DW
				var shortUrl = theRequest.params.url;
				getScreenName (token, secret, function (screenName) {
					if (screenName === undefined) {
						theRequest.httpReturn (500, "text/plain", "Can't get the deref the URL because the accessToken is not valid.");
						}
					else {
						var myRequest = {
							method: "HEAD", 
							url: shortUrl, 
							followAllRedirects: true
							};
						request (myRequest, function (error, response) {
							if (error) {
								theRequest.httpReturn (500, "text/plain", "Can't get the deref the URL because there was an error making the HTTP request.");
								}
							else {
								var myResponse = {
									url: shortUrl,
									longurl: response.request.href
									};
								theRequest.httpReturn (200, "application/json", utils.jsonStringify (myResponse));
								}
							});
						}
					});
				return;
			case "/getembedcode": //11/10/18 by DW
				//https://dev.twitter.com/docs/api/1/get/statuses/oembed
				
				var url = "https://api.twitter.com/1/statuses/oembed.json?id=" + theRequest.params.id;
				
				function addParam (name) {
					if (theRequest.params [name] !== undefined) {
						url += "&" + name + "=" + theRequest.params [name];
						}
					}
				addParam ("maxwidth");
				addParam ("hide_media");
				addParam ("hide_thread");
				addParam ("omit_script");
				addParam ("align");
				addParam ("related");
				addParam ("lang");
				
				request (url, function (error, response, body) {
					if (!error && (response.statusCode == 200)) {
						theRequest.httpReturn (200, "text/plain", body);
						}
					else {
						theRequest.httpReturn (500, "text/plain", utils.jsonStringify (error));
						}
					});
				return;
			case "/tweet": //12/14/18 by DW
				sendTweet (params.oauth_token, params.oauth_token_secret, params.status, params.in_reply_to_status_id, httpReturn);
				return;
			case "/configuration": //8/15/19 by DW
				var twitter = newTwitter ();
				var params = {};
				var accessToken = theRequest.params.oauth_token;
				var accessTokenSecret = theRequest.params.oauth_token_secret;
				twitter.help ("configuration", params, accessToken, accessTokenSecret, function (err, data, response) {
					if (err) {
						returnError (err);
						}
					else {
						returnData (data);
						}
					});
				return;
			case "/getmymentions": //2/11/21 by DW
				getTimeline (token, secret, "mentions", params.user_id, params.since_id, httpReturn)
				return;
			case "/gettimeline": //2/14/21 by DW
				getTimeline (token, secret, params.whichtimeline, params.user_id, params.since_id, httpReturn)
				return;
			case "/gettweet": //3/8/21 by DW
				getTweet (params.id, httpReturn)
				return;
			}
		if (!config.http404Callback (theRequest)) { //1/24/21 by DW
			theRequest.httpReturn (404, "text/plain", "Not found.");
			}
		}
	}
function start (configParam, callback) {
	if (configParam !== undefined) {
		for (x in configParam) {
			config [x] = configParam [x];
			}
		}
	console.log ("davetwitter.start: config == " + utils.jsonStringify (config));
	
	var httpConfig = {
		port: config.httpPort,
		flLogToConsole: config.flLogToConsole,
		flAllowAccessFromAnywhere: config.flAllowAccessFromAnywhere,
		flPostEnabled: config.flPostEnabled,
		blockedAddresses: config.blockedAddresses //4/17/18 by DW
		};
	davehttp.start (httpConfig, function (theRequest) {
		handleRequest (theRequest);
		});
	
	if (callback !== undefined) { //12/31/17 by DW
		callback ();
		}
	}
