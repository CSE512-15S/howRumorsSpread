var d3 = require('d3');


var StreamGraph = function() {
  var self = this,
      timeGrouping = 'second', // TODO: variable
      collectionName = 'lakemba', // TODO: variable 
      parentDiv = '#stream',
      margin = { top: 0, right: 70, bottom: 20, left: 90 },
      width = 860 - margin.left - margin.right,
      height = 150 - margin.top - margin.bottom,
      duration = 1000;

  var svg = d3.select(parentDiv).select('.svgContainer').append('svg')
              .attr('width', width)
              .attr('height', height);

  console.log('StreamGraph');
  function dataPath() {
    return '/data/' + collectionName + '/' + timeGrouping + '-volume.json';
  }

  
  /* /Begin Chart initilization code */
  var xScale = d3.time.scale()
              .range([0, width]),
      yScale = d3.scale.linear()
                 .range([height, 0]),
      color  = d3.scale.category10();

  // Area generator for stream graph polygons
  var area = d3.svg.area()
                .interpolate('basis')
                .x(function(d) { return xScale(d.date); });
  // Line generator for chart's edges
  var line = d3.svg.line()
                .interpolate('basis')
                .x(function(d) { return xScale(d.date); });

  // Stack layout for streamgraph
  var stack = d3.layout.stack()
                .values(function(d) { return d.values; })
                .x(function(d) { return d.date; })
                .y(function(d) { return d.volume; })
                .out(function(d, y0, y) { return d.volume0 = y0; })
                .order('reverse');
  /* /End Chart initilization code */

  function drawChart(data) {
    var minDate = d3.min(data, function(d) { return d.values[0].date; })
        maxDate = d3.max(data, function(d) { return d.values[d.values.length - 1].date; });

    // Update domain of scales with this date range
    xScale.domain([minDate, maxDate]);
    
    area.y0(height / 2)
        .y1(height / 2);

    var g = svg.selectAll('.code')
                .data(data)
                .enter();
    var codes = g.append('g')
                    .attr('class', 'code');

    // add some paths that will
    // be used to display the lines and
    // areas that make up the charts
    codes.append('path')
            .attr('class', 'area')
            .style('fill', function(d) { return color(d.key); })
            .attr('d', function(d) { return area(d.values); });

    codes.append('path')
            .attr('class', 'line')
            .style('stroke-opacity', .000001);

    
    streamgraph(data);
  }

  function streamgraph(data) {
    stack.offset('wiggle');
    stack(data);
    
    var yMax = d3.max(data[0].values.map(function(d) { return d.volume0 + d.volume; }));
    yScale.domain([0, yMax])
          .range([height, 0]);

    area.y0(function(d) { return yScale(d.volume0); })
        .y1(function(d) { return yScale(d.volume0 + d.volume); });

    var t = svg.selectAll('.codes')
                .transition()
                .duration(duration);
    t.select('path.area')
      .style('fill-opacity', 1.0)
      .attr('d', function(d) { return area(d.values); });
  }

  function init(collectionName, timeGrouping) {

    // Initialize by loading the data
    d3.json(dataPath(), function(err, data) {
      if (err) return console.warn(err);
      var tweetVolume = function (volumeDatum) {
        // TODO: Include favorites and/or retweet counts in here?
        return parseInt(volumeDatum.numTweets);
      }

      data.forEach(function(codeGroup) {
        codeGroup.values.forEach(function(d) {
          d.date = new Date(parseInt(d.timestamp));
          d.volume = tweetVolume(d);
        });

        codeGroup.maxVolume = d3.max(codeGroup.values, function(d) { return d.volume; });
      });

      // Sort dates to show them in order
      data.sort(function(a, b) { return b.maxVolume - a.maxVolume; });
      dataset = data;
      console.log('dataset: ', dataset);
      // drawChart(dataset);
    });  
  }

  init(collectionName, timeGrouping);
};
module.exports = StreamGraph;
