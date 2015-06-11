var $ = require('jquery');
    global.jQuery = $,
    d3 = require('d3'),
    bootstrap = require('bootstrap'),
    _ = require('underscore'),
    ko = require('knockout'),
    moment = require('moment-timezone')

function MainViewModel() {
  var self = this,
      spaghetti = null,
      stream = null,
      legend = null,
      leaderboard = null
      self.activeCollection = ko.observable(),
      self.collections = ko.observableArray();

  self.updateViewPort = function (bounds) {
    spaghetti.updateXBounds(bounds);
  };

  self.updateLeaderboard = function (bounds) {
    leaderboard.updateXBounds(bounds);
  };

  self.updateScanlines = function (timestamp) {
    spaghetti.updateScanline(timestamp);
    stream.updateScanline(timestamp);
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

  function loadComponents(forCollection) {
    if($('#spaghetti').length !== 0 || $('#leaderboard').length !== 0) {
      // Load the spaghetti and leaderboards
      d3.json('/data/' + forCollection + '/spaghetti.json', function(err, data) {
        if (err) {
          return console.warn("Could not load data for spaghetti and leaderboard components", err);
        }

        if($('#spaghetti').length !== 0) {
          spaghetti = require('./spaghetti.js');
          spaghetti.init(self, data);
        }

        if($('#leaderboard').length !== 0) {
          var leaderboardModule = require('./leaderboard.js');
          leaderboard = leaderboardModule(self, data);
        }
      });
    }

    if($('#stream').length !== 0) {
      d3.json('/data/' + forCollection + '/minute-coded-volume.json', function(err, data) {
        if (err) {
          return console.warn("Could not load data from stream component", err);
        }

        var streamModule = require('./stream.js');
        stream = new streamModule(self, data);
      });
    }

    if($('#legend').length !== 0) {
      var legendModule = require('./legend.js');
      legend = legendModule(self);
    }
  }

  function getCollections() {
    $.get('/list-collections', {}, function(data) {
      self.collections.removeAll();
      _.each(JSON.parse(data), function(coll) {
        self.collections.push(coll);
      });
    });
  }

  self.activeCollection.subscribe(function(newValue) {
    loadComponents(newValue.collection_name);
  });

  getCollections();
}

$(document).ready(function() {
  mainViewModel = new MainViewModel();
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