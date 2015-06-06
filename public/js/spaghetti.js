var d3 = require('d3'),
	table = require('./table.js');

var data;
var svg, 
	spaghetti, 
	dataTweets, 
	voronoiGroup, 
	circle,
	xBounds, 
	xScale, 
	yScale, 
	xAxis, 
	yAxis, 
	linecolor;
var mainViewModel;
var margin = { top: 0, right: 20, bottom: 50, left: 90 },
			    width = 800 - margin.left - margin.right,
			    height = 500 - margin.top - margin.bottom;
var xTicks = 8, yTicks = 10;
var tweetview = {};
var retweeListTable;
var tweetviewFixed = false; 

var Spaghetti = function() {

	var isLinearScale = true;

	var xScale = d3.time.scale.utc(), 
		yScale = { linear: d3.scale.linear(),
				   log: d3.scale.log() };

	var line = {};
	line.linear = d3.svg.line()
		.x(function(d) { return xScale(d.timestamp); })
		.y(function(d) { return yScale.linear(d.popularity); })
		.interpolate("linear");
	line.log = d3.svg.line()
		.x(function(d) { return xScale(d.timestamp); })
		.y(function(d) { return yScale.log(d.popularity); })		
		.interpolate("linear");

	// Sets up the chart, precomputes paths
	var spaghetti = function(selection) {
		selection.each(function(data) { 
			// Data join
			var tweets = d3.select(this).selectAll("path")
				.data(data, function(d) { return d.id; });

			// Enter: Create paths
			var enter = tweets.enter().append("path")
				.attr("stroke-width", 2)
				.attr("fill", "none")
		      	.attr("stroke", function(d) {  return linecolor(d.first_code); });
			
			// Bind line and precomputed paths to the data for fast lin / log update
			tweets.each(function(d) {
				d.line = this;
				d.paths = {};
				d.paths.linear = line.linear(d.points);
				d.paths.log = line.log(d.points);
			});
		});

		spaghetti.draw(selection, false);
	};

	// Does the actual path drawing. Useful to change the scale
	spaghetti.draw = function(selection, animate) {
		selection.each(function(data) { 
			d3.select(this).selectAll("path")
				.transition().duration(animate ? 1000 : 0)
				.attr("d", function(d) { return isLinearScale ? d.paths.linear : d.paths.log });
		});
	}

	// Setter/Getter methods
	spaghetti.isLinearScale = function(value) {
		if (!arguments.length) {
			return isLinearScale;
		}
		isLinearScale = value;
		return spaghetti;
	};

	spaghetti.xScale = function(value) {
        if (!arguments.length) {
            return xScale;
        }
        xScale = value;
        return spaghetti;
    };

   	spaghetti.yScale = function(value) {
   		// Only accept inputs of the form { lin: ..., log: ... }
        if (!arguments.length || !(_.has(value, 'linear') && _.has(value, 'log'))) {
            return yScale;
        }
        yScale.linear = value.linear; yScale.log = value.log;
        return spaghetti;
    };

	return spaghetti;
}

var Voronoi = function() {

	var xScale = d3.time.scale(), 
		yScale = d3.scale.linear();

	var voronoiFunction = d3.geom.voronoi()
		.x(function(d) { return xScale(d.timestamp); })
		.y(function(d) { return yScale(d.popularity); })
		.clipExtent([[0, 0], [width, height]]);

	var voronoi = function(selection) {
		selection.each(function(data) { 
			// Do data setup
			var voronoiData = voronoiFunction(d3.nest()
		        .key(function(d) { return xScale(d.timestamp) + "," + yScale(d.popularity); })
		        .rollup(function(v) { return v[0]; })
		        .entries(d3.merge(data.map(function(d) { return d.points; })))
		        .map(function(d) { return d.values; }));

			d3.select(this).selectAll("path")
				.data(voronoiData)
			  .enter().append("path")
				.attr("d", function(d) { return "M" + d.join("L") + "Z"; })
	      		.datum(function(d) { return d.point; })
	      		.on("mouseover", mouseoverVoronoi)
		    	.on("mouseout", mouseoutVoronoi)
		    	.on("click", clickVoronoi);
		});
	}	
	
	// Setter/Getter methods
	voronoi.xScale = function(value) {
        if (!arguments.length) {
            return xScale;
        }
        xScale = value;
        return voronoi;
    };

    voronoi.yScale = function(value) {
        if (!arguments.length) {
            return yScale;
        }
        yScale = value;
        return voronoi;
    };

	return voronoi;
}

var init = function(model) {
	mainViewModel = model;

	// Use same color scale across charts
	linecolor = mainViewModel.getColorScale();

	// One-time setup
	svg = d3.select("#spaghetti .svgContainer")
	  .append("svg")
	  	.attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// General setup
	svg.append("g")
		.attr("class", "tweets");

	svg.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(-10,0)")
	  .append("rect")
	  	.attr("width", margin.left).attr("height", (height + margin.bottom))
	  	.attr("transform", "translate(" + -margin.left + ",0)");

	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0,"+(height+10)+")");

	svg.on("mouseenter", mouseenterSVG)
	.on("mouseleave", mouseleaveSVG);

	circle = svg.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 4)
      .attr("opacity", 0)
      .attr("fill", "white")
      .attr("stroke", "black")
      .attr("stroke-width", 3);

	// Set up outlets for showing tweet
	tweetview.view = d3.select('#tweetview');
	tweetview.username = d3.select('#tweetview .username');
	tweetview.screenname = d3.select('#tweetview .screenname');
	tweetview.time = d3.select('#tweetview .time');
	tweetview.followercount = d3.select('#tweetview .followercount');
	tweetview.avatar = d3.select('#tweetview .avatar-custom');
	tweetview.tweet = d3.select('#tweetview .tweet');
	tweetview.verified = d3.select('#tweetview .verified');
	tweetview.retweetList = d3.select('#retweetList');

	// Configure table
	retweeListTable = table()
		.headers([{
			column: "screen_name", 
			text: "Name",
			type: "String",
			sortable: true,
			class: "col-md-6" 
		},{
			column: "verified",
			type: "String",
			text: "&nbsp;",
			sortable: true,
			class: "col-md-2" 
		},{
			column: "followers_count",
			type: "Number",
			text: "Followers",
			sortable: true,
			class: "col-md-4"
		}])
		.sortColumn(2)
		.sortAscending(false);

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
					popularity: d.popularity,
					screen_name: d.screen_name,
					verified: d.verified,
					followers_count: d.followers_count
				};
			});
		});

		// get data bounds
		xBounds = d3.extent(d3.merge([data.map(function(d) {
			return d.points[0].timestamp;
		}), data.map(function(d) {
			return d.points[d.points.length - 1].timestamp;
		})]));

		var yBounds = d3.extent(d3.merge([data.map(function(d) {
			return d.points[0].popularity;
		}), data.map(function(d) {
			return d.points[d.points.length - 1].popularity;
		})]));

		// scale & axis setup
		xScale = d3.time.scale()
			.domain(xBounds)
			.range([0,width]);
		yScale = {};
		yScale.linear = d3.scale.linear()
				.domain(yBounds)
				.range([height, 0]);
		yScale.log = d3.scale.log().clamp(true)
				.domain([Math.max(1, yBounds[0]), yBounds[1]])
				.range([height, 0])
				.nice();

		yAxis = d3.svg.axis()
			.scale(yScale.linear)
			.orient("left")
			.ticks(yTicks);

		xAxis = d3.svg.axis()
		  .scale(xScale)
		  .orient("bottom")
		  .tickFormat(offsetTimeFormat);

		d3.select("#spaghetti").select(".x.axis").call(xAxis);
		d3.select("#spaghetti").select(".y.axis").call(yAxis);

		// Create spaghetti chart and bind x and y scales
		spaghetti = Spaghetti()
			.xScale(xScale)
			.yScale(yScale);

		// Bind data to a selection and call the chart
		dataTweets = d3.select('.tweets')
			.datum(data)
			.call(spaghetti);

		// Add voronoi tesselations
		var voronoi = {};
		voronoi.linear = Voronoi()
			.xScale(xScale)
			.yScale(yScale.linear);
		voronoi.log = Voronoi()
			.xScale(xScale)
			.yScale(yScale.log);

		voronoiGroup = {};
		voronoiGroup.linear = svg.append("g").attr("class", "voronoi linear");
		voronoiGroup.log = svg.append("g").attr("class", "voronoi log");

		// Bind data to voronoi selections and call to setup
		voronoiGroup.linear
			.datum(data)
			.call(voronoi.linear);
		voronoiGroup.log
			.datum(data)
			.call(voronoi.log);

		// Set pointer events
		voronoiGroup.linear.selectAll("path").attr("pointer-events", "all");
		voronoiGroup.log.selectAll("path").attr("pointer-events", "none");

		// Controls
		// Event listeners for lin / log scale buttons
		d3.select('#scale-linear').on("click", function() { updateYScale(true) });
		d3.select('#scale-log').on("click", function() { updateYScale(false) });

		// Setup placename-completion
   		jQuery("#placenameInput").geocomplete()  
   		.bind("geocode:result", function(event, result){
    		var lat = result.geometry.location.A;
    		var lon = result.geometry.location.F;
    		url = 'http://api.timezonedb.com/?lat='+lat+'&lng='+lon+'&format=json&key=2PXSOPRPEFDT';
    		jQuery.getJSON(url)
		  		.done(function(data) {
		  			jQuery("#placenameInput").val("Timezone: " + data.abbreviation);
		  			// Update the time axis
					mainViewModel.setTimeZone(data.zoneName);
					d3.select("#spaghetti").select('.x.axis').call(xAxis);
				});
  		});
	});
};

// Update x domain. To be called on a brush event in the stream graph
var updateXBounds = function(domain) {
	if (!domain) {
		domain = xBounds;
	}

	var translate_x = (domain[0] - xBounds[0]) / (xBounds[0] - xBounds[1]); // Need to get translation before domain update
	xScale.domain(domain);
	dataTweets.call(spaghetti);
    d3.select("#spaghetti").select('.x.axis').call(xAxis);

    // Rescale voronoi diagrams
    var scale_x = (xBounds[1] - xBounds[0]) / (domain[1] - domain[0]);
    translate_x = translate_x * width * scale_x;
    var matrix = "matrix(" + scale_x + ",0,0,1," + translate_x + ",0)";
    voronoiGroup.linear.attr("transform", matrix);
    voronoiGroup.log.attr("transform", matrix);
}

// Change between lin / log scale
var updateYScale = function(isLinearScale) {
	spaghetti.isLinearScale(isLinearScale);
	spaghetti.draw(dataTweets, true);

	// Switch voronoi tesselations
	var offGroup = isLinearScale ? voronoiGroup.log : voronoiGroup.linear;
	var onGroup = isLinearScale ? voronoiGroup.linear : voronoiGroup.log;
	offGroup.selectAll("path").attr("pointer-events", "none");
	onGroup.selectAll("path").attr("pointer-events", "all");	

	// Update y Axis
	yAxis.scale(isLinearScale ? yScale.linear : yScale.log);
	if (isLinearScale) {
		yAxis.ticks(yTicks).tickFormat(d3.format(",d"));
	} else {
		yAxis.tickFormat(function (d) {
        	return yScale.log.tickFormat(yTicks,d3.format(",d"))(d)
		});
	}
	d3.select("#spaghetti").select('.y.axis').transition().duration(1000).call(yAxis);
}

// Event Handlers
var mouseenterSVG = function() {
	d3.select('#tweetview').classed('hidden', false);
}
var mouseleaveSVG = mouseleave = function() {
	d3.select('#tweetview').classed('hidden', true);
}

var mouseoverVoronoi = function(d) {
	// Highlight tweet path
	d3.select(d.tweet.line).classed("tweet-hover", true);
	d.tweet.line.parentNode.appendChild(d.tweet.line);

	showTweet(d);
}

var mouseoutVoronoi = function(d) { 
	if (tweetviewFixed) {
		return;
	}
	// Unhighlight tweet path
	d3.select(d.tweet.line).classed("tweet-hover", false);
}

// Fixes tweet currently in focus to the view
var clickVoronoi = function(d) {
	if (tweetviewFixed) {
		// Unhighlight tweet path
		d3.select('.tweet-hover').classed("tweet-hover", false);

		// Add handler events again
		d3.selectAll('.voronoi path').on("mouseover", mouseoverVoronoi);
		svg.on("mouseleave", mouseleaveSVG);

		// Hide retweet list & circle
		tweetview.retweetList.classed('hidden', true);
		circle.attr("opacity", 0);

		tweetviewFixed = false;
	} else {
		// Highlight tweet path
		d3.select(d.tweet.line).classed("tweet-hover", true);
		d.tweet.line.parentNode.appendChild(d.tweet.line);

		// Show the corresponding tweet & retweet list
		showTweet(d);
		showRetweetList(d);

		// Remove voronoi mouseover handler, svg mouseleave handler
		d3.selectAll('.voronoi path').on("mouseover", null);
		svg.on("mouseleave", null);

		tweetviewFixed = true;
	}
}


// Shows the tweet attached to d in #tweetview
var showTweet = function(d) {
	// Show corresponding tweet
	tweetview.username.html(d.tweet.user.name);
	tweetview.screenname
		.attr("href", "http://twitter.com/" + d.tweet.user.screen_name)
		.html("@" + d.tweet.user.screen_name);
	tweetview.time.html(offsetTimeFormat(d.tweet.points[0]["timestamp"]));
	tweetview.followercount.html(d.tweet.user.followers_count);
	tweetview.tweet.html(d.tweet.text);
	tweetview.verified.classed("hidden", d.tweet.user.verified ? false : true);
	tweetview.avatar.style("background-image", "url(" + d.tweet.user.profile_image_url + ")");
}

// Shows the retweet list attached to d in #tweetview
var showRetweetList = function(d) {
	var color = linecolor(d.tweet.first_code);

	var retweets = d.tweet.points.map(function(d) {
		return {
			screen_name: d.screen_name, 
			verified: d.verified ? '✓' : '', 
			followers_count: d.followers_count
		};
	});

	retweets.shift();
	
	d3.select('#retweetList table')
		.datum(retweets)
	  	.call(retweeListTable);

	d3.select('#retweetList table tbody').selectAll('tr')
		.data(d.tweet.points)
		.on("mouseover", function(d) {
			circle.attr("opacity", 1)
				.attr("stroke", color)
	  			.attr("cx", xScale(d.timestamp))
	  			.attr("cy", yScale.linear(d.popularity));
		});
	
	tweetview.retweetList.classed('hidden', false);
}

var offsetTimeFormat = function(d) {
	return moment.utc(d).tz(mainViewModel.timeZone).format("HH:mm");
}

exports.init = init;
exports.updateXBounds = updateXBounds;
module.exports = exports;