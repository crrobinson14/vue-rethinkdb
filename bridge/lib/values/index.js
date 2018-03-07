const r = require('rethinkdb');

const standardValue = { includeInitial: true, includeStates: true, includeTypes: true };

const values = {};

// Example of a query that uses an auth parameter (userId) to provide a hard-coded record. Clients would call for
// `myUser` with no parameter.
values.myUser = socket =>
    r.table('users')
        .get(socket.session.userId)
        .changes(standardValue);

// Example of a query that would call for another user's public record. Note that the `pluck()` operation runs after
// the changefeed request so it works on each selected record. This is frequently necessary in RethinkDB. Also note that
// because it runs on a changefeed, which has record values in a key called `new_val` in each message, pluck needs to
// work against that nested structure as well.
//
// This query uses a user-supplied parameter, `userId`.
values.getUser = (socket, params) =>
    r.table('users')
        .get(params.userId)
        .changes(standardValue)
        .pluck({ new_val: ['id', 'firstName', 'lastName', 'thumbnail'] });

// Example of a similar query to `getUser` that merges (joins) other table data into each result. This is normally
// really confusing to do once you start working with changefeeds, but works really well this way. Here we pretend
// we have a list of "products" where each product is in a certain category. We don't want to have to story category
// names with every product - just their IDs. We merge them in only when necessary.
values.getProduct = (socket, params) =>
    r.table('products')
        .get(params.articleId)
        .changes(standardValue)
        .merge(article => ({
            new_val: {
                categor: r.table('categories')
                    .get(article('new_val')('categoryId'))
                    .default({})
            }
        }));

module.exports = values;
