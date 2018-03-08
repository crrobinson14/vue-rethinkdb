const r = require('rethinkdb');
const Log = require('./Log');

const DB = {
    queries: require('./Queries'),

    conn: null,

    async connect() {
        try {
            Log.info('   >> Connecting to RethinkDB...');

            const host = process.env.RETHINKDB_HOST || 'localhost';
            const port = process.env.RETHINKDB_PORT || 28015;
            const db = process.env.RETHINKDB_DB || undefined;
            const user = process.env.RETHINKDB_USER || undefined;
            const password = process.env.RETHINKDB_PASSWORD || undefined;

            DB.conn = await r.connect({ host, port, db, user, password });

            Log.info('   >> RethinkDB Connected!');
        } catch (error) {
            console.error(error);
            process.exit(-1);
        }
    }
};

module.exports = DB;
