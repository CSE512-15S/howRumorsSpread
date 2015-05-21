var  DB = require('mongodb').Db,
  Server = require('mongodb').Server,
  mongojs = require('mongojs'),
  fs = require('fs');

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
  var projection1 = {
    '$project' : {
      'affirm_deny' : '$codes.first_code',
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
    cb(db, collectionName);
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

function createCache (db, collectionName) {
  var cacheLocation = './public/data/',
      cacheName = cacheLocation + collectionName + '.json';

  createIndexes(db, function() {
    db.collection(collectionName).find({}).sort({'timestamp_ms' : 1}).toArray(function(err, docs) {
      writeToFile(cacheName, JSON.stringify(docs));
    }); 
  });
}

function writeToFile(filename, string) {
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