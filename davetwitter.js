var myVersion = "0.6.2", myProductName = "davetwitter"; 

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
exports.normalizeTimeString = normalizeTimeString; //3/11/21 by DW
exports.getTweetUrl = getTweetUrl; //3/12/21 by DW
exports.getTweet = getTweet; //3/8/21 by DW
exports.getThread = getThread; //3/11/21 by DW
exports.getRecentTweets = getRecentTweets; //3/13/21 by DW
exports.getFollowers = getFollowers; //3/17/21 by DW
exports.getFollowed = getFollowed; //3/17/21 by DW
exports.getAccountSettings = getAccountSettings; //3/18/21 by DW
exports.setAccountSettings = setAccountSettings; //3/20/21 by DW

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
	blockedAddresses: new Array (), //4/17/18 by DW
	cacheFolder: "data/cache/", //3/11/21 by DW
	flUseCache: true //3/11/21 by DW
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
function normalizeTimeString (when) { //3/11/21 by DW -- return a GMT-based time string
	when = new Date (when);
	return (when.toUTCString ());
	}
function getTheTwitterError (twitterErrorStruct) { //3/18/21 by DW
	try {
		var data  = JSON.parse (twitterErrorStruct.data);
		return (data.errors [0]);
		}
	catch (err) {
		console.log ("getTheTwitterError: twitterErrorStruct == " + utils.jsonStringify (twitterErrorStruct));
		return (err);
		}
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
function getUserInfo (accessToken, accessTokenSecret, screenname, callback) { //1/2/18 by DW
	var params = {screen_name: screenname};
	newTwitter ().users ("show", params, accessToken, accessTokenSecret, function (err, data, response) {
		if (err) {
			callback (getTheTwitterError (err));
			}
		else {
			callback (undefined, data);
			}
		});
	}
function getUserInfoFromUserId (accessToken, accessTokenSecret, userid, callback) { //4/8/21 by DW -- xxx
	var params = {user_id: userid};
	newTwitter ().users ("show", params, accessToken, accessTokenSecret, function (err, data, response) {
		if (err) {
			callback (getTheTwitterError (err));
			}
		else {
			callback (undefined, data);
			}
		});
	}
function getAccountSettings (accessToken, accessTokenSecret, callback) { //3/18/21 by DW
	newTwitter ().account ("settings", {}, accessToken, accessTokenSecret, function (err, data) {
		if (err) {
			callback (getTheTwitterError (err));
			}
		else {
			callback (undefined, data);
			}
		});
	}
function setAccountSettings (accessToken, accessTokenSecret, theSettings, callback) { //3/20/21 by DW
	newTwitter ().account ("settings", theSettings, accessToken, accessTokenSecret, function (err, data) {
		if (err) {
			callback (getTheTwitterError (err));
			}
		else {
			callback (undefined, data);
			}
		});
	}
function getConfiguration (accessToken, accessTokenSecret, callback) {
	newTwitter ().help ("configuration", {}, accessToken, accessTokenSecret, callback);
	}
function getRateLimitStatus (accessToken, accessTokenSecret, resources, callback) { //3/20/21 by DW
	newTwitter ().rateLimitStatus ({resources}, accessToken, accessTokenSecret, callback);
	}
function getSupportedLanguages (accessToken, accessTokenSecret, callback) {
	newTwitter ().help ("languages", {}, accessToken, accessTokenSecret, callback);
	}
function sendTweet (accessToken, accessTokenSecret, status, inReplyToId, callback) {
	var params = {
		status: status, 
		in_reply_to_status_id: inReplyToId
		};
	newTwitter ().statuses ("update", params, accessToken, accessTokenSecret, function (err, data) {
		if (err) {
			callback (getTheTwitterError (err));
			}
		else {
			callback (undefined, data);
			}
		});
	}
function getFollowers (accessToken, accessTokenSecret, screenname, callback) { //3/17/21 by DW
	var twitter = newTwitter (), theFollowersList = new Array ();
	function getNextBatch (nextcursor) {
		
		console.log ("getNextBatch: nextcursor == " + nextcursor);
		
		var params = {
			cursor: nextcursor,
			screen_name: screenname 
			};
		twitter.followers ("ids", params, accessToken, accessTokenSecret, function (err, theBatch) {
			if (err) {
				callback (getTheTwitterError (err));
				}
			else {
				theFollowersList = theFollowersList.concat (theBatch.ids);
				if (theBatch.next_cursor == 0) { //we're done
					callback (undefined, theFollowersList);
					}
				else {
					getNextBatch (theBatch.next_cursor_str);
					}
				}
			});
		}
	getNextBatch (-1); //start with the first batch
	}
function getFollowed (accessToken, accessTokenSecret, screenname, callback) { //3/17/21 by DW
	var twitter = newTwitter (), theFollowedList = new Array ();
	function getNextBatch (nextcursor) {
		console.log ("getNextBatch: nextcursor == " + nextcursor);
		var params = {
			cursor: nextcursor,
			screen_name: screenname 
			};
		twitter.friends ("ids", params, accessToken, accessTokenSecret, function (err, theBatch) {
			if (err) {
				callback (getTheTwitterError (err));
				}
			else {
				theFollowedList = theFollowedList.concat (theBatch.ids);
				if (theBatch.next_cursor == 0) { //we're done
					callback (undefined, theFollowedList);
					}
				else {
					getNextBatch (theBatch.next_cursor_str);
					}
				}
			});
		}
	getNextBatch (-1); //start with the first batch
	}
function getTimeline (accessToken, accessTokenSecret, whichTimeline, userId, sinceId, callback) { //2/11/21 by DW
	var params = {
		user_id: userId, 
		trim_user: "false",
		tweet_mode: "extended"
		};
	if (sinceId !== undefined) {
		params.since_id = sinceId;
		}
	newTwitter ().getTimeline (whichTimeline, params, accessToken, accessTokenSecret, function (err, data) {
		if (err) {
			callback (getTheTwitterError (err));
			}
		else {
			callback (undefined, data);
			}
		});
	}
function getTimelineForHttp (accessToken, accessTokenSecret, params, callback) { //3/21/21 by DW
	params.tweet_mode = "extended";
	newTwitter ().getTimeline (params.whichtimeline, params, accessToken, accessTokenSecret, function (err, data) {
		if (err) {
			callback (getTheTwitterError (err));
			}
		else {
			callback (undefined, data);
			}
		});
	}
function getTweetFromTwitter (accessToken, accessTokenSecret, id, callback) { //3/8/21 by DW
	var params = {
		id, 
		tweet_mode: "extended"
		};
	newTwitter ().statuses ("show", params, accessToken, accessTokenSecret, callback);
	}
function getTweet (accessToken, accessTokenSecret, id, callback) { //3/11/21 by DW
	var f = config.cacheFolder + "tweets/" + id + ".json";
	utils.sureFilePath (f, function () {
		function getFromTwitter () {
			getTweetFromTwitter (accessToken, accessTokenSecret, id, function (err, theTweet) {
				if (err) {
					callback (err);
					}
				else {
					callback (undefined, theTweet);
					fs.writeFile (f, utils.jsonStringify (theTweet), function (err) {
						if (err) {
							console.log ("getTweet: failed to write tweet to cache, err.message == " + err.message + ".");
							}
						});
					}
				});
			}
		fs.readFile (f, function (err, jsontext) {
			if (err) {
				getFromTwitter ();
				}
			else {
				try {
					callback (undefined, JSON.parse (jsontext));
					}
				catch (err) {
					getFromTwitter ();
					}
				}
			});
		});
	}
function getRecentTweets (screenname, accessToken, accessTokenSecret, callback) {
	var flcancelled = false, lastidseen = undefined;
	function getTwentyTweets (sinceid, callback) {
		var twitter = newTwitter ();
		var params = {
			screen_name: screenname, 
			trim_user: "false",
			tweet_mode: "extended"
			};
		if (sinceid !== undefined) {
			params.max_id = sinceid;
			}
		newTwitter ().getTimeline ("user", params, accessToken, accessTokenSecret, function (err, data, response) {
			if (err) {
				console.log ("getRecentTweets: err == " + utils.jsonStringify (err));
				callback (err);
				}
			else {
				callback (undefined, data);
				}
			});
		}
	function visitTwentyTweets (sinceid, callback) {
		getTwentyTweets (lastidseen, function (err, theTweets) {
			if (err) {
				callback (err);
				}
			else {
				if (theTweets !== undefined) {
					for (var i = 0; i < theTweets.length; i++) {
						var item = theTweets [i];
						lastidseen = item.id_str;
						if (!callback (undefined, item)) {
							flcancelled = true;
							break;
							}
						}
					if (!flcancelled) { //the search continues
						visitTwentyTweets (lastidseen, callback); //recurse
						}
					}
				}
			});
		}
	visitTwentyTweets (undefined, callback);
	}
function get24HoursOfTweets (screenname, accessToken, accessTokenSecret, callback) { //8/23/20 by DW
	const secs24Hours = 60 * 60 * 24;
	var theTweets = new Array (), flFoundFirst = false;
	function tweetNotInArray (id) {
		var flnotthere = true;
		theTweets.forEach (function (item) {
			if (item.id_str == id) {
				flnotthere = false;
				}
			});
		return (flnotthere);
		}
	getRecentTweets (screenname, accessToken, accessTokenSecret, function (err, item) {
		if (err) {
			callback (err);
			}
		else {
			if (utils.secondsSince (item.created_at) > secs24Hours) {
				callback (undefined, theTweets);
				return (false); //stop searching
				}
			else {
				if (tweetNotInArray (item.id_str)) { //this method returns one element twice for every batch of 20 read
					theTweets.push (item);
					}
				return (true); //keep searching
				}
			}
		});
	}
function getTweetUrl (theTweet) { //3/12/21 by DW
	try {
		return (theTweet.user.entities.url.urls [0].expanded_url);
		}
	catch (err) {
		return (undefined);
		}
	}
function getThread (accessToken, accessTokenSecret, idthread, flreload, callback) { //3/11/21 by DW
	var fcache = config.cacheFolder + "threads/" + idthread + ".json";
	function getThreadFromTwitter () {
		getTweet (accessToken, accessTokenSecret, idthread, function (err, theTopTweet) {
			if (err) {
				callback (err);
				}
			else {
				var theThread = { //this is what we return to caller
					author: {
						name: theTopTweet.user.name,
						description: theTopTweet.user.description,
						screenname: theTopTweet.user.screen_name,
						when: normalizeTimeString (theTopTweet.created_at),
						url: getTweetUrl (theTopTweet),
						id: theTopTweet.id_str
						},
					tweets: new Array ()
					};
				function pushTweet (theTweet) {
					theThread.tweets.push ({
						text: theTweet.full_text,
						id: theTweet.id_str,
						when: normalizeTimeString (theTweet.created_at),
						parent: theTweet.in_reply_to_status_id_str
						});
					}
				function isInThread (theTweet) {
					var flInThread = false, idInReplyTo = theTweet.in_reply_to_status_id_str;
					theThread.tweets.forEach (function (item) { //return true if it's in reply to something already in thread
						if (item.id == idInReplyTo) {
							flInThread = true;
							}
						});
					return (flInThread);
					}
				pushTweet (theTopTweet);
				get24HoursOfTweets (theTopTweet.user.screen_name, accessToken, accessTokenSecret, function (err, theTimeline) {
					if (err) {
						callback (err);
						}
					else {
						for (var i = theTimeline.length - 1; i >= 0; i--) {
							var theTweet = theTimeline [i];
							if (isInThread (theTweet)) {
								pushTweet (theTweet);
								}
							}
						utils.sureFilePath (fcache, function () {
							fs.writeFile (fcache, utils.jsonStringify (theThread), function (err) { 
								if (err) {
									console.log ("getThread: err.message == " + err.message);
									}
								});
							});
						callback (undefined, theThread);
						}
					});
				}
			});
		}
	if (flreload) { 
		getThreadFromTwitter ();
		}
	else {
		fs.readFile (fcache, function (err, jsontext) {
			if (err) {
				getThreadFromTwitter ();
				}
			else {
				try {
					var theThread = JSON.parse (jsontext);
					callback (undefined, theThread);
					}
				catch (err) {
					console.log ("getThread: error reading from cache == " + err.message);
					getThreadFromTwitter ();
					}
				}
			});
		}
	}

function handleRequest (theRequest) {
	var params = theRequest.params;
	const token = params.oauth_token;
	const secret = params.oauth_token_secret;
	
	var screenname = params.screen_name; //3/18/21 by DW -- we prefer screenname, but will also accept other forms
	if (screenname === undefined) {
		screenname = params.screenName;
		if (screenname === undefined) {
			screenname = params.screenname;
			}
		}
	
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
	function httpTwitterReturn (err, jstruct) { //3/20/21 by DW
		if (err) {
			returnError (getTheTwitterError (err));
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
			case "/configuration": 
				getConfiguration (token, secret, httpTwitterReturn);
				return;
			case "/getuserprofile": case "/getuserinfo":
				getUserInfo (token, secret, screenname, httpReturn);
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
				sendTweet (token, secret, params.status, params.in_reply_to_status_id, httpReturn);
				return;
			case "/getmymentions": //2/11/21 by DW
				getTimeline (token, secret, "mentions", params.user_id, params.since_id, httpReturn)
				return;
			case "/gettimeline": 
				getTimelineForHttp (token, secret, params, httpReturn);
				return;
			case "/gettweet": //3/8/21 by DW
				getTweet (token, secret, params.id, httpReturn)
				return;
			case "/getthread": //3/12/21 by DW
				getThread (token, secret, params.id, utils.getBoolean (params.reload), httpReturn)
				return;
			case "/getfollowers": //3/17/21 by DW
				getFollowers (token, secret, params.screen_name, httpReturn)
				return;
			case "/getfollowed": //3/17/21 by DW -- people the indicated user follows
				getFollowed (token, secret, params.screen_name, httpReturn)
				return;
			case "/getsupportedlanguages": //3/20/21 by DW
				getSupportedLanguages (token, secret, httpTwitterReturn);
				return;
			case "/getmyscreenname":
				getScreenName (token, secret, function (screenName) {
					var obj = {
						screenName: screenName
						};
					theRequest.httpReturn (200, "application/json", utils.jsonStringify (obj));
					});
				return;
			case "/getaccountsettings": //3/18/21 by DW
				getAccountSettings (token, secret, httpReturn);
				return;
			case "/setaccountsettings": //3/20/21 by DW
				var theSettings;
				try {
					theSettings = JSON.parse (params.settings);
					}
				catch (err) {
					returnError (err);
					}
				setAccountSettings (token, secret, theSettings, httpReturn);
				return;
			case "/getratelimitstatus": //3/20/21 by DW
				getRateLimitStatus (token, secret, params.resources, httpTwitterReturn);
				return;
			case "/getuserinfofromuserid": //4/8/21 by DW
				getUserInfoFromUserId (token, secret, params.id, httpReturn);
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
