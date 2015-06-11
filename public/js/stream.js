var d3 = require('d3');

function StreamGraph(mainViewModel, json) {
  var self = this,
      parentDiv = '#stream',
      timeGrouping = 'minute', // TODO: variable?
      chartType = 'streamGraph',
      margin = { top: 0, right: 0, bottom: 30, left: 90 },
      width = 800 - margin.left - margin.right,
      height = 130 - margin.top - margin.bottom,
      duration = 750;
      xTicks = 5;

  /* /Begin Chart initilization code */
  d3.select(parentDiv).select('.svgContainer').selectAll('*').remove();

  var svg = d3.select(parentDiv).select('.svgContainer').append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
              .attr('width', width)
              .attr('height', height)
              .attr('transform', 'translate('+margin.left +','+ margin.top+')');

  function logViewportBoundaries(extent) {
    var low = extent[0].getTime() * 1000,
        high = extent[1].getTime() * 1000;

    console.log("viewport boundaries", low, high);
  }

  var xScale = d3.time.scale()
              .range([0, width]),
      yScale = d3.scale.linear()
                 .range([height, 0]),
      color = mainViewModel.getColorScale(),
      viewport = d3.svg.brush()
                    .x(xScale)
                    .on('brush', function() {
                      mainViewModel.updateViewPort(viewport.empty() ? xScale.domain() : viewport.extent());
                      logViewportBoundaries(viewport.extent());
                    })
                    .on('brushend', function() {
                      mainViewModel.updateViewPort(viewport.empty() ? xScale.domain() : viewport.extent());
                      mainViewModel.updateLeaderboard(viewport.empty() ? xScale.domain() : viewport.extent());

                      logViewportBoundaries(viewport.extent());
                    });
  var xAxis = d3.svg.axis()
      .scale(xScale)
      .orient("bottom")
      .tickFormat(mainViewModel.offsetTimeFormat);


  var chart = svg.append('g')
    .attr('class', 'chart');

  var scanline = svg.append('line')
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

  // White rectangle for hiding scanline
  svg.append("rect")
    .attr("class", "hide-scanline")
    .attr("width", margin.left).attr("height", (height))
    .attr("transform", "translate(" + -margin.left + ",0)");

  svg.on('mousemove', function(d, i) {
        var mousex = d3.mouse(this)[0];
        mainViewModel.updateScanlines(xScale.invert(mousex));
        updateVolumeTooltip(mousex);
      })
      .on('mouseover', function(d, i) {
        var mousex = d3.mouse(this)[0];
        mainViewModel.updateScanlines(xScale.invert(mousex));
        updateVolumeTooltip(mousex);
      })
      .on('mouseout', function(d, i) {
        mainViewModel.updateScanlines(null);
        updateVolumeTooltip(null);
      });

  self.updateScanline = function(timestamp) {
    if (timestamp !== null) {
      scanline.style('visibility', 'visible')
        .attr("transform", "translate(" + xScale(timestamp) + ",0)");
    }
    else {
      scanline.style('visibility', 'hidden');
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


  // Switching between graph types
  d3.select('.pick-stream-chart').selectAll('button')
    .on('click', function() {
      var selectedChart = this.value;
      console.log("selectedChart: ", selectedChart);

      d3.selectAll('.pick-stream-chart button').classed('active', false);
      d3.select(this).classed('active', true);

      switch(selectedChart) {
        case 'streamGraph':
          streamGraph(dataset);
          break;
        case 'areaGraph':
          areaGraph(dataset);
          break;
        default:
          console.error('Picked an unknown stream chart type {' + selectedChart +'}\n Reverting to streamGraph');
          streamGraph(dataset);
      }
    });



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

    streamGraph(data);
  }

  function streamGraph(data) {
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

  function areaGraph(data) {

    yScale.domain([0, d3.max(data.map(function(d) { return d.maxVolume; }))])
          .range([height, 0]);


    area.y0(height)
        .y1(function(d) { return yScale(d.volume); });

    line.y(function(d) { return yScale(d.volume); });

    var t = chart.selectAll('.code')
              .transition()
              .duration(duration);

    t.select('path.area')
      .style('fill-opacity', 0.5)
      .attr('d', function(d) { return area(d.values); });

    t.select('path.line')
      .style('stroke-opacity', .8)
      .attr('d', function(d) { return line(d.values); });
  }

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


  self.updateTime = function() {
    d3.select('#stream').select('.x.axis').call(xAxis);
  };

  function init(timeGrouping, data) {
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
  }

  init(timeGrouping, json);
  return self;
}
module.exports = StreamGraph;
