import json
from numpy import cumsum

# groupRTs.py
# 
# Groups tweets & retweets together and calculates points for spaghetti plot
# 
# Input: data.json, formatted
#			{
#				"tweets": [Tweet], 	<-- All tweets without retweeted_status
#				"retweets": [Tweet] <-- All tweets with retweeted_status
#			}
# 	Tweets & retweets with necessary fields for this script can be exported using
#	getData.js as follows:
# 		mongo --quiet getData.js > data.json

#
# Output: grouped.json, formatted
#
#			{
#				"tweets": [{
#					"id": int64,
#					"text": String,
#					"first_code": String,
#					"favorite_count": int,
#					"user": { "id": int64, 	<-- id of user where tweet originated from
#							  "name": String,
#							  "screen_name": String,
#							  "followers_count": int,
#							  "profile_image_url": String,
#							  "verified": boolean
#							},
#					"points": [{
#						"timestamp": int64,
#						"popularity": int  	<--	for now, accumulated follower count of all retweets
#					}]
#				}]
#			}
#

# Do not include retweets with more than
tresh_time = 5 # minutes since last retweet
tresh_time = tresh_time * 60 * 1000

# Only include data within
time_bounds = [0, 1418613811596]

with open('data.json', 'r') as infile, open('grouped.json', 'w') as outfile:
	data = json.load(infile)
	tweets = data["tweets"]
	retweets = data["retweets"]

	# sort by timestamp
	tweets = sorted(tweets, key=lambda t: t[u'created_ts'])
	retweets = sorted(retweets, key=lambda t: t[u'created_ts'])

	grouped = []
	for tweet in tweets:

		id = tweet["id"]
		text = tweet["text"]
		first_code = tweet["codes"][0]["first_code"]
		favorite_count = tweet["favorite_count"]
		user = {"id": tweet["user"]["id"],\
				"name": tweet["user"]["name"],\
				"screen_name": tweet["user"]["screen_name"],\
				"followers_count": tweet["user"]["followers_count"],\
				"profile_image_url": tweet["user"]["profile_image_url"],\
				"verified": tweet["user"]["verified"]\
			}
		timestamps = [tweet["created_ts"]]
		followers = [tweet["user"]["followers_count"]]

		# check time bounds
		if (time_bounds[0] <= timestamps[0] <= time_bounds[1]):
			
			# Join on tweet id
			for retweet in retweets:
				if id == retweet["retweeted_status"]["id"]:
					ts = retweet["created_ts"]
					fo = retweet["user"]["followers_count"]
					if tresh_time < ts - timestamps[-1]:	
						break # too much time passed since last retweet, stale
					timestamps.append(ts)
					followers.append(fo)
			
			popularity = list(cumsum(followers))
			points = [{"timestamp": t, "popularity": p} for (t,p) in zip(timestamps, popularity)]
			grouped.append({"id":id, "text":text, "user": user, "first_code":first_code, "favorite_count": favorite_count, "points":points})

	json.dump({'tweets': grouped}, outfile, indent=4)


