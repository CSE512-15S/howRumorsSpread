var d3 = require('d3');

var data;
var xBounds;
var table;
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

		table = jQuery('#leaderboard').DataTable({
			data: [],
			order: [[3, "desc"]],
			paging: false,
			searching: false
		});

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
    
	var lbData = {};

	// populate scoreboard
	data.forEach(function(tweet) {
		var pointsInBounds = tweet.points.filter(function(d) {
			return left < d.timestamp && d.timestamp < right;
		});

		if (pointsInBounds.length > 0) {
			if (lbData[tweet.user.id] === undefined) {
				lbData[tweet.user.id] = [
					tweet.user.screen_name,
					tweet.user.name,
					pointsInBounds.length, // Retweet count
					pointsInBounds[pointsInBounds.length - 1].popularity - pointsInBounds[0].popularity // Exposure
				];
			} else {
				lbData[tweet.user.id][2] += pointsInBounds.length;
				lbData[tweet.user.id][3] += pointsInBounds[pointsInBounds.length - 1].popularity - pointsInBounds[0].popularity;
			}
		}
	});

	var values = Object.keys(lbData).map(function (key) {
		return lbData[key];
	});

	table.clear();
	table.rows.add(values).draw();
  };

  init();
  return self;
};

module.exports = LeaderBoard;