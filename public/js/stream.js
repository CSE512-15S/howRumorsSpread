var d3 = require('d3');

var StreamGraph = function(mainViewModel) {
  var self = this,
      timeGrouping = 'minute', // TODO: variable
      collectionName = 'lakemba', // TODO: variable 
      parentDiv = '#stream',
      margin = { top: 0, right: 50, bottom: 40, left: 50 },
      width = 750 - margin.left - margin.right,
      height = 150 - margin.top - margin.bottom,
      duration = 750,
      xTicks = 5;
  
  /* /Begin Chart initilization code */
  var svg = d3.select(parentDiv).select('.svgContainer').append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
              .attr('width', width)
              .attr('height', height)
              .attr('transform', 'translate('+margin.left +','+ margin.top+')');

  var xScale = d3.time.scale()
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
  var xAxis = d3.svg.axis()
      .scale(xScale)
      .orient("bottom")
      .tickFormat(offsetTimeFormat)
      .ticks(xTicks);
 
  var chart = svg.append('g')
    .attr('class', 'chart');

  var vertLine = svg.append('line')
                    .attr('x1', 0)
                    .attr('x2', 0)
                    .attr('y1', 0)
                    .attr('y2', height)
                    .style('visibility', 'hidden')
                    .style('stroke-width', 1)
                    .style('stroke', '#ccc')
                    .style('fill', 'none');

  // Append viewport
  svg.append('g')
      .attr('class', 'viewport')
      .call(viewport)
      .selectAll('rect')
      .attr('height', height);

  // Append xAxis
  chart.append('g')
        .attr('class', 'x axis')
        .attr("transform", "translate(0,"+(height+10)+")");
  

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
        moveVertLine(null);
        updateVolumeTooltip(null);
      });

  function moveVertLine(mousePosition) {
    if (mousePosition !== null) {
      vertLine.style('visibility', 'visible')
              .attr('x1', mousePosition)
              .attr('x2', mousePosition);
    }
    else {
      vertLine.style('visibility', 'hidden') 
    }
  }

  function updateVolumeTooltip(mousePosition) {
    var invertedDate = xScale.invert(mousePosition);
    var matchingTimestamp = binTimestamp(invertedDate.getTime());

    var volumes = dataset.map(function(datum) {
      var volume = null;
      
      if (mousePosition !== null) {
        volume = 0;
        var matching = datum.values.filter(function(value, index) {
          return value.timestamp == matchingTimestamp;
        });
        if (matching.length > 0) {
          volume = matching[0].volume;
        }
      }

      return {
        code : datum.key,
        volume : volume 
      }
    });

    mainViewModel.updateCurrentVolumes(volumes);
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

    // Draw X Axis
    d3.select(parentDiv).select('.x.axis').call(xAxis);
    
    // Make streamgraph enamate from center of chart
    area.y0(height / 2)
        .y1(height / 2);

    var g = chart.selectAll('.code')
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

    var t = chart.selectAll('.code')
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

  function offsetTimeFormat(d) {
    return moment.utc(d).tz(mainViewModel.timeZone).format("HH:mm");
  }

  self.updateXAxis = function() {
    d3.select('.x.axis').call(xAxis);
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
          // d.date = parseInt(d.timestamp);
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

  return self;
};
module.exports = StreamGraph;
