var express = require('express'),
  DB = require('mongodb').Db,
  router = express.Router(),
  Server = require('mongodb').Server,
  mongojs = require('mongojs'),
  _ = require('underscore');

var DBServer = new Server('localhost', 27017);

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index');
});

router.get('/spaghetti', function(req, res) {
  res.render('spaghetti');
});

router.get('/stream', function(req, res) {
  res.render('stream');
});

router.get('/list-collections', function (req, res) {
  // If we use more than one database, we need to pass this in the request
  var databaseName = 'sydneysiege';
  var db = new DB(databaseName, DBServer);
  db.open(function(err, db) {
    db.collections(function(err, collections) {
      var collectionNames = _.map(collections, function(obj, index) {
        return obj.s.name;
      });
      res.end(JSON.stringify(collectionNames));
      db.close();
    });
  });
});

module.exports = router;
