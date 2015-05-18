var d3 = require('d3');

var data;
var svg;
var margin = { top: 20, right: 70, bottom: 30, left: 90 },
			    width = 1200 - margin.left - margin.right,
			    height = 520 - margin.top - margin.bottom;
var xScale, yScale, yAxis, linecolor;

var init = function() {
	svg = d3.select("body #svgContainer")
	  .append("svg")
	  	.attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");			 

	// Load data
	d3.json('data/spaghetti/grouped.json', function(error, json) {
		if (error) return console.warn(error);
		data = json.tweets;

		// get data bounds
		min_ts = d3.min(data.map(function(d) {
			return d.points[0].timestamp;
		}));
		max_ts = d3.max(data.map(function(d) {
			return d.points[d.points.length - 1].timestamp;
		}));
		min_popularity = d3.min(data.map(function(d) {
			return d.points[d.points.length - 1].popularity;
		}));
		max_popularity = d3.max(data.map(function(d) {
			return d.points[d.points.length - 1].popularity;
		}));

		// scale & axis setup
		xScale = d3.scale.linear()
			.domain([min_ts, max_ts])
			.range([0,width]);
		yScale = { linear: d3.scale.linear()
				.domain([min_popularity, max_popularity])
				.range([height, 0]),
			  log: d3.scale.log()
				.domain([Math.max(1, min_popularity), max_popularity])
				.range([height, 0])
		};

		linecolor = d3.scale.ordinal()
			.domain(["Affirm", "Deny", "Unrelated"])
			.range(["#2c7fb8", "#c51b8a", "#bdbdbd"]);

		yAxis = d3.svg.axis()
			.scale(yScale.linear)
			.orient("left");

		svg.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate(-10,0)");

		update(data, true);
	});
};

var update = function(data, isLinearScale) {
	// Update axis
	var y = isLinearScale ? yScale.linear : yScale.log;
	yAxis.scale(y);
	d3.select('.y.axis').transition().duration(1000).call(yAxis);

	// Line function
	var lineFunction = d3.svg.line()
		.x(function(d) { return xScale(d.timestamp); })
		.y(function(d) { return y(d.popularity); })
		.interpolate("basis");

	// Data join
	var lines = svg.selectAll('.line')
		.data(data, function(d) { return d.id; });

	// Enter
	var enter = lines.enter().append("g")
		.attr("class", "line");

	enter.append("path")
      	.attr("stroke", function(d) { return linecolor(d.first_code); })
      	.attr("stroke-width", 2)
      	.attr("fill", "none");

    // Update
    lines.selectAll("g path")
  		.transition().duration(1000).attr("d", function(d) { return lineFunction(d.points); });

    // Add Hover events
    enter.on("mouseover", function(d) {
    	d3.select('#tweetView .screen_name').html(d.user.screen_name + ": ");
    	d3.select('#tweetView .text').html(d.text);
    });
    enter.on("mouseout", function(d) {
    	d3.select('#tweetView .screen_name').html('');
    	d3.select('#tweetView .text').html('');
    });
}

var changeScale = function(isLinearScale) {
	update(data,isLinearScale);
};

exports.init = init;
exports.changeScale = changeScale;
module.exports = exports;
