const operations = module.exports = {};
const r = require('rethinkdb');
const DB = require('../DB');

// From the client, this would be called as:
//
//   import RethinkDB from 'vue-rethinkdb';
//   const result = await RethinkDB.emitAck('updateSomething', { id: this.id, data: this.newData });
//
operations.updateSomething = async (socket, cid, { id, data }) => {
  const result = await r.db('somedata')
    .table('someobjects')
    .get(id)
    .update({ data })
    .run(DB.conn);

  // Where queries expect the handlers to behave a certain way, and return a cursor that can be subscribed to,
  // operations can do whatever they want. There is no automatic handling of the return result. But we should generally
  // always write a response back, so the client can choose whether to emit() or emitAck() and both will work.
  socket.write({ rid: cid, data: result });
};
