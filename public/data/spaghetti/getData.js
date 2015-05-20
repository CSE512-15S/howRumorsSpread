// Generate the data.json file needed for groupRTs using
// 		mongo --quiet getData.js > data.json

conn = new Mongo();
db = conn.getDB("test");

tweets = db.lakemba.find({'retweeted_status': {$exists: false}}, { 'id': 1, 'codes': 1, 'text': 1, 'created_ts': 1, 'user.id': 1, 'user.name': 1, 'user.name': 1, 'user.screen_name': 1, 'user.followers_count': 1 }).toArray();
retweets = db.lakemba.find({retweeted_status: {$exists: true}}, { 'created_ts': 1, 'user.followers_count': 1, 'retweeted_status.id': 1 }).toArray();

// Un-extended mongo json-ify

tweets = tweets.map(function(d){
	d._id = d._id.valueOf();
	d.created_ts = d.created_ts.valueOf();
	d.id = d.id.valueOf();
	d.user.id = d.user.id.valueOf();
	return d;
});

retweets = retweets.map(function(d){
	d._id=d._id.valueOf();
	d.created_ts = d.created_ts.valueOf();
	d.retweeted_status.id = d.retweeted_status.id.valueOf();
	return d;
});

printjson({
	"tweets": tweets,
	"retweets": retweets
	});