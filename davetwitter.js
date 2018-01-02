var myVersion = "0.5.2", myProductName = "davetwitter"; 

const fs = require ("fs");
const twitterAPI = require ("node-twitter-api");
const utils = require ("daveutils");
const request = require ("request");
const davehttp = require ("davehttp");

exports.start = start; 
exports.getScreenName = getScreenName;
exports.getUserInfo = getUserInfo; //1/2/18 by DW

var config = {
	httpPort: 1401,
	myDomain: "localhost",
	twitterConsumerKey: undefined,
	twitterConsumerSecret: undefined,
	flForceTwitterLogin: false,
	flLogToConsole: false, //1/2/18 by DW
	flAllowAccessFromAnywhere: true, //1/2/18 by DW
	httpRequestCallback: function (theRequest) {
		return (false); //not consumed
		}
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
function handleRequest (theRequest) {
	function errorResponse (errorval) {
		theRequest.httpReturn (500, "text/plain", errorval);
		}
	if (!config.httpRequestCallback (theRequest)) { //it wasn't handled by the higher level code
		switch (theRequest.lowerpath) {
			case "/connect": 
				var twitter = new twitterAPI ({
					consumerKey: config.twitterConsumerKey,
					consumerSecret: config.twitterConsumerSecret,
					callback: "http://" + config.myDomain + "/callbackFromTwitter?redirectUrl=" + encodeURIComponent (theRequest.params.redirect_url)
					});
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
				var token = theRequest.params.oauth_token;
				var tokenSecret = theRequest.params.oauth_token_secret;
				getScreenName (token, tokenSecret, function (screenName) {
					var obj = {
						screenName: screenName
						};
					theRequest.httpReturn (200, "application/json", utils.jsonStringify (obj));
					});
				return;
			case "/getuserinfo": //11/19/17 by DW
				var token = theRequest.params.oauth_token;
				var tokenSecret = theRequest.params.oauth_token_secret;
				var screenName = theRequest.params.screen_name;
				var params = {screen_name: screenName};
				var twitter = newTwitter ();
				twitter.users ("show", params, token, tokenSecret, function (error, data, response) {
					if (error) {
						theRequest.httpReturn (500, "text/plain", error.data);
						}
					else {
						theRequest.httpReturn (200, "application/json", utils.jsonStringify (data));
						}
					});
				return;
			case "/derefurl": //11/19/17 by DW
				var token = theRequest.params.oauth_token;
				var tokenSecret = theRequest.params.oauth_token_secret;
				var shortUrl = theRequest.params.url;
				getScreenName (token, tokenSecret, function (screenName) {
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
			}
		theRequest.httpReturn (404, "text/plain", "Not found.");
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
		flAllowAccessFromAnywhere: config.flAllowAccessFromAnywhere
		};
	davehttp.start (httpConfig, function (theRequest) {
		handleRequest (theRequest);
		});
	
	if (callback !== undefined) { //12/31/17 by DW
		callback ();
		}
	}
