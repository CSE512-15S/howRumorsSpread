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
  // TODO: If we use more than one database, we need to pass this in the request
  var databaseName = 'sydneysiege';
  var db = new DB(databaseName, DBServer);
  db.open(function(err, db) {
    db.collection('rumors').find({}).toArray(function (err, docs) {
      res.send(JSON.stringify(docs));
    });
  });
});

module.exports = router;
