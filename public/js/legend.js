var d3 = require('d3');

function Legend(mainViewModel) {
  var margin = { top: 0, right: 0, bottom: 0, left: 250 },
      width = 860 - margin.left - margin.right,
      height = 20,
      colorScale = mainViewModel.getColorScale(),
      rectSize = 10,
      vertPadding = 5,
      horzPadding = 6;
  var svg = d3.select('#legend')
              .append('svg')
                .attr('height', height)
                .attr('width', width + margin.left + margin.right)
              .append('g')
                .attr('transform', 'translate('+ margin.left+ ',0)');

  var legend = svg.selectAll('.legend-key')
                  .data(colorScale.domain())
                  .enter()
                  .append('g')
                  .attr('class', 'legend-key')
                  .attr('transform', function(d, i) {
                    var vertOffset = vertPadding,
                        horzOffset = horizantalOffset(i);
                    return 'translate('+horzOffset+','+vertOffset+')';
                  });

  function horizantalOffset(index) {
    var scales = colorScale.domain(),
        textSize = 0;
    // Crude method for estimating width of the text 
    // via the number of letters it has
    for (var i = 1; i <= index && i < scales.length; i++) {
      textSize += scales[i - 1].length * 6;
    }

    // textSize = 70 * index;
    var offset = (rectSize + (2 * horzPadding)) * index + textSize;
    return offset;
  }


  legend.append('rect')
        .attr('width', rectSize)
        .attr('height', rectSize)
        .style('fill', colorScale)
        .style('stroke', colorScale);
  legend.append('text')
        .attr('x', rectSize + horzPadding)
        .attr('y', rectSize)
        .text(function(d) { return d; });

}

module.exports = Legend;