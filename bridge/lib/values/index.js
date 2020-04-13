const values = module.exports = {};
const r = require('rethinkdb');

// Options for returning and monitoring changes to a single object
const standardValue = { includeInitial: true, includeTypes: true, includeStates: true };

// A simple value query for a public user record. We do not emit sensitive fields (email, etc.) here. Note that the
// pluck operation has to come after the changefeed request.
values.getUser = (socket, params) => r.db('somedata')
  .table('users')
  .get(params.userId)
  .changes(standardValue)
  .pluck({ new_val: ['id', 'firstName', 'lastName', 'thumbnail'] });

// A simple value query for a private user record. This does not accept the userId as a parameter. It takes it from
// authentication data so users can only request their own records.
values.myUser = socket => r.db('somedata')
  .table('users')
  .get(socket.session.userId)
  .changes(standardValue);
