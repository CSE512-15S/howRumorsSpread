var d3 = require('d3');

var data;
var userIDtoUser;
var LeaderBoard = function (mainViewModel) {
  var self = this,
      parentDiv = '#leaderboard',
      timeBounds = [0, Date.now()];

  function init() {
  	d3.json('data/spaghetti/grouped.json', function(error, json) {
		if (error) return console.warn(error);
		data = json.tweets;
		userIDtoUser = new Object();
		// add to each point a reference to the actual tweet TODO remove lol its unnecessary
		data.forEach(function(tweet) {
			userIDtoUser[tweet.user.id] = tweet.user;
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
    timeBounds = newBounds; 
    // clear current board
    d3.select("#lbtablebody").html("");
    
    var startStamp = timeBounds[0].getTime();
    var endStamp = timeBounds[1].getTime();

	var scoreboard = new Object();

	// populate scoreboard
	for(var oneTweet in data){
		var i = 0;
		var retweets = data[oneTweet].points;
		if(retweets != null){
			if(!(retweets[retweets.length - 1].timestamp < startStamp || retweets[0].timestamp > endStamp)){
				while(i < retweets.length && retweets[i].timestamp < startStamp){
					i++;
				}
				if(i < retweets.length) {
					if(!(data[oneTweet].user.id in scoreboard)){
						// initialize user with their follower count
						scoreboard[data[oneTweet].user.id] = data[oneTweet].user.followers_count;
					}
					scoreboard[data[oneTweet].user.id] += (retweets[retweets.length - 1].popularity - retweets[i].popularity);
				}
			}
		}
	};

  	// sort keys
  	var keys = Object.keys(scoreboard);
  	keys.sort(function(user1, user2){
  		if(scoreboard[user1] > scoreboard[user2]){
  			return -1;
  		} else if(scoreboard[user2] > scoreboard[user1]){
  			return 1;
  		} else return 0;
  	});

  	// put things into leaderboard
  	for (var i = 0; i < keys.length; i++) {
  		var curUserID = keys[i];
  		var tableRow = d3.select("#lbtablebody").append("div").attr("class", "row");
  		tableRow.append("div").text(userIDtoUser[curUserID].screen_name).attr("class", "col-md-5");
  		tableRow.append("div").text(userIDtoUser[curUserID].name).attr("class", "col-md-5");
  		tableRow.append("div").text(scoreboard[curUserID]).attr("class", "col-md-2 text-left");
  	};
  };

  init();
  return self;
};

module.exports = LeaderBoard;