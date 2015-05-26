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
    db = new DB(databaseName, DBServer);


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
      cb(db, 'lakemba', 'raw.json');
      volumeProjection('second');
    });
  }

  // Groups data by times and codes and strips nearly everything else out
  function volumeProjection (binBy) {
    switch(binBy) {
      case 'hour':
      case 'minute':
      case 'second':
      case 'milisecond':
        var binOperator = '$' + binBy;

        var timeBin = {};
        timeBin[binOperator] = '$dt';

        db.collection('collection-projected').aggregate([
          {'$unwind' : '$codes'},
          {'$group' : {
            '_id' : {
              '_id' : '$_id',
              'retweet_count' : '$retweet_count',
              'favorite_count' : '$favorite_count',
              'timestamp_ms' : '$timestamp_ms'
            },
            'code' : {'$first' : '$codes'}
          }},
          {'$project' : {
            'retweet_count' : '$_id.retweet_count',
            'favorite_count' : '$_id.favorite_count',
            // More info on this hack here: http://stackoverflow.com/a/27828951/1408490
            'dt' : {'$add' : [new Date('$_id.timestamp_ms'), 0]},
            'code' : 1
          }},
          {'$project' : {
            'retweet_count' : '$_id.retweet_count',
            'favorite_count' : '$_id.favorite_count',
            'code' : 1,
            'time_bin' : timeBin
          }},
          {'$group' : {
            '_id' : {
              'code' : '$code',
              'time_bin': '$time_bin'
            },
            'num_tweets' : {'$sum' : 1},
            'num_favorites' : {'$sum' : '$favorite_count'},
            'num_retweets' : {'$sum' : '$retweet_count'}
          }},
          {'$group' : {
            '_id' : {
              'key' : '$_id.code'
            },
            'values' : {
              '$push' : {
                'time_bin' : '$_id.time_bin',
                'num_tweets' : '$num_tweets',
                'num_favorites' : '$num_favorites',
                'num_retweets' : '$num_retweets'
              }
            }
          }},
          {'$project' : {
            '_id' : 0,
            'key' : '$_id.key',
            'values' : 1
          }}
        ], function(err, docs) {
          if (err) console.log(err);
          var cacheDir = './public/data/' + collectionName +'/',
              cachePath = cacheDir + binBy + '-volume.json';
          mkdirp(cacheDir, function(err) {
            if (err) console.err(err);
            writeToFile(cachePath, JSON.stringify(docs));  
          });
        });
        break;
      default:
        console.error('Invalid binBy in volumeProjection');
        return;
    }
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