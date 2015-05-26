

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

  /*
  *  TO DO: 
  *  add currentTime observable
  *  That is updated on mousemove of either spaghetti or stream
  *  an update may trigger a change of the scanlines, leaderboards
  *  and tweetviews
  */

  // Spaghetti: Lin / Log value
  self.isLinearScale = ko.observable(true);
  self.isLinearScale.ForEditing = ko.computed({
    read: function() {
      return self.isLinearScale().toString();  
    },
    write: function(newValue) {
      self.isLinearScale(newValue === "true");
      spaghetti.changeScale(self.isLinearScale());
    },
    owner: self        
  });  
}

$(document).ready(function() {
  if($('#spaghetti').length !== 0) {
    spaghetti.init();
  }

  if($('#stream').length !== 0) {
    stream();
  }
  
  ko.applyBindings(new MainViewModel());
});