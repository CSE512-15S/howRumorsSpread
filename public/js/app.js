

var $ = require('jquery'),
    _ = require('underscore'),
    ko = require('knockout'),
    spaghetti = require('./spaghetti.js'),
    stream    = require('./stream.js');


function MainViewModel() {
  var self = this;
  self.collectionNames = ko.observableArray();

  function getCollectionNames() {
    $.get('/list-collections', {}, function(data) {
      self.collectionNames.removeAll();
      _.each(JSON.parse(data), function(name) {
        self.collectionNames.push({'name' : name});
      });
    });
  }

  self.test = function() {
    alert('test!');
  };
  
  getCollectionNames();
}

$(document).ready(function() {
  if($('#spaghetti').length !== 0) {
    spaghetti();
  }
  if($('#stream').length !== 0) {
    stream();
  }
  
  ko.applyBindings(new MainViewModel());
});