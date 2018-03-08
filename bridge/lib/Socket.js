const jwt = require('jsonwebtoken');
const uuidv4 = require('uuid').v4;
const DB = require('./DB');
const Log = require('./Log');

// Edit and delete me if you want, but in the immortal words of Chris Rock: "You can drive a car with your FEET
// if you want to, that don't make it a good f...ing idea!"
const jwtSecret = process.env.JWT_SECRET || 'CHANGEME';
if (jwtSecret === 'CHANGEME') {
    throw new Error('Invalid or unspecified JWT_SECRET. Refusing to start an insecure installation!');
}

const requireQueryId = params => {
    if (!params.queryId) {
        params.queryId = uuidv4();
        Log.error(`Data request with no queryId, using ${params.queryId}`);
    }
};

const requireAuth = (socket, params, res) => {
    if (!socket.session || !socket.session.valid) {
        Log.error('Invalid data request, not authenticated', params);
        res('Invalid data request, not authenticated');
        return false;
    }

    return true;
};

const Socket = {
    init() {
        return DB.connect();
    },

    manage(socket) {
        Log.info(`${socket.id} Connection from ${socket.remoteAddress}:${socket.remotePort}`);

        // A few things we use later
        socket.feeds = {};
        socket.session = {
            valid: false,
            userId: 0,
        };

        socket.on('auth', async (params, res) => {
            Log.info(`${socket.id} Authenticating... ${socket.remoteAddress}:${socket.remotePort}`);
            try {
                const decoded = jwt.verify(params.authToken, jwtSecret, { algorithm: 'HS256' });
                Object.assign(socket.session, decoded, { valid: true });
                Log.info(`${socket.id} Authenticated Successfully, session data`, socket.session);

                res(null, socket.session);
            } catch (e) {
                Log.error('Authentication error', e);
                res(e.message);
            }
        });

        socket.on('changes', async (params, res) => {
            if (!requireAuth(socket, params, res)) {
                return;
            }

            requireQueryId(params);

            if (params.query in DB.queries) {
                DB.queries[params.query](socket, params)
                    .run(DB.conn, (err, cursor) => {
                        if (err) {
                            Log.error(err);
                            return;
                        }

                        socket.feeds[params.queryId] = cursor;
                        cursor.each((e, change) => socket.emit('change', { params, change }));
                    });
            } else {
                Log.error('Invalid changes request, unknown query ' + params.query);
                res('Invalid changes request, unknown query ' + params.query);
            }
        });

        socket.on('values', async (params, res) => {
            if (!requireAuth(socket, params, res)) {
                return;
            }

            requireQueryId(params);

            if (params.query in DB.values) {
                DB.values[params.query](socket, params)
                    .run(DB.conn, (err, cursor) => {
                        socket.feeds[params.queryId] = cursor;
                        cursor.each((e, value) => socket.emit('value', { params, value }));
                    });
            } else {
                Log.error('Invalid values request, unknown query ' + params.query);
                res('Invalid values request, unknown query ' + params.query);
            }
        });

        socket.on('unsub', async (params, res) => {
            const queryId = params.queryId || '';
            const feed = socket.feeds[queryId] || null;

            if (feed) {
                Log.info(`Unsubscribed from query ID ${params.queryId}`);
                res(null, `Unsubscribed from query ID ${params.queryId}`);
                feed.close();
                delete socket.feeds[queryId];
            } else {
                Log.error(`Cannot unsubscribe: unknown query ID ${params.queryId}`);
                res(`Cannot unsubscribe: unknown query ID ${params.queryId}`);
            }
        });

        // TODO
        // SyncManager.shared.client.emit(eventName: "stopChanges", data: ["queryId": queryId] as AnyObject)

        socket.on('message', async params => {
            if (params !== '#2') {
                Log.info('message', params);
            }
        });

        socket.on('error', async e => {
            Log.info(`${socket.id} Connection error for ${socket.remoteAddress}:${socket.remotePort}: ${e.message}`);
        });

        socket.on('disconnect', () => {
            const feeds = Object.values(socket.feeds);
            Log.info(`${socket.id} Disconnected from ${socket.remoteAddress}:${socket.remotePort}, closing ${feeds.length} feed(s)`);
            feeds.map(feed => feed.close());
        });
    }
};

module.exports = Socket;
