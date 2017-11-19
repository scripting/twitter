function twGetDefaultServer () {
	var urlServer = "http://localhost:1401/";
	return (urlServer);
	}
function twConnectToTwitter () {
	var urlServer = twGetDefaultServer ();
	function trimTrailing (s, ch) {
		while (s.charAt (s.length - 1) == ch) {
			s = s.substr (0, s.length - 1);
			}
		return (s);
		}
	var s = trimTrailing (window.location.href, "#");
	var urlRedirectTo = urlServer + "connect?redirect_url=" + encodeURIComponent (s);
	window.location.href = urlRedirectTo;
	}
function twGetOauthParams (flRedirectIfParamsPresent) {
	var flTwitterParamsPresent = false;
	if (flRedirectIfParamsPresent === undefined) { //6/4/14 by DW
		flRedirectIfParamsPresent = true;
		}
	function getURLParameter (name) {
		return (decodeURI ((RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]));
		}
	function getParam (paramname, objname) {
		var val = getURLParameter (paramname);
		if (val != "null") {
			localStorage [objname] = val;
			flTwitterParamsPresent = true;
			}
		}
	getParam ("oauth_token", "twOauthToken");
	getParam ("oauth_token_secret", "twOauthTokenSecret");
	getParam ("user_id", "twUserId");
	getParam ("screen_name", "twScreenName");
	
	//redirect if there are params on the url that invoked us -- 4/29/14 by DW
		if (flTwitterParamsPresent && flRedirectIfParamsPresent) {
			window.location.replace (window.location.href.substr (0, window.location.href.search ("\\?"))); //7/19/17 by DW
			return;
			}
	
	return (flTwitterParamsPresent); //6/4/14 by DW
	}
function twIsTwitterConnected () {
	try {
		return (localStorage.twOauthToken != undefined);
		}
	catch (err) {
		return (false);
		}
	}
function twGetUserScreenName (callback) {
	$.ajax ({
		type: "GET",
		url: twGetDefaultServer () + "getmyscreenname" + "?oauth_token=" + encodeURIComponent (localStorage.twOauthToken) + "&oauth_token_secret=" + encodeURIComponent (localStorage.twOauthTokenSecret),
		success: function (data) {
			console.log (JSON.stringify (data, undefined, 4));
			callback (data);
			},
		error: function (status) { 
			console.log ("twGetUserScreenName: error == " + JSON.stringify (status, undefined, 4));
			},
		dataType: "json"
		});
	}
function startup () {
	console.log ("startup");
	twGetOauthParams ();
	if (twIsTwitterConnected ()) {
		twGetUserScreenName (function (data) {
			console.log (jsonStringify (data));
			});
		}
	}
