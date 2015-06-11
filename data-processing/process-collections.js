var DB = require('mongodb').Db,
  Server = require('mongodb').Server,
  mongojs = require('mongojs'),
  fs = require('fs'),
  mkdirp = require('mkdirp'),
  exec = require('child_process').exec,
  DBServer = new Server('localhost', 27017);



function processForSpaghettiGraph(db, collectionName, timestampThreshold) {
  var usingDefaultThres = !timestampThreshold;
  if (usingDefaultThres) {
    timestampThreshold = defaultThreshold();
  }

  dbConsumers +=1;
  db.collection(collectionName).find(
    {'retweeted_status': {$exists: false},
    'codes.rumor' : collectionName,
    'codes.first_code' : {
      '$in' :  ['Neutral', 'Affirm', 'Deny']
    }},
    { 'id': 1, 'codes': 1, 'text': 1, 'created_ts': 1, 'favorite_count': 1, 'user.id': 1, 'user.name': 1, 'user.name': 1, 'user.screen_name': 1, 'user.followers_count': 1, 'user.profile_image_url': 1, 'user.verified': 1, 'user.favorite_count': 1, 'timestamp_ms' : 1 })
  .toArray(function(err, tweets) {
      if (err) return console.error(err);

      // Remove any tweet that did not recieve codes and that were out of bounds
      tweets = tweets.filter(function(d) {
        return (d.hasOwnProperty("codes")
        && parseInt(d.timestamp_ms) >= timestampThreshold[0]
        && parseInt(d.timestamp_ms) <= timestampThreshold[1]);
      });

      tweets = tweets.map(function(d){
        d._id = d._id.valueOf();
        d.created_ts = d.created_ts.valueOf();
        d.id = d.id.valueOf();
        d.user.id = d.user.id.valueOf();
        return d;
      });

      db.collection(collectionName).find(
        {retweeted_status: {$exists: true},
        'codes.rumor' : collectionName,
        'codes.first_code' : {
          '$in' :  ['Neutral', 'Affirm', 'Deny']
        }},
        {'created_ts': 1, 'user.followers_count': 1, 'user.verified': 1, 'user.screen_name': 1, 'retweeted_status.id': 1, 'timestamp_ms' : 1 })
      .toArray(function(err, retweets) {
          if (err) return console.error(err);
          retweets = retweets.filter(function(d) {
            return (parseInt(d.timestamp_ms) >= timestampThreshold[0]
            && parseInt(d.timestamp_ms) <= timestampThreshold[1]);
          });

          retweets = retweets.map(function(d){
            d._id = d._id.valueOf();
            d.created_ts = d.created_ts.valueOf();
            d.retweeted_status.id = d.retweeted_status.id.valueOf();
            return d;
          });

          dbConsumers -= 1;
          closeDB(db);
          runPyScript(tweets, retweets, timestampThreshold);
      });
  });

  function runPyScript(tweets, retweets, timestampThreshold) {
    writeToFile('./infile.json', JSON.stringify({
      'tweets' : tweets,
      'retweets' : retweets
    }), function() {
      threshString = (timestampThreshold) ? " " + timestampThreshold[0] + " " + timestampThreshold[1] : "";

      exec('python spaghettiGroupRetweets.py' + threshString, function() {
        fs.readFile('./outfile.json', function (err, data) {
          if (err) return console.error(err);
          var usingDefaultThres = !timestampThreshold;
          writeToCache(collectionName, 'spaghetti.json', JSON.parse(data), usingDefaultThres);
          fs.unlinkSync('./outfile.json');
          fs.unlinkSync('./infile.json');
        });
      });
    });
  }
}

// Groups data by times and codes and strips nearly everything else out
function processForStreamGraph (db, collectionName, binBy, timeThreshold) {
  var usingDefaultThres = !timeThreshold;
  if (usingDefaultThres) {
    timeThreshold = defaultThreshold();
  }

  var binDivVal = null;

  switch(binBy) {
    case 'hour':
      binDivVal = 1000 * 60 * 60;
      break;
    case 'minute':
      binDivVal = 1000 * 60;
      break;
    case 'second':
      binDivVal = 1000;
      break;
    case 'millisecond':
      binDivVal = 1;
      break;
    default:
      console.error('Invalid binBy in volumeProjection');
      return;
  }

  function codedVolumeProjection(tweets) {
    // First group all tweets by their timestamp
    // and then by their coded value
    var binnedByTime = {}
        codes = [];
    tweets.forEach(function(tweet) {
      // We use this truncated timestamp to bin the times
      // We cast back up to a timestamp scale though
      // so that date conversions work in our views
      var timeBin = parseInt(tweet.timestamp / binDivVal) * binDivVal;
      if (! binnedByTime.hasOwnProperty(timeBin)) {
        binnedByTime[timeBin] = {};
      }
      var bin = binnedByTime[timeBin];

      if (! bin.hasOwnProperty(tweet.code) ) {
        bin[tweet.code] = [];
      }

      bin[tweet.code].push({
        numFavorites : tweet.favorite_count,
        numRetweets : tweet.retweet_count
      });

      if (codes.indexOf(tweet.code) === -1) {
        codes.push(tweet.code);
      }
    });

    // All codes for a given timestamp
    // need to have the same number of entries
    // to work with d3's stack layout
    // This code ensures this
    Object.keys(binnedByTime).forEach(function (timestamp) {
      var timeBin = binnedByTime[timestamp];

      // Make sure each timeBin represents all codes
      codes.forEach(function(code) {
        if (! timeBin.hasOwnProperty(code)) {
          timeBin[code] = [];
        }
      });

      // Aggregate values for each code
      // into single object for this timestamp
      Object.keys(timeBin).forEach(function(code) {
        timeBin[code] = timeBin[code].reduce(function (prev, curr) {
            return {
              numFavorites : prev.numFavorites + curr.numFavorites,
              numRetweets : prev.numRetweets + curr.numRetweets,
              numTweets : prev.numTweets + 1
            };
          }, { numFavorites : 0, numRetweets : 0, numTweets : 0 }
        );
      });
    });

    // Group data by code to prepare for final transformation
    var binnedByCode = {};
    Object.keys(binnedByTime).forEach(function(timestamp) {
      var timeBin = binnedByTime[timestamp];
      Object.keys(timeBin).forEach(function(code) {
        if (! binnedByCode.hasOwnProperty(code)) {
          binnedByCode[code] = [];
        }

        var aggregatedVal = timeBin[code];
        aggregatedVal['timestamp'] = timestamp;
        binnedByCode[code].push(aggregatedVal);
      });
    });

    // Transform structure into final format expected by visualization
    // [{code : <codename>, aggregatedTweets: [<aggregated tweets at timestamps>]}]
    var finalMapping = codes.map(function(code) {
      return {
        key : code,
        values : binnedByCode[code]
      };
    });

    writeToCache(collectionName, binBy + '-coded-volume.json', finalMapping, usingDefaultThres);
  }

  function totalVolumeProjection(tweets) {
    var binnedByTime = {};
    tweets.forEach(function(tweet) {
      // We use this truncated timestamp to bin the times
      // We cast back up to a timestamp scale though
      // so that date conversions work in our views
      var timeBin = parseInt(tweet.timestamp / binDivVal) * binDivVal;
      if (! binnedByTime.hasOwnProperty(timeBin)) {
        binnedByTime[timeBin] = [];
      }
      var bin = binnedByTime[timeBin];

      bin.push({
        numFavorites : tweet.favorite_count,
        numRetweets : tweet.retweet_count,
        code : 'total-volume'
      });
    });

    // Aggregate
    var aggregated = Object.keys(binnedByTime).map(function(timestamp) {
      var bin = binnedByTime[timestamp];

      return bin.reduce(function (prev, curr) {
                    return {
                      numFavorites : prev.numFavorites + curr.numFavorites,
                      numRetweets : prev.numRetweets + curr.numRetweets,
                      numTweets : prev.numTweets + 1,
                      code : 'total-volume',
                      timestamp : timestamp
                    };
                  }, { numFavorites : 0, numRetweets : 0, numTweets : 0, code : 'total-volume' });
    });
    var finalMapping = [{
      'key' : 'total-volume',
      'values' : aggregated
    }];
    writeToCache(collectionName, binBy + '-total-volume.json', finalMapping, usingDefaultThres);
  }
  dbConsumers += 1;
  db.collection(collectionName).find({
    'codes.rumor' : collectionName,
    'codes.first_code' : {
      '$in' :  ['Neutral', 'Affirm', 'Deny']
    }
  }).toArray(function(err, docs) {
    if (err) return console.error(err);
    docs = docs.filter(function(d) {
      return (d.hasOwnProperty("codes")
        && parseInt(d.timestamp_ms) >= timeThreshold[0]
        && parseInt(d.timestamp_ms) <= timeThreshold[1]);
    });

    docs = docs.map(function(doc, index) {
      return {
        retweet_count : doc.retweet_count,
        timestamp : parseInt(doc.timestamp_ms),
        favorite_count : doc.favorite_count,
        code : doc.codes[0].first_code
      }
    });
    codedVolumeProjection(docs);
    totalVolumeProjection(docs);
    dbConsumers -= 1;
    closeDB(db);
  });
}

function writeToCache(collectionName, cacheName, json, usingDefaultThres) {
  var cacheDir = '../public/data/' + collectionName +'/';

  // TODO:
  // if (!usingDefaultThres) {
  //   cacheDir += "bounded/";
  // }

  var cachePath = cacheDir + cacheName;
  mkdirp(cacheDir, function(err) {
    if (err) console.err(err);
    writeToFile(cachePath, JSON.stringify(json, null, 4));
  });
}

function writeToFile(filename, string, cb) {
  console.log('File <'+ filename +'> written');
  fs.writeFile(filename, string, function(err) {
    if (err) throw Error(err);

    if (cb && typeof cb == "function") {
      cb();
    }
  });
}

var dbConsumers = 0;

function closeDB(db) {
  if (dbConsumers == 0) {
    db.close();
  }
}

function defaultThreshold() {
  return [0, Date.now() * 1000];
}

function ProcessCollections (databaseName, collectionName, timeThreshold) {
  db = new DB(databaseName, DBServer);
  if (timeThreshold && !timeThreshold.length == 2) {
    timeThreshold = null; // it was poorly formatted so we should use the default anyways
  }

  db.open(function (err, db) {
    if (err) return console.error(err);

    processForStreamGraph(db, collectionName, 'minute', timeThreshold);
    processForSpaghettiGraph(db, collectionName, timeThreshold);
  });
}

module.exports = ProcessCollections;