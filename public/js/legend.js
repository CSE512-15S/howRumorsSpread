var d3 = require('d3');

function Legend(mainViewModel) {
  var self = this,
      margin = { top: 0, right: 0, bottom: 0, left: 250 },
      width = 860 - margin.left - margin.right,
      height = 20,
      colorScale = mainViewModel.getColorScale(),
      rectSize = 10,
      vertPadding = 5,
      horzPadding = 6;
  var svg = d3.select('#legend').select('.svgContainer')
              .append('svg')
                .attr('height', height)
                .attr('width', width + margin.left + margin.right)
              .append('g')
                .attr('transform', 'translate('+ margin.left+ ',0)');

  function initialData () {
    return colorScale.domain().map(function(colorCode) {
      return {
        code : colorCode,
        volume : null
      };
    });
  }

  function draw(data) {
    function horizantalOffset(index) {
      var codes = data.map(function(d) {return d.code; }),
          charWidthScalar = 6,
          // We use 4 because its unlikely we will get more then 4 digits for a volume
          volumeOffset = 4 * charWidthScalar, 
          textSize = 0;
      // Crude method for estimating width of the text 
      // via the number of letters it has
      for (var i = 1; i <= index && i < codes.length; i++) {
        textSize += codes[i - 1].length * charWidthScalar;
      }

      var offset = (rectSize + (2 * horzPadding)) * index + textSize + volumeOffset * index;
      return offset;
    }

    var legend = svg.selectAll('.legend-key')
                  .data(data, function(d) { return d.code; });

    var enterSelection = legend.enter()
          .append('g')
          .attr('class', 'legend-key')
          .attr('transform', function(d, i) {
            var vertOffset = vertPadding,
                horzOffset = horizantalOffset(i);
            return 'translate('+horzOffset+','+vertOffset+')';
          });
    enterSelection.append('rect')
          .attr('width', rectSize)
          .attr('height', rectSize)
          .style('fill', function (d) {
            return colorScale(d.code);
          })
          .style('stroke', function (d) {
            return colorScale(d.code);
          });
    
    enterSelection.append('text')
          .attr('class', 'code')
          .attr('x', rectSize + horzPadding)
          .attr('y', rectSize)
          .text(function(d) { return d.code; });
    
    enterSelection.append('text')
          .attr('class', 'volume')
          .attr('x', function(d, i) {
            var codes = data.map(function(d) {return d.code; });
            return rectSize + horzPadding*2 + codes[i].length * 6;
          })
          .attr('y', rectSize);

    // Enter & Update
    legend.selectAll('.volume')
          .text(function(d) { 
            // TODO: no hacks please
            var volume = data.filter(function(innerD) { return innerD.code == d.code})[0].volume;
            return volume === null ? "" : volume;
          });
  }

  draw(initialData());


  self.updateVolumes = function(codedVolumes) {
    draw(codedVolumes);
  };


  return self;

}

module.exports = Legend;