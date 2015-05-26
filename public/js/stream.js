var d3 = require('d3');




var StreamGraph = function() {
  var self = this,
      timeGrouping = 'millisecond', // TODO: variable
      collectionName = 'lakemba', // TODO: variable 
      parentDiv = '#stream',
      margin = { top: 0, right: 70, bottom: 20, left: 90 },
      width = 860 - margin.left - margin.right,
      height = 150 - margin.top - margin.bottom;

  function dataPath() {
    return '/public/data/' + collectionName + '/' + timeGrouping + '-volume.json';
  }


  function drawChart(dataset) {
    var x = d3.time.scale()
              .range([0, width])



  }


  function init(collectionName, timeGrouping) {
    // Initialize by loading the data
    d3.json(dataPath(), function(err, data) {
      if (err) return console.warn(err);
      
      dataset = data;    
      drawChart(dataset);
    });  
  }

  init(collectionName, timeGrouping);
};
module.exports = StreamGraph;
