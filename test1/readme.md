# How to run the test app

In config.json you have to provide at least twitterConsumerKey and twitterConsumerSecret. I've provided one here with obviously dummy values.

When you launch the app, main.js, this is what it does:

1. reads config.json

2. initializes davetwitter with it

3. reads a tweet and displays its text

It requires the davetwitter.js file from its parent directory (the main davetwitter file). It doesn't access the package through NPM because I wanted to make it easy to iterate over new versions wthout having to publish a new version of davetwitter. 

From there you can test anything.

