var processCollections = require('./process-collections');

var args = process.argv.slice(2);

if (args.length < 2 || args.length > 4) {
  usage();
}

timeBounds = (args.length == 4) ? [parseInt(args[2]), parseInt(args[3])] : null;

processCollections(args[0], args[1], timeBounds);

function usage () {
  console.log('node create-collection-cache.js <database_name> <collection_name> [lower_bound_ms] [upper_bound_ms]');
  console.log('<database_name> - The name of the database that all the data is in');
  console.log('<collection_name> - the name of the collection to process');
  console.log('[lower_bound_ms] - a lower bound, in milliseconds, of the data to process. If you pass in this, you must pass in upper_bound_ms as well.');
  console.log('[upper_bound_ms] - a upper bound, in milliseconds, of the data to process.');
  process.exit(1);
}