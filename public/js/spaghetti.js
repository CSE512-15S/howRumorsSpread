var d3 = require('d3');

var data;
var svg, xScale, yScale, yAxis, voronoiGroup;
var screenName, tweetText;
var isLinearScale = true;
var margin = { top: 20, right: 70, bottom: 30, left: 90 },
			    width = 1200 - margin.left - margin.right,
			    height = 520 - margin.top - margin.bottom;

var init = function() {
	screenName = d3.select('#tweetView .screen_name');
	tweetText = d3.select('#tweetView .text');

	svg = d3.select("body #svgContainer")
	  .append("svg")
	  	.attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.on("mouseout", function(d) { // hide tweet, scanline on mouseout
			screenName.html('');
			tweetText.html('');
		});

	// Load data
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

		// get data bounds
		xBounds = d3.extent(d3.merge([data.map(function(d) {
			return d.points[0].timestamp;
		}), data.map(function(d) {
			return d.points[d.points.length - 1].timestamp;
		})]));

		yBounds = d3.extent(d3.merge([data.map(function(d) {
			return d.points[0].popularity;
		}), data.map(function(d) {
			return d.points[d.points.length - 1].popularity;
		})]));

		// scale & axis setup
		xScale = d3.scale.linear()
			.domain(xBounds)
			.range([0,width]);
		yScale = { linear: d3.scale.linear()
				.domain(yBounds)
				.range([height, 0]),
			  log: d3.scale.log().clamp(true)
				.domain([Math.max(1, yBounds[0]), yBounds[1]])
				.range([height, 0])
				.nice()
		};

		var linecolor = d3.scale.ordinal()
			.domain(["Affirm", "Deny", "Unrelated"])
			.range(["#2c7fb8", "#c51b8a", "#bdbdbd"]);

		yAxis = d3.svg.axis()
			.scale(yScale.linear)
			.orient("left");

		svg.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate(-10,0)");

		svg.append("g")
			.attr("class", "tweets");

		// Data join
		var tweets = d3.select(".tweets").selectAll("path")
			.data(data, function(d) { return d.id; });

		// Enter: Create paths
		var enter = tweets.enter().append("path")
			.attr("stroke-width", 2)
			.attr("fill", "none") 
	      	.attr("stroke", function(d) {  return linecolor(d.first_code); });

		// Precompute paths
		var lineLinear = d3.svg.line()
			.x(function(d) { return xScale(d.timestamp); })
			.y(function(d) { return yScale.linear(d.popularity); })
			.interpolate("basis");

		var lineLog = d3.svg.line()
			.x(function(d) { return xScale(d.timestamp); })
			.y(function(d) { return yScale.log(d.popularity); })
			.interpolate("basis");

		// bind line and path strings to the data
		enter.each(function(d) {
			d.line = this;
			d.paths = {
				linear: lineLinear(d.points),
				log: lineLog(d.points)
			};
		});

		// Precompute voronoi tesselations
		var voronoi = {
			linear: d3.geom.voronoi()
				.x(function(d) { return xScale(d.timestamp); })
				.y(function(d) { return yScale.linear(d.popularity); })
				.clipExtent([[-margin.left, -margin.top], [width + margin.right, height + margin.bottom]]),
			log: d3.geom.voronoi()
				.x(function(d) { return xScale(d.timestamp); })
				.y(function(d) { return yScale.log(d.popularity); })
				.clipExtent([[-margin.left, -margin.top], [width + margin.right, height + margin.bottom]])
		};

		voronoiGroup = {
			linear: svg.append("g").attr("class", "voronoi linear"),
			log: svg.append("g").attr("class", "voronoi log")
		};

		var voronoiData = {
			linear: voronoi.linear(d3.nest()
		        .key(function(d) { return xScale(d.timestamp) + "," + yScale.linear(d.popularity); })
		        .rollup(function(v) { return v[0]; })
		        .entries(d3.merge(data.map(function(d) { return d.points; })))
		        .map(function(d) { return d.values; })),
			log: voronoi.log(d3.nest()
		        .key(function(d) { return xScale(d.timestamp) + "," + yScale.log(d.popularity); })
		        .rollup(function(v) { return v[0]; })
		        .entries(d3.merge(data.map(function(d) { return d.points; })))
		        .map(function(d) { return d.values; }))
		};

		voronoiGroup.linear.selectAll("path")
			.data(voronoiData.linear)
		  .enter().append("path")
			.attr("d", function(d) { return "M" + d.join("L") + "Z"; })
      		.datum(function(d) { return d.point; })
      		.on("mouseover", mouseover)
	    	.on("mouseout", mouseout);	

		voronoiGroup.log.selectAll("path")
			.data(voronoiData.log)
		  .enter().append("path")
			.attr("d", function(d) { return "M" + d.join("L") + "Z"; })
      		.datum(function(d) { return d.point; })
      		.on("mouseover", mouseover)
	    	.on("mouseout", mouseout);	

	    // Draw paths
		update(isLinearScale);
	});
};

// Draws paths, given lin or log scale
var update = function(showLinearScale) {
	isLinearScale = showLinearScale;

	// Update axis
	yAxis.scale(isLinearScale ? yScale.linear : yScale.log);
	d3.select('.y.axis').transition().duration(1000).call(yAxis);

	// Switch voronoi handlers between tesselations
	var offGroup = isLinearScale ? voronoiGroup.log : voronoiGroup.linear;
	var onGroup = isLinearScale ? voronoiGroup.linear : voronoiGroup.log;

	offGroup.selectAll("path").attr("pointer-events", "none");
	onGroup.selectAll("path").attr("pointer-events", "all");
	
	// Data join
	var tweets = d3.select(".tweets").selectAll("path")
		.data(data, function(d) { return d.id; });

    // Update: Update path
    tweets.transition().duration(1000).attr("d", function(d) { return isLinearScale ? d.paths.linear : d.paths.log; });
}

var changeScale = function(isLinearScale) {
	update(isLinearScale);
};

var mouseover = function(d) {
	// Highlight line
	d3.select(d.tweet.line).classed("tweet-hover", true);
	d.tweet.line.parentNode.appendChild(d.tweet.line);
	// Show corresponding tweet
	screenName.html(d.tweet.user.screen_name + ": ");
	tweetText.html(d.tweet.text);
}

var mouseout = function(d) {
	// Unhighlight line
	d3.select(d.tweet.line).classed("tweet-hover", false);
}

exports.init = init;
exports.changeScale = changeScale;
module.exports = exports;
