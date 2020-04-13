const Session = require('./Session');
const DB = require('./DB');
const Log = require('./Log');
const uuidv4 = require('uuid').v4;

const OldSocket = {};
const db = new DB();

// To send an event across the cluster:
// scServer.exchange.publish('sample', count);

OldSocket.init = () => {
  return db.connect();
};

OldSocket.manage = socket => {
  Log.info(`${socket.id} Connection from ${socket.remoteAddress}:${socket.remotePort}`);

  // A few things we use later
  socket.feeds = {};
  socket.session = {
    valid: false,
    traderId: '',
  };

  // This can't be called 'authenticate' because SC traps that internally
  socket.on('auth', async (params, res) => {
    try {
      Log.info(`${socket.id} Authenticating... ${socket.remoteAddress}:${socket.remotePort}`);
      socket.session = {
        traderId: '',
        valid: true,
      };
      // await Session.loadSession(socket, params.authToken);

      // if (socket.session.valid) {
      //     Log.info(`${socket.id} Success! Marking user ${socket.session.userId} active...`);
      //     await db.operations.markUserActive(db, socket.session.userId);
      // }

      res(null, socket.session);
    } catch (e) {
      Log.error('Authentication error', e);
      res(e.message);
    }
  });

  const requireQueryId = params => {
    if (!params.queryId) {
      params.queryId = uuidv4();
      Log.error(`Data request with no queryId, using ${params.queryId}`);
    }
  };

  const requireAuth = (params, res) => {
    if (!socket.session || !socket.session.valid) {
      Log.error('Invalid data request, not authenticated', params);
      res('Invalid data request, not authenticated');
      return false;
    }

    return true;
  };

  socket.on('changes', async (params, res) => {
    if (!requireAuth(params, res)) {
      return;
    }

    requireQueryId(params);

    if (params.query in db.queries) {
      db.queries[params.query](db, socket, params)
        .run(db.conn, (err, cursor) => {
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
    if (!requireAuth(params, res)) {
      return;
    }

    requireQueryId(params);

    if (params.query in db.values) {
      db.values[params.query](db, socket, params)
        .run(db.conn, (err, cursor) => {
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

  socket.on('connectAbort', e => {
    console.log('Connect abort', e);
  });

  socket.on('badAuthToken', e => {
    console.log('Bad Auth Token', e);
  });

  socket.on('disconnect', () => {
    const feeds = Object.values(socket.feeds);
    Log.info(`${socket.id} Disconnected from ${socket.remoteAddress}:${socket.remotePort}, closing ${feeds.length} feed(s)`);
    feeds.map(feed => feed.close());

    if (socket.session.valid) {
      db.operations.markUserInactive(db, socket.session.userId);
    }
  });
};

module.exports = OldSocket;
