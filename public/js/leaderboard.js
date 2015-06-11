var d3 = require('d3'),
	table = require('./table.js');

var data;
var xBounds;
var leaderBoardTable;
var LeaderBoard = function (mainViewModel, json) {
  var self = this,
      parentDiv = '#leaderboard',
      timeBounds = [0, Date.now()];

  function init() {
	data = json.tweets;
	xBounds = d3.extent(d3.merge([data.map(function(d) {
		return d.points[0].timestamp;
	}), data.map(function(d) {
		return d.points[d.points.length - 1].timestamp;
	})]));

	leaderBoardTable = table()
	.headers([{
		column: "screen_name",
		text: "Name",
		type: "String",
		sortable: true,
		class: "col-md-6"
	},{
		column: "retweets",
		type: "Number",
		text: "RTs",
		sortable: true,
		class: "col-md-3"
	},{
		column: "exposure",
		type: "Number",
		text: "Exposure",
		sortable: true,
		class: "col-md-3"
	}])
	.sortColumn(2)
	.sortAscending(false);

	self.updateXBounds();
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

	var lbData = {};

	// populate scoreboard
	data.forEach(function(tweet) {
		var pointsInBounds = tweet.points.filter(function(d) {
			return left < d.timestamp && d.timestamp < right;
		});

		if (pointsInBounds.length > 0) {
			if (lbData[tweet.user.id] === undefined) {
				lbData[tweet.user.id] = {
					screen_name: tweet.user.screen_name, /*tweet.user.name + ' <a href="http://twitter.com/' + tweet.user.screen_name + '" class="small" target="_blank">@'+tweet.user.screen_name+'</a>'*/
					retweets: pointsInBounds.length, // Retweet count
					exposure: pointsInBounds[pointsInBounds.length - 1].popularity - pointsInBounds[0].popularity // Exposure
				};
			} else {
				lbData[tweet.user.id].retweets += pointsInBounds.length;
				lbData[tweet.user.id].exposure += pointsInBounds[pointsInBounds.length - 1].popularity - pointsInBounds[0].popularity;
			}
		}
	});

	var values = Object.keys(lbData).map(function (key) {
		return lbData[key];
	});

	d3.select("#leaderboard table")
		.datum(values)
		.call(leaderBoardTable);
  };

  init();
  return self;
};

module.exports = LeaderBoard;