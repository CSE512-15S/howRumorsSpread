// This file creates the rumor collection for a database
// its currently configured to create the one for SydneySiege
// NOTE: the collection_name field must match the name
// of the collections in your mongo database exactly.
//
// USAGE: cat sydney-siege-rumor-collection.js | mongo

use sydneysiege

db.rumors.remove({})
db.rumors.insert([
        {
            collection_name: 'lakemba',
            rumor_name: 'Lakemba Home Raids',
            description: 'Since the hostage-taker of the Sydney Siege event demanded an ISIS flag, it was largely assumed that his actions were related to Islamic terrorism. This rumor claimed that the the Australian Federal Police (AFP) were carrying out home raids in Lakemba, a neighborhood with a large Muslim community, in parallel with their response to the Sydney Siege. The AFP later denied the validity of this rumor. Twenty officers had taken a pre-arranged tool of mosques in Lakemba as part of their police induction on that day, and it is possible that the rumor originated there.',
            date: 'December 15, 2014',
        },
        {
            collection_name: 'flag',
            rumor_name: 'Flag of Islamic State',
            description: 'The gunman forced hostages to hold a flag with white writing in the window which was reported (by some media organisations) as being the flag of the Islamic State. This rumor was dispelled after it was found that the flag  bore the Islamic creed, or Shahada, which is not exclusive to Islamic State.',
            date: 'unknown'
        },
        {
            collection_name: 'airspace',
            rumor_name: 'Airspace Closure',
            description: 'People started reporting that the airspace over Sydney had been closed due to the siege, something confirmed by the Sydney Airport. However this was later disconfirmed by Airservices Australia when they issued a statement saying: "Sydney operations are continuing and Sydney airspace has not been closed."',
            date: 'unknown'
        },
        {
            collection_name: 'suicide',
            rumor_name: 'Suicide Belt',
            description: 'As the siege progressed, there were claims that the hostage taker was seen carrying a backpack or some kind of wearable accessory that appeared to be an explosive device. This sparked rumors that the hostage taker was wearing a suicide belt which was later confirmed as being false.',
            date: 'unknown'
        },
        {
            collection_name: 'hadley',
            rumor_name: 'Hadley',
            description: 'Australian radio host Ray Hadley was rumored to have been contacted by one (or more) of the hostages during the siege.  This rumor turned out to be true, he was contacted by and spoke with one hostage off-air.',
            date: 'unknown'
        }
    ]);