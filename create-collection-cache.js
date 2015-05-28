var  DB = require('mongodb').Db,
  Server = require('mongodb').Server,
  mongojs = require('mongojs'),
  fs = require('fs'),
  mkdirp = require('mkdirp');

var commandLineArgs = process.argv.slice(2);

if (commandLineArgs.length == 0 || commandLineArgs.length > 2) {
  usage();
}

var DBServer = new Server('localhost', 27017),
    databaseName = (commandLineArgs.length == 2) ? commandLineArgs[1] : 'sydneysiege',
    collectionName = commandLineArgs[0],
    db = new DB(databaseName, DBServer),
    timeBins = ['millisecond', 'second', 'minute'];


// First perform aggregation

function projectAndAggregate(db, collectionName, cb) {
  // Strips out irrelevant details but includes most data and doesnt do any special grouping
  function rawProjection () {
    var projection1 = {
      '$project' : {
        'codes' : '$codes.first_code',
        'counts' : 1,
        'created_at' : 1,
        'timestamp_ms' : 1,
        'text' : 1,
        'user' : {
          'id' : 1,
          'name' : 1,
          'screen_name' : 1,
          'verified' : 1,
          'followers_count' : 1,
          'statuses_count' : 1,
          'listed_count' : 1,
          'friends_count' : 1,
          'description' : 1,
          'following' : 1,
          'created_ts' : 1
        },
        'retweeted_status': 1,
        'retweeted' : 1,
        'retweet_count' : 1,
        'entities' : 1,
        'contributors' : 1,
        'favorited' : 1,
        'favorite_count' : 1
      }
    };

    var aggregationQuery = [
      {'$match' : {
        'codes.rumor' : collectionName,
        'codes.first_code' : {
          '$in' : ['Neutral', 'Affirm', 'Deny']
        }
      }}, projection1,
      {'$out' : 'collection-projected'}
    ];

    db.collection(collectionName).aggregate(aggregationQuery, function(err, docs) {
      if (err) {
        console.log(err);
      }
      createCache(db, collectionName, 'raw.json');

      // fixDocumentFieldTypes(function() {
      timeBins.forEach(function(bin) {
        volumeProjections(bin);
      });
      // })
    });
  }

  // Casts timestamps that are strings into numerics 
  function fixDocumentFieldTypes (cb) {
    db.collection('collection-projected').find({}).toArray(function(err, docs) {
      docs.forEach(function(doc, index, docsArray) {
        db.collection('collection-projected').update(
          {_id: doc._id}, 
          {$set: {
            timestamp_ms : parseInt(doc.timestamp_ms)
          }},
          {},
          function() {
            if (index === docsArray.length - 1) {
              cb();
            }
          }
        );
      });
    });
  }

  rawProjection();
}

// Groups data by times and codes and strips nearly everything else out
function volumeProjections (binBy) {
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

    writeToCache(binBy + '-coded-volume.json', finalMapping);
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
    writeToCache(binBy + '-total-volume.json', finalMapping);
  }

  function writeToCache(cacheName, json) {
    var cacheDir = './public/data/' + collectionName +'/',
        cachePath = cacheDir + cacheName;
    
    mkdirp(cacheDir, function(err) {
      if (err) console.err(err);
      writeToFile(cachePath, JSON.stringify(json));
    });
  }
  
  db.collection('collection-projected').find({}).toArray(function(err, docs) {
    if (err) return console.error(err);
    docs = docs.map(function(doc, index) {
      return {
        retweet_count : doc.retweet_count,
        timestamp : doc.timestamp_ms,
        favorite_count : doc.favorite_count,
        code : doc.codes[0]
      }
    });
    codedVolumeProjection(docs);
    totalVolumeProjection(docs);
  });
}

function createIndexes (db, cb) {
  var sort = {
    'timestamp_ms' : 1
  };

  db.collection('collection-projected').createIndex({
    'timestamp_ms' : 1
  }, {}, cb);
}

function createCache (db, collectionName, cacheName) {
  var cacheDir = './public/data/' + collectionName + '/',
      cachePath = cacheDir + cacheName;

  createIndexes(db, function() {
    db.collection('collection-projected').find({}).sort({'timestamp_ms' : 1}).toArray(function(err, docs) {
      mkdirp(cacheDir, function(err) {
        if (err) console.err(err);
        writeToFile(cachePath, JSON.stringify(docs));  
      });
    });
  });
}

function writeToFile(filename, string) {
  console.log('File <'+ filename +'> written');
  fs.writeFile(filename, string, function(err) {
    if (err) throw Error(err);
  });
}

db.open(function(err, db) {
  projectAndAggregate(db, collectionName);
});

function usage () {
  console.log('node create-collection-cache.js <collection_name> [database_name]');
  console.log('<collection_name> - the name of the collection to create a cache for');
  console.log('[database_name] - defaults to \'sydneysiege\'');
  process.exit(1);
}