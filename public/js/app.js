var $ = require('jquery');
    global.jQuery = $,
    d3 = require('d3'),
    bootstrap = require('bootstrap'),
    _ = require('underscore'),
    ko = require('knockout'),
    spaghetti = null,
    stream = null,
    legend = null,
    leaderboard = null;

function MainViewModel() {
  var self = this;
  self.collectionNames = ko.observableArray();
  getCollectionNames();

  function getCollectionNames() {
    $.get('/list-collections', {}, function(data) {
      self.collectionNames.removeAll();
      _.each(JSON.parse(data), function(name) {
        self.collectionNames.push({'name' : name});
      });
    });
  }

  self.currentTime = 0;
  self.setCurrentTime = function (currentTime) {
    self.currentTime = currentTime;
    // TO DO
    // - trigger change of scanlines in spaghetti / stream
    // - update leaderboards and tweetviews
  }

  self.updateViewPort = function (bounds) {
    spaghetti.updateXBounds(bounds);
    leaderboard.updateXBounds(bounds);
  }

  // Shared color scale for graphics
  self.colorScale = d3.scale.ordinal()
   .domain(["Affirm", "Deny", "Unrelated", "Neutral"])
   .range(['rgb(202,0,32)','rgb(5,113,176)', 'rgb(244,165,130)','rgb(146,197,222)']);

  self.getColorScale = function() {
    return self.colorScale;
  }
}


$(document).ready(function() {
  mainViewModel = new MainViewModel();

  if($('#spaghetti').length !== 0) {
    spaghetti = require('./spaghetti.js');
    spaghetti.init(mainViewModel);
  }
  if($('#stream').length !== 0) {
    stream = require('./stream.js')(mainViewModel);
  }
  if($('#legend').length !== 0) {
    legend = require('./legend.js')(mainViewModel);
  }
  if($('#leaderboard').length !== 0) {
    leaderboard = require('./leaderboard.js')(mainViewModel);
  }
  
  ko.applyBindings(mainViewModel);
});