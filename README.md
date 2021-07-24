# davetwitter

A simple identity server that can be dropped into other server apps. 

### Changes

#### 0.6.29 -- 7/24/21 by DW

Added /daytweets call for Get My Tweets functionality used by Drummer. 

#### 0.6.28 -- 3/12/21 by DW

New calls to get one tweet, which amazingly was not part of this package until today, and a call to get a thread.

These are also available through the API. 

These features were added for the threadviewer.com app.

#### v0.5.21 -- 2/12/21 by DW

Sorry for the missing notes.

Added /getmymentions call.

#### v0.5.10 -- 3/24/19 by DW

There's a new HTTP call -- /disconnect. You should call it when the user signs off. It takes two params, the accessToken and accessTokenSecret for the user. It goes through the screenNameCache looking for the user, and deletes it if it's found. I've updated <a href="http://feedbase.io/">feedBase</a> to make this call when the user signs off. 

This problem was <a href="https://github.com/scripting/feedBase/issues/40">reported</a> by @vincode-io. Many thanks for the excellent report and follow-up.

