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
          '$ne' : 'Unrelated'
        }
      }}, projection1,
      {'$out' : 'collection-projected'}
    ];

    db.collection(collectionName).aggregate(aggregationQuery, function(err, docs) {
      if (err) {
        console.log(err);
      }
      cb(db, collectionName, 'raw.json');

      // fixDocumentFieldTypes(function() {
      timeBins.forEach(function(bin) {
        volumeProjection(bin);
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
  

  // Groups data by times and codes and strips nearly everything else out
  function volumeProjection (binBy) {
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

      var binnedByCode = {};
      docs.forEach(function(doc, index) {
        if (! binnedByCode.hasOwnProperty(doc.code)) {
          binnedByCode[doc.code] = [];
        }

        binnedByCode[doc.code].push(doc);
      });

      // Process each code bin to group tweets by the binBy val
      var finalMapping = Object.keys(binnedByCode).map(function(code) {
        var tweets = binnedByCode[code];
        binnedByCode[code] = [];
        var timeBins = {};
        tweets.forEach(function(tweet) {
          var timeBin = parseInt(tweet.timestamp / binDivVal);

          if (! timeBins.hasOwnProperty(timeBin)) {
            timeBins[timeBin] = [];
          }
          timeBins[timeBin].push(tweet);
        });

        var binnedByTime = Object.keys(timeBins).map(function(timeBinKey) {
          var timeBin = timeBins[timeBinKey],
              numTweets = 0,
              numFavorites = 0,
              numRetweets = 0;

          timeBin.forEach(function(tweet) {
            numTweets++;
            numFavorites += tweet.favorite_count;
            numRetweets += tweet.retweet_count;
          });

          return {
            timeBin : timeBinKey,
            numTweets : numTweets,
            numFavorites : numFavorites,
            numRetweets : numRetweets
          };
        });

        return {
          'key' : code,
          'values' : binnedByTime
        };
      });

      var cacheDir = './public/data/' + collectionName +'/',
          cachePath = cacheDir + binBy + '-volume.json';
      
      mkdirp(cacheDir, function(err) {
        if (err) console.err(err);
        writeToFile(cachePath, JSON.stringify(finalMapping));
      });
    
    });
    
  }

  rawProjection();
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
  projectAndAggregate(db, collectionName, createCache)
});

function usage () {
  console.log('node create-collection-cache.js <collection_name> [database_name]');
  console.log('<collection_name> - the name of the collection to create a cache for');
  console.log('[database_name] - defaults to \'sydneysiege\'');
  process.exit(1);
}