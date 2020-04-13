const Primus = require('primus');
const Socket = require('./lib/Socket');
const Authorizor = require('./lib/Authorizor');
const DB = require('./lib/DB');

const port = process.env.PORT || 8000;

async function start() {
  // NOTE: Since this is just an example project, we do minimal error handling for database connection issues. We
  // pretty much just quit if the connection fails, and if it succeeds, we assume it's good forever. Edit DB.js to
  // add whatever additional handlers you want.
  await DB.connect();

  const primus = Primus.createServer({ port, transformer: 'websockets', pingInterval: 20000 });

  // If you don't need authorization, you can comment out this line.
  primus.authorize(Authorizor);

  // This is an error for all of Primus, not an individual connection
  primus.on('error', e => console.log('Server Error', e));

  // A client has connected
  primus.on('connection', Socket.handleConnection);
}

start()
  .catch(e => console.error(e));
