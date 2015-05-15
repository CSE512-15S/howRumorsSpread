
var express = require('express'),
  DB = require('mongodb').Db,
  router = express.Router(),
  Server = require('mongodb').Server,
  mongojs = require('mongojs');

var DBServer = new Server('localhost', 27017);

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
