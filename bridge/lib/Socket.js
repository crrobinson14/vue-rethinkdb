const Socket = module.exports = {};
const DB = require('./DB');
const Log = require('./Log');
const operations = require('./operations');
const queries = require('./queries');
const values = require('./values');

// Send an error report to a client
const reportError = (spark, message, extraData) => {
  console.error(spark.id, message, extraData);
  spark.write(message);
};

// Send a regular message to the client
const reportEvent = (spark, message, extraData) => {
  console.log(spark.id, message, extraData);
  spark.write(message);
};

Socket.handleConnection = spark => {
  console.log(spark.id, 'Connection from', spark.address, spark.request.decodedSessionToken);

  // Monkey-patch in a session tracker. If a session token was provided, we make a structure with its contents
  // and a boolean indicating the session is valid. Otherwise, we have an empty object and valid === false.
  spark.session = { ...spark.request.decodedSessionToken, valid: true } || { valid: false };

  // Monkey-patch in a tracker for live-query changefeeds the client has subscribed to.
  spark.feeds = {};

  // Process a message from the client
  spark.on('data', message => {
    const { rid, event, data } = message;

    // If the message type indicates the client wants to call an API function, call that directly. This only
    // works if we define a handler for the event the client sends. Otherwise we fall through and eventually
    // output "unhandled client message" below as a reminder to the developer that something is not implemented.
    // Each API handler is passed a reference to the DB (so they don't need to import it / avoids circular
    // references), the spark, the request ID from the client (rid), and the data the client sent.
    if (operations[event]) {
      operations[event](spark, rid, data);
      return;
    }

    switch (event) {
      case 'handshake':
        console.log(spark.id, 'Handshake received, replying...');
        spark.write({ rid, event: 'handshake' });
        break;

      case 'once': {
        // We need a queryId, and it needs to be unique
        const { queryId, type, query, params } = data;
        if (!queryId || spark.feeds[queryId]) {
          reportError(spark, `Invalid query: missing or duplicate queryId: ${queryId}`, message);
          return;
        }

        // And the query has to exist...
        const handlers = type === 'collection' ? queries : values;
        if (!(query in handlers)) {
          reportError(spark, `Unknown query: ${query}`, message);
          return;
        }

        try {
          handlers[query](spark, params || {})
            .run(DB.conn)
            .then(cursor => {
              spark.feeds[queryId] = cursor;
              cursor.each((e, change) => spark.write({
                event: 'queryResponse',
                data: { type, queryId, change }
              }));
            })
            .catch(e => reportError(spark, `Invalid query: ${e.message}`, message));
        } catch (e) {
          reportError(spark, `Invalid query: ${e.message}`, message);
        }
      }
        break;

      case 'subscribe': {
        // We need a queryId, and it needs to be unique
        const { queryId, type, query, params } = data;
        if (!queryId || spark.feeds[queryId]) {
          reportError(spark, `Invalid query: missing or duplicate queryId: ${queryId}`, message);
          return;
        }

        // And the query has to exist...
        const handlers = type === 'collection' ? queries : values;
        if (!(query in handlers)) {
          reportError(spark, `Unknown query: ${query}`, message);
          return;
        }

        try {
          handlers[query](spark, params || {})
            .run(DB.conn)
            .then(cursor => {
              spark.feeds[queryId] = cursor;
              cursor.each((e, change) => spark.write({
                event: 'queryResponse',
                data: { type, queryId, change }
              }));
            })
            .catch(e => reportError(spark, `Invalid query: ${e.message}`, message));
        } catch (e) {
          reportError(spark, `Invalid query: ${e.message}`, message);
        }
      }
        break;

      case 'unsubscribe': {
        const { queryId } = data;
        const feed = spark.feeds[queryId] || null;

        if (feed) {
          reportEvent(spark, `Unsubscribed from query ID ${queryId}`, message);
          feed.close();
          delete spark.feeds[queryId];
        } else {
          reportError(spark, `Unknown query ID ${queryId}`, message);
        }
      }
        break;

      default:
        console.log(spark.id, 'Unhandled client message', message);
        break;
    }
  });

  spark.on('end', () => {
    console.log(spark.id, 'Disconnected');
  });
};
