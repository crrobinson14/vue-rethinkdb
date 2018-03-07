const r = require('rethinkdb');
const DB = require('../DB');

const standardQuery = { includeInitial: true, includeTypes: true, includeStates: true, includeOffsets: true };
const noRangeQuery = { includeInitial: true, includeTypes: true };

const queries = {};

// Simple listing of entries from a specified table, sorted by a field name. Note that nearly all collection queries
// will require a limit or RethinkDB will throw an error about an "eager" query.
//
// This query takes no parameters.
queries.trendingProducts = () =>
    r.table('trending')
        .orderBy({ index: r.asc('id') })
        .limit(20)
        .changes(standardQuery);

// Just another query, this time illustrating the use of between/orderby/limit to produce a cooked data set. This
// query pretends we have a table called `orders` with a compound index called `myOrders` with [userId, createdOn]
// as its fields. Compound indices usually require a minval/maxval range operation to query them.
queries.recentOrders = (db, socket) =>
    r.table('orders')
        .between(
            [socket.session.userId, r.minval],
            [socket.session.userId, r.maxval],
            { index: 'myOrders' }
        )
        .orderBy({ index: r.desc('myOrders') })
        .limit(20)
        .changes(standardQuery);

// This is similar to recentOrders but verifies that we actually own the order first!
queries.orderItems = (db, socket, params) => r.table('orders')
    .get(params.orderId)
    .run(DB.conn)
    .then(order => {
        if (order.userId !== socket.session.userId) {
            // Don't give away too much information...
            throw new Error('Invalid or unknown Order.');
        }

        // If we pass our checks, return the actual items changefeed as our real result.
        return r.table('feeds')
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
queries.myOrderReport = (db, socket) =>
    r.table('orders')
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
queries.myFollowers = (db, socket, params) =>
    r.table('follows')
        .between(
            [params.userId, r.minval],
            [params.userId, r.maxval],
            { index: 'followsMe' }
        )
        .orderBy({ index: 'followsMe' })
        .filter({ isAccepted: true })
        .changes(noRangeQuery);

module.exports = queries;
