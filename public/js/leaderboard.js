var d3 = require('d3');

var data;
var LeaderBoard = function (mainViewModel) {
  var self = this,
      parentDiv = '#leaderboard',
      timeBounds = [0, Date.now()];

  function init() {
  	d3.json('data/spaghetti/grouped.json', function(error, json) {
		if (error) return console.warn(error);
		data = json.tweets;

		// add to each point a reference to the actual tweet
		data.forEach(function(tweet) {
			tweet.points = tweet.points.map(function(d) {
				return {
					tweet: tweet,
					timestamp: d.timestamp,
					popularity: d.popularity
				};
			});
		});
	});
  }

// This function will get called by the mainViewModel in app.js
// when the viewport changes on the streamgraph
  self.updateXBounds = function (newBounds) {
    console.log('Leaderboard updating with: ', newBounds);
  
    timeBounds = newBounds; 
    
    // clear current board
    d3.select("#lbtablebody").html("");
    
    var startStamp = timeBounds[0].getTime();
    var endStamp = timeBounds[1].getTime();
    var userToTweets = new Object();

    var filteredTweets = data.filter(function(tweet){
    	// if it doesn't fall between bounds return false
    	var tweetTime = tweet.points[0].timestamp;
    	if(tweetTime >= startStamp && tweetTime <= endStamp){
    		// add user -> tweet
    		if(!(tweet.user.id in userToTweets)){
    			userToTweets[tweet.user.id] = new Array();
    		}
			userToTweets[tweet.user.id].push(tweet);
    		return true;
    	} else {
    		return false;
    	}
    });

	var scoreboard = new Object();

	// populate scoreboard
	// TODO: change to meaningful function
	for(var oneUser in userToTweets){
  		// look at all the user's tweets, add up retweet count
		var allTweets = userToTweets[oneUser];
		var retweetCount = 0;
		allTweets.forEach(function(tweet){
			retweetCount += tweet.points[0].popularity;
		});
		scoreboard[oneUser] = retweetCount;
	};

  	// sort keys
  	var keys = Object.keys(userToTweets);
  	keys.sort(function(user1, user2){
  		if(scoreboard[user1] > scoreboard[user2]){
  			return -1;
  		} else if(scoreboard[user2] > scoreboard[user1]){
  			return 1;
  		} else return 0;
  	});

  	// put things into leaderboard
  	for(var oneUser in keys){
  		var tableRow = d3.select("#lbtablebody").append("tr");
  		tableRow.append("td").text(userToTweets[keys[oneUser]][0].user.name).classed("username", true);
  		tableRow.append("td").text(userToTweets[keys[oneUser]][0].user.screen_name).classed("screenname", true);
  		tableRow.append("td").text(scoreboard[keys[oneUser]]).classed("score", true);
  	};
  };

  init();
  return self;
};

module.exports = LeaderBoard;