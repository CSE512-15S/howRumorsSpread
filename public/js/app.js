var $ = require('jquery');
    global.jQuery = $; 
    bootstrap = require('bootstrap'),
    _ = require('underscore'),
    ko = require('knockout'),
    spaghetti = require('./spaghetti.js'),
    stream = require('./stream.js'),
    legend = require('./legend.js'),
    leaderboard = require('./leaderboard.js');

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

  self.updateViewPort = function (bounds) {
    console.log('Updating charts with bounds: ', bounds);
    spaghetti.updateXScale(bounds);
    leaderboard.updateBounds(bounds);
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
    spaghetti.init(mainViewModel);
  }
  if($('#stream').length !== 0) {
    stream(mainViewModel);
  }
  if($('#legend').length !== 0) {
    legend(mainViewModel);
  }
  if($('#leaderboard').length !== 0) {
    leaderboard(mainViewModel);
  }
  
  ko.applyBindings(mainViewModel);
});