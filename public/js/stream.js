var d3 = require('d3');

var StreamGraph = function(mainViewModel) {
  var self = this,
      timeGrouping = 'minute', // TODO: variable
      collectionName = 'lakemba', // TODO: variable 
      parentDiv = '#stream',
      margin = { top: 0, right: 70, bottom: 20, left: 90 },
      width = 860 - margin.left - margin.right,
      height = 150 - margin.top - margin.bottom,
      duration = 750;
  
  /* /Begin Chart initilization code */
  var svg = d3.select(parentDiv).select('.svgContainer').append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
              .attr('width', width)
              .attr('height', height)
              .attr('transform', 'translate('+margin.left +','+ margin.top+')');

 var vertLine = d3.select(parentDiv).append('div')
                  .attr('class', 'time-position-line')
                  .style('position', 'absolute')
                  .style('width', '1px')
                  .style('height', height + 'px')
                  .style('left', margin.left + 'px')
                  .style('top', '0px')
                  .style('background', '#ccc');

  var xScale = d3.scale.linear()
              .range([0, width]),
      yScale = d3.scale.linear()
                 .range([height, 0]),
      color = mainViewModel.getColorScale(),
      viewport = d3.svg.brush()
                    .x(xScale)
                    .on('brush', function() {
                      mainViewModel.updateViewPort(viewport.empty() ? xScale.domain() : viewport.extent()); 
                    })
                    .on('brushend', function() {
                      mainViewModel.updateViewPort(viewport.empty() ? xScale.domain() : viewport.extent()); 
                    });

  var volumeTooltip = d3.select(parentDiv)
                        .append('div')
                        .attr('class', 'volume-tooltip')
                        .style('position', 'absolute')
                        .style('z-index', '20')
                        .style('visibility', 'hidden')
                        .style('top', '30px')
                        .style('left', '10px');

 

  svg.append('g')
      .attr('class', 'viewport')
      .call(viewport)
      .selectAll('rect')
      .attr('height', height);

  svg.on('mousemove', function(d, i) {
        var mousex = d3.mouse(this)[0];
        moveVertLine(mousex);
        updateVolumeTooltip(mousex);
      })
      .on('mouseover', function(d, i) {
        var mousex = d3.mouse(this)[0];
        moveVertLine(mousex);
        updateVolumeTooltip(mousex);
      })
      .on('mouseout', function(d, i) {
        //TODO: Hide tooltip and vertline?
      });

  function moveVertLine(mousePosition) {
    var position = mousePosition + margin.left + 5;
    vertLine.style("left", position + "px");
  }

  function updateVolumeTooltip(mousePosition) {
    var matchingTimestamp = binTimestamp(xScale.invert(mousePosition));
    // console.log('matchingTimestamp', matchingTimestamp);

    // var matching = d.values.filter(function(value, index) {
    //   return value.timestamp == matchingTimestamp;
    // });
    // var volume = 1;
    // if (matching.length > 0) {
    //   volume = matching[0].volume;
    // }

    mainViewModel.updateCurrentVolumes({
      'Affirm' : 1,
      'Deny' : 2,
      'Neutral' : 0,
      'Unrelated' : 0
    });
    // volumeTooltip.html('<p>' + d.key + '<br>' + volume + '</p>' )
    //               .style('visibility', 'visible');
  }

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
                .out(function(d, y0, y) { d.volume0 = y0; })
                .order('reverse');
  /* /End Chart initilization code */

  function drawChart(data) {
    var minDate = d3.min(data, function(d) { return d.values[0].date; })
        maxDate = d3.max(data, function(d) { return d.values[d.values.length - 1].date; });

    // Update domain of scales with this date range
    xScale.domain([minDate, maxDate]);
    
    // Make streamgraph enamate from center of chart
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
            .style('stroke-opacity', 0.0001);


    
    streamgraph(data);
  }

  function streamgraph(data) {
    stack.offset('silhouette');
    stack(data);
    
    var yMax = d3.max(data[0].values.map(function(d) { return d.volume0 + d.volume; }));
    yScale.domain([0, yMax])
          .range([height, 0]);

    line.y(function(d) { return yScale(d.volume0); });

    area.y0(function(d) { return yScale(d.volume0); })
        .y1(function(d) { return yScale(d.volume0 + d.volume); });

    var t = svg.selectAll('.code')
                .transition()
                .duration(duration);
    t.select('path.area')
      .style('fill-opacity', 1.0)
      .attr('d', function(d) { return area(d.values); });

    t.select('path.line')
      .style('stroke-opacity', 0.0001)
      .attr('d', function(d) { return line(d.values); });
  }

  // function()

  // Bins the generated timestamp into the same itnerval
  // set with var timeGrouping
  function binTimestamp(timestamp) {
    timestamp = parseInt(timestamp);
    var divVal = null
    switch (timeGrouping) {
      case 'minute':
        divVal = 1000 * 60;
        break;
      case 'second':
        divVal = 1000;
        break;
      case 'millisecond':
        divVal = 1;
        break;
      default:
        console.warn('Binning unsupported timestamp type', timeGrouping, timestamp);
        break;
    }

    return parseInt(timestamp / divVal) * divVal;
  }

  function dataPath() {
    return '/data/' + collectionName + '/' + timeGrouping + '-coded-volume.json';
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
          // d.date = new Date(parseInt(d.timestamp));
          d.date = parseInt(d.timestamp);
          d.volume = tweetVolume(d);
          d.key = codeGroup.key;
        });

        codeGroup.values.sort(function(a, b) {
          return a.date - b.date;
        });

        codeGroup.maxVolume = d3.max(codeGroup.values, function(d) { return d.volume; });
      });

      
      data.sort(function(a, b) { return b.maxVolume - a.maxVolume; });
      dataset = data;
      drawChart(dataset);
    });
  }

  init(collectionName, timeGrouping);
};
module.exports = StreamGraph;
