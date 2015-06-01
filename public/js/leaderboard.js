var d3 = require('d3');

var LeaderBoard = function (mainViewModel) {
  var self = this,
      parentDiv = '#leaderboard',
      timeBounds = [0, Date.now()];


  self.updateXBounds = function (newBounds) {
    // FYI, This function will get called by the mainViewModel in app.js
    // when the viewport changes on the streamgraph
    
    timeBounds = newBounds;
    //TODO: Update the leaderboard
  };

  return self;
};


module.exports = LeaderBoard;