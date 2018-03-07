const SCWorker = require('socketcluster/scworker');
const express = require('express');
const serveStatic = require('serve-static');
const path = require('path');
const healthChecker = require('sc-framework-health-check');
const Socket = require('./lib/Socket');
const Log = require('./lib/Log');

class Worker extends SCWorker {
    run() {
        Log.info('   >> Worker PID:', process.pid);

        const app = express();

        app.use(serveStatic(path.resolve(__dirname, 'public')));

        // GET /health-check express route
        healthChecker.attach(this, app);

        // General request handling
        this.httpServer.on('request', app);

        // WebSocket connection handling
        this.scServer.on('ready', d => console.log('Ready to accept connections', d));
        this.scServer.on('error', d => console.error('error', d));
        this.scServer.on('notice', d => console.log('notice', d));
        this.scServer.on('connectionAbort', d => console.log('connectionAbort', d));
        this.scServer.on('connection', socket => Socket.manage(socket));
    }
}

(async () => {
    try {
        await Socket.init();

        // eslint-disable-next-line no-new
        new Worker();
    } catch (error) {
        Log.error(error.message, error.stack);
        process.exit(-1);
    }
})();
