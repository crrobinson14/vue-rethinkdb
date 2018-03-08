const jwt = require('jsonwebtoken');
const uuidv4 = require('uuid').v4;
const DB = require('./DB');
const Log = require('./Log');

// Set this to enable authentication. Once enabled, query subscriptions will be rejected for unauthenticated users.
const jwtSecret = process.env.JWT_SECRET;

const requireQueryId = params => {
    if (!params.queryId) {
        params.queryId = uuidv4();
        Log.error(`Data request with no queryId, using ${params.queryId}`);
    }
};

const checkAuth = (socket, params, res) => {
    if (!jwtSecret) {
        return true;
    }

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
        socket.logIdent = [socket.remoteAddress, socket.remotePort].join(':');
        Log.info(`${socket.id} Connection from ${socket.logIdent}`);

        // A few things we use later
        socket.feeds = {};
        socket.session = {
            valid: false,
            userId: 0,
        };

        socket.on('auth', (params, res) => {
            if (!jwtSecret) {
                Log.error('Client attempted authentication but JWT_SECRET not set.');
                res('Authentication failure.');
                return;
            }

            Log.info(`${socket.id} Authenticating... ${socket.logIdent}`);
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

        socket.on('subscribeQuery', (params, res) => {
            if (!checkAuth(socket, params, res)) {
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
                        cursor.each((e, change) => socket.emit('queryResponse', { params, change }));
                    });
            } else {
                Log.error('Invalid request: Unknown query ' + params.query);
                res('Invalid request: unknown query ' + params.query);
            }
        });

        socket.on('unsubscribeQuery', (params, res) => {
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

        // All other SocketCluster mechanisms will work here as well. For instance, to generically subscribe to all
        // messages from clients, implement the following listener:
        // socket.on('message', async params => {
        //     if (params !== '#2') {
        //         Log.info('Generic message from client', params);
        //     }
        //
        //     // Do something here
        // });

        socket.on('error', e => {
            Log.info(`${socket.id} Connection error for ${socket.logIdent}: ${e.message}`);
        });

        socket.on('disconnect', () => {
            const feeds = Object.values(socket.feeds);
            Log.info(`${socket.id} Disconnected from ${socket.logIdent}, closing ${feeds.length} feed(s)`);
            feeds.map(feed => feed.close());
        });
    }
};

module.exports = Socket;
