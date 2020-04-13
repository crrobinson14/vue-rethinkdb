const queries = module.exports = {};
const r = require('rethinkdb');
const DB = require('../DB');

// NOTE: There's obviously no need to keep all the queries in a single file like this. Feel free to break them out,
// this is just an example.

// When using filters rather than indices, we are not allowed to ask for offsets
const basicQuery = { includeInitial: true, includeTypes: true, includeStates: true };

// Options for returning and monitoring changes to a collection
const standardQuery = { ...basicQuery, includeOffsets: true };

// The squash function can let us slow down updates sent for high-transaction-rate collections
const pacedQuery = { ...basicQuery, squash: 0.5 };

// Simple listing of entries from a specified table, sorted by a field name. Note that nearly all collection queries
// will require a limit or RethinkDB will throw an error about an "eager" query. Also, note our use of "pacedQuery"
// to slow down update rates to at most 2x/second.
queries.trendingProducts = () => r.db('somedata')
  .table('trending')
  .orderBy({ index: r.asc('id') })
  .limit(20)
  .changes(pacedQuery);

// Just another query, this time illustrating the use of between/orderby/limit to produce a cooked data set. This
// query pretends we have a table called `orders` with a compound index called `myOrders` with [userId, createdOn]
// as its fields. Compound indices usually require a minval/maxval range operation to query them.
queries.recentOrders = socket => r.db('somedata')
  .table('orders')
  .between(
    [socket.session.userId, r.minval],
    [socket.session.userId, r.maxval],
    { index: 'myOrders' }
  )
  .orderBy({ index: r.desc('myOrders') })
  .limit(20)
  .changes(standardQuery);

// Sophisticated nested operation. Works similar to recentOrders above, but ensures the user owns the order before
// returning it. The socket request handler expects us to return a promise. We can do as much work before it resolves
// as we want. Be careful to avoid extreme depths of work, though, as promises can introduce efficiency problems.
queries.orderItems = (socket, params) => r.db('somedata')
  .table('orders')
  .get(params.orderId)
  .run(DB.conn)
  .then(order => {
    if (order.userId !== socket.session.userId) {
      // Don't give away too much information...
      throw new Error('Invalid or unknown Order.');
    }

    // If we pass our checks, return the actual items changefeed as our real result.
    return r.db('somedata')
      .table('feeds')
      .between(
        [params.interestId, false, false, r.minval],
        [params.interestId, false, false, r.maxval],
        { index: 'activeFeed' }
      )
      .orderBy({ index: r.desc('activeFeed') })
      .limit(40)
      .changes(standardQuery);
  });

// Sophisticated query looking up a bunch of nested details for each matched entry.
queries.myOrderReport = socket => r.db('somedata')
  .table('orders')
  .between(
    [socket.session.userId, r.minval],
    [socket.session.userId, r.maxval],
    { index: 'myOrders' }
  )
  .orderBy({ index: r.desc('myOrders') })
  .limit(50)
  .changes(standardQuery)
  .merge(order => ({
    new_val: {
      user: r.table('users').get(order('new_val')('userId')).default({}),
      reseller: {
        contact: r.table('contacts').get(order('new_val')('resellerContactId')).default({}),
        company: r.table('resellers').get(order('new_val')('resellerId')).default({}),
      },
    }
  }));

// We can do filter() operations but we become non-atomic, so we aren't allowed to ask for offsets anymore. The
// standard client library can handle this, but it's less efficient and predictable so only use it if necessary.
// NOTE: We can clean up some of this logic when https://github.com/rethinkdb/rethinkdb/issues/3997 is done.
queries.userFollowers = (socket, params) => r.db('somedata')
  .table('follows')
  .between(
    [params.userId, r.minval],
    [params.userId, r.maxval],
    { index: 'followsMe' }
  )
  .orderBy({ index: 'followsMe' })
  .filter({ isPublic: true })
  .changes(basicQuery);
