const DB = module.exports = {};
const r = require('rethinkdb');
const Log = require('./Log');

if (!process.env.DB_HOST) {
  console.error('You must set the DB_HOST environment variable');
  process.exit(-1);
}

DB.conn = null;

// You will almost certainly want to make the error handling here smarter. See
// https://rethinkdb.com/api/javascript/event_emitter for events you can handle.
DB.connect = async () => {
  try {
    Log.info('Connecting to RethinkDB...');
    DB.conn = await r.connect({ host: process.env.DB_HOST, port: process.env.DB_PORT || 28015 });

    DB.conn.on('close', e => {
      console.error('RethinkDB connection closed', e);
      process.exit(-1);
    });

    Log.info('RethinkDB Connected!');
  } catch (error) {
    Log.error(error);
    process.exit(-1);
  }
};
