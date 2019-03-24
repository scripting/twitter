# davetwitter

A simple identity server that can be dropped into other server apps. 

### Changes

#### v0.5.10 -- 3/24/19 by DW

There's a new HTTP call -- /disconnect. You should call it when the user signs off. It takes two params, the accessToken and accessTokenSecret for the user. It goes through the screenNameCache looking for the user, and deletes it if it's found. I've updated <a href="http://feedbase.io/">feedBase</a> to make this call when the user signs off. 

This problem was <a href="https://github.com/scripting/feedBase/issues/40">reported</a> by @vincode-io. Many thanks for the excellent report and follow-up.

