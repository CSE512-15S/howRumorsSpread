var d3 = require('d3');

var spaghetti = function() {
  var margin = { top: 70, right: 70, bottom: 70, left: 70 },
			    width = 30000 - margin.left - margin.right,
			    height = 600 - margin.top - margin.bottom;

			var svg = d3.select("body svg#svgContainer")
			  .append("svg")
			  	.attr("width", width + margin.left + margin.right)
			    .attr("height", height + margin.top + margin.bottom)
			  .append("g")
    			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");			 
			var data;

			// Load data
			d3.json('data/spaghetti/grouped.json', function(error, json) {
				if (error) return console.warn(error);
				data = json.tweets;
				update(data);
			});

			function update(data) {
				// get bounds of data
				min_ts = d3.min(data.map(function(d) {
					return d.points[0].timestamp;
				}));
				max_ts = d3.max(data.map(function(d) {
					return d.points[d.points.length - 1].timestamp;
				}));
				max_popularity = d3.max(data.map(function(d) {
					return d.points[d.points.length - 1].popularity;
				}));

				// scales
				var x = d3.scale.linear()
					.domain([min_ts, max_ts])
					.range([0,width]);

				var y = d3.scale.linear()
					.domain([1, max_popularity])
					.range([height, 0]);

				var yAxis = d3.svg.axis()
					.scale(y)
					.orient("left");

				svg.append("g")
					.attr("class", "y axis")
					.call(yAxis)
					.attr("transform", "translate(-10,0)");

				// Line function
				var lineFunction = d3.svg.line()
					.x(function(d) { return x(d.timestamp); })
					.y(function(d) { return y(d.popularity); })
					.interpolate("basis");

				// Data join
				var lines = svg.selectAll('.line')
					.data(data);

				// Enter
				var enter = lines.enter().append("g");
				enter.append("path")
					.datum(function(d) { return d.points; })
				  	.attr("d", lineFunction)
                  	.attr("stroke", "#000")
                  	.attr("stroke-width", 3)
                  	.attr("fill", "none");

                // Hover
                enter.on("mouseover", function(d) {
                	d3.select('#tweet').html(d.text);
                });
                enter.on("mouseout", function(d) {
                	d3.select('#tweet').html('');
                });
			}

};

module.exports = spaghetti;
