

var $ = require('jquery'),
    _ = require('underscore'),
    ko = require('knockout'),
    spaghetti = require('./spaghetti.js'),
    volumeChart = require('./volumechart.js');



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

  // Spaghetti
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
  
  getCollectionNames();
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