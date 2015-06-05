var d3 = require('d3');

var data;
var xBounds;
var userIDtoUser;
var LeaderBoard = function (mainViewModel) {
  var self = this,
      parentDiv = '#leaderboard',
      timeBounds = [0, Date.now()];

  function init() {
  	d3.json('data/spaghetti/grouped.json', function(error, json) {
		if (error) return console.warn(error);
		data = json.tweets;
		xBounds = d3.extent(d3.merge([data.map(function(d) {
			return d.points[0].timestamp;
		}), data.map(function(d) {
			return d.points[d.points.length - 1].timestamp;
		})]));

		self.updateXBounds();
	});
  }

// This function will get called by the mainViewModel in app.js
// when the viewport changes on the streamgraph
  self.updateXBounds = function (timeBounds) {
  	var left, right;
  	if (!arguments.length) {
  		left = xBounds[0];
  		right = xBounds[1];
  	} else {
  		left = timeBounds[0].getTime();
    	right = timeBounds[1].getTime();
  	}

    // clear current board
    d3.select("#leaderboard .lbtablebody").html("");
    
	var scoreboard = {};

	// populate scoreboard
	data.forEach(function(tweet) {
		var pointsInBounds = tweet.points.filter(function(d) {
			return left < d.timestamp && d.timestamp < right;
		});

		if (pointsInBounds.length > 0) {
			scoreboard[tweet.user.id] = { 
				screen_name: tweet.user.screen_name,
				username: tweet.user.name,
				exposure: pointsInBounds[pointsInBounds.length - 1].popularity - pointsInBounds[0].popularity,
				retweetCount: pointsInBounds.length
			};
		}
	});

  	// sort keys TODO remove
  	var keys = Object.keys(scoreboard);
  	keys.sort(function(user1, user2){
  		if(scoreboard[user1].exposure > scoreboard[user2].exposure){
  			return -1;
  		} else if(scoreboard[user2].exposure > scoreboard[user1].exposure){
  			return 1;
  		} else return 0;
  	});

  	// put things into leaderboard
  	for (var i = 0; i < keys.length; i++) {
  		var curUserID = keys[i];
  		var tableRow = d3.select("#leaderboard .lbtablebody").append("tr");
  		tableRow.append("td").attr("class", "col-xs-3")
  		  .append("a")
  		  	.text("@" + scoreboard[curUserID].screen_name)
  			.attr("href", "http://twitter.com/" + scoreboard[curUserID].screen_name)
  			.attr("target", "_blank");
  		tableRow.append("td").text(scoreboard[curUserID].username).attr("class", "col-xs-4");
  		tableRow.append("td").text(scoreboard[curUserID].retweetCount).attr("class", "col-xs-2");
  		tableRow.append("td").text(scoreboard[curUserID].exposure).attr("class", "col-xs-3");
  	};
  };

  init();
  return self;
};

module.exports = LeaderBoard;