var $ = require('jquery');
    global.jQuery = $,
    d3 = require('d3'),
    bootstrap = require('bootstrap'),
    _ = require('underscore'),
    ko = require('knockout'),
    moment = require('moment-timezone'),
    spaghetti = null,
    stream = null,
    legend = null,
    leaderboard = null;

function MainViewModel() {
  var self = this
      self.activeCollection = 'lakemba',
      self.collectionNames = ko.observableArray();
  // getCollectionNames();

  // function getCollectionNames() {
  //   $.get('/list-collections', {}, function(data) {
  //     self.collectionNames.removeAll();
  //     _.each(JSON.parse(data), function(name) {
  //       self.collectionNames.push({'name' : name});
  //     });
  //   });
  // }

  self.updateViewPort = function (bounds) {
    spaghetti.updateXBounds(bounds);
  }

  self.updateLeaderboard = function (bounds) {
    leaderboard.updateXBounds(bounds);
  }

  self.updateScanlines = function (x) {
    spaghetti.updateScanline(x);
    stream.updateScanline(x);
  }

  self.updateActiveCollection = function() {
    // TODO:
  };

  // Shared color scale for graphics
  self.colorScale = d3.scale.ordinal()
   .domain(["Affirm", "Deny", "Unrelated", "Neutral"])
   .range(['rgb(202,0,32)','rgb(5,113,176)', 'rgb(244,165,130)','rgb(146,197,222)']);

  self.getColorScale = function() {
    return self.colorScale;
  };

  self.updateCurrentVolumes = function (codedVolumes) {
    legend.updateVolumes(codedVolumes);
  };

  // Time zone
  self.timeZone = "Atlantic/Reykjavik"; // Default: UTC
  self.setTimeZone = function(newTimeZone) {
    self.timeZone = newTimeZone;
    spaghetti.updateTime();
    stream.updateTime();
  };
  self.offsetTimeFormat = function(d) {
    return moment.utc(d).tz(self.timeZone).format("HH:mm");
  };
}

$(document).ready(function() {
  mainViewModel = new MainViewModel();

  if($('#spaghetti').length !== 0) {
    spaghetti = require('./spaghetti.js');
    spaghetti.init(mainViewModel);
  }
  if($('#leaderboard').length !== 0) {
    leaderboard = require('./leaderboard.js')(mainViewModel);
  }
  if($('#stream').length !== 0) {
    stream = require('./stream.js')(mainViewModel);
  }
  if($('#legend').length !== 0) {
    legend = require('./legend.js')(mainViewModel);
  }
  
  // Populate Timezone Selection
  d3.csv("../data/timezones.csv", function(error, timezones) {
    var select = d3.select('#timezoneSelect');
    var options = select.selectAll("option").data(timezones);
    options.enter().append("option")
      .text(function (d) { return d.offset; })
    
    select.on("change", function(d,i) {
      var selectedIndex = select.property('selectedIndex');
      var data          = options[0][selectedIndex].__data__;
      mainViewModel.setTimeZone(data.abbreviation);
    });
  });


  
  ko.applyBindings(mainViewModel);
});