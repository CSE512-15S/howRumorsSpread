

var $ = require('jquery');
    global.jQuery = $; 
    bootstrap = require('bootstrap'),
    _ = require('underscore'),
    ko = require('knockout'),
    spaghetti = require('./spaghetti.js'),
    stream = require('./stream.js');

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
    console.log('Updating viewport with bounds: ', bounds);
    spaghetti.updateXScale(bounds);
  }
}

$(document).ready(function() {
  mainViewModel = new MainViewModel();

  if($('#spaghetti').length !== 0) {
    spaghetti.init();
  }

  if($('#stream').length !== 0) {
    stream(mainViewModel);
  }
  
  ko.applyBindings(mainViewModel);
});