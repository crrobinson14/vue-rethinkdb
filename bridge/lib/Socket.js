const jwt = require('jsonwebtoken');
const DB = require('./DB');
const Log = require('./Log');

// Set this to enable authentication. Once enabled, query subscriptions will be rejected for unauthenticated users.
const jwtSecret = process.env.JWT_SECRET;

const reportError = (res, message, extraData) => {
    Log.error(message, extraData);
    res(message);
};

const reportEvent = (res, message, extraData) => {
    Log.info(message, extraData);
    res(null, message);
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
                reportError(res, 'Authentication failure', 'JWT_SECRET not set');
                return;
            }

            Log.info(`${socket.id} Authenticating... ${socket.logIdent}`);
            try {
                const decoded = jwt.verify(params.authToken, jwtSecret, { algorithm: 'HS256' });
                Object.assign(socket.session, decoded, { valid: true });
                Log.info(`${socket.id} Authenticated Successfully, session data`, socket.session);

                res(null, socket.session);
            } catch (e) {
                reportError(res, e.message, e);
            }
        });

        socket.on('subscribeQuery', (request, res) => {
            // If authentication is required, block anonymous requests
            if (jwtSecret && (!socket.session || !socket.session.valid)) {
                reportError(res, 'Invalid query: authentication required', request);
                return;
            }

            // We need a queryId, and it needs to be unique
            const { queryId, query, params } = request;
            if (!queryId || socket.feeds[queryId]) {
                reportError(res, `Invalid query: missing or duplicate queryId: ${queryId}`, request);
                return;
            }

            // And the query has to exist...
            if (!(query in DB.queries)) {
                reportError(res, `Unknown query: ${query}`, request);
                return;
            }

            // We need to try/catch AND promise.catch() because some REQL errors can occur outside the Promise.
            try {
                DB.queries[query](socket, params || {})
                    .run(DB.conn)
                    .then(cursor => {
                        socket.feeds[queryId] = cursor;
                        cursor.each((e, change) => socket.emit('queryResponse', { queryId, change }));
                    })
                    .catch(e => reportError(res, `Invalid query: ${e.message}`, request));
            } catch (e) {
                reportError(res, `Invalid query: ${e.message}`, request);
            }
        });

        socket.on('unsubscribeQuery', (params, res) => {
            const { queryId } = params;
            const feed = socket.feeds[queryId] || null;

            if (feed) {
                reportEvent(res, `Unsubscribed from query ID ${queryId}`, params);
                feed.close();
                delete socket.feeds[queryId];
            } else {
                reportError(res, `Unknown query ID ${queryId}`, params);
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
