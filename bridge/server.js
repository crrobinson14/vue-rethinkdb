/*
 This is the SocketCluster master controller file.
 It is responsible for bootstrapping the SocketCluster master process.
 Be careful when modifying the options object below.
 If you plan to run SCC on Kubernetes or another orchestrator at some point
 in the future, avoid changing the environment variable names below as
 each one has a specific meaning within the SC ecosystem.
 */

const scHotReboot = require('sc-hot-reboot');
const fsUtil = require('socketcluster/fsutil');
const SocketCluster = require('socketcluster');

const waitForFile = fsUtil.waitForFile;
const argv = require('minimist')(process.argv.slice(2));

const workerControllerPath = argv.wc || process.env.SOCKETCLUSTER_WORKER_CONTROLLER;
const brokerControllerPath = argv.bc || process.env.SOCKETCLUSTER_BROKER_CONTROLLER;
const workerClusterControllerPath = argv.wcc || process.env.SOCKETCLUSTER_WORKERCLUSTER_CONTROLLER;
const environment = process.env.ENV || 'dev';

const Log = require('./lib/Log');

const options = {
    workers: Number(argv.w) || Number(process.env.SOCKETCLUSTER_WORKERS) || 1,
    brokers: Number(argv.b) || Number(process.env.SOCKETCLUSTER_BROKERS) || 1,
    port: Number(argv.p) || Number(process.env.SOCKETCLUSTER_PORT) || 8000,
    // If your system doesn't support 'uws', you can switch to 'ws' (which is slower but works on older systems).
    wsEngine: process.env.SOCKETCLUSTER_WS_ENGINE || 'uws',
    appName: 'sync',
    logLevel: 1,
    workerController: workerControllerPath || __dirname + '/worker.js',
    brokerController: brokerControllerPath || __dirname + '/broker.js',
    workerClusterController: workerClusterControllerPath || null,
    socketChannelLimit: Number(process.env.SOCKETCLUSTER_SOCKET_CHANNEL_LIMIT) || 1000,
    clusterStateServerHost: argv.cssh || process.env.SCC_STATE_SERVER_HOST || null,
    clusterStateServerPort: process.env.SCC_STATE_SERVER_PORT || null,
    clusterAuthKey: process.env.SCC_AUTH_KEY || null,
    clusterInstanceIp: process.env.SCC_INSTANCE_IP || null,
    clusterInstanceIpFamily: process.env.SCC_INSTANCE_IP_FAMILY || null,
    clusterStateServerConnectTimeout: Number(process.env.SCC_STATE_SERVER_CONNECT_TIMEOUT) || null,
    clusterStateServerAckTimeout: Number(process.env.SCC_STATE_SERVER_ACK_TIMEOUT) || null,
    clusterStateServerReconnectRandomness: Number(process.env.SCC_STATE_SERVER_RECONNECT_RANDOMNESS) || null,
    crashWorkerOnError: argv['auto-reboot'] != false,
    // If using nodemon, set this to true, and make sure that environment is 'dev'.
    killMasterOnSignal: false,
    environment
};

const bootTimeout = Number(process.env.SOCKETCLUSTER_CONTROLLER_BOOT_TIMEOUT) || 10000;
let SOCKETCLUSTER_OPTIONS;

if (process.env.SOCKETCLUSTER_OPTIONS) {
    SOCKETCLUSTER_OPTIONS = JSON.parse(process.env.SOCKETCLUSTER_OPTIONS);
}

for (var i in SOCKETCLUSTER_OPTIONS) {
    if (SOCKETCLUSTER_OPTIONS.hasOwnProperty(i)) {
        options[i] = SOCKETCLUSTER_OPTIONS[i];
    }
}

const start = function() {
    const socketCluster = new SocketCluster(options);

    socketCluster.on(socketCluster.EVENT_WORKER_CLUSTER_START, workerClusterInfo => {
        Log.info('   >> WorkerCluster PID:', workerClusterInfo.pid);
    });

    if (socketCluster.options.environment === 'dev') {
        // This will cause SC workers to reboot when code changes anywhere in the app directory.
        // The second options argument here is passed directly to chokidar.
        // See https://github.com/paulmillr/chokidar#api for details.
        Log.info(`   !! The sc-hot-reboot plugin is watching for code changes in the ${__dirname} directory`);
        scHotReboot.attach(socketCluster, {
            cwd: __dirname,
            ignored: [
                'public',
                'node_modules',
                'README.md',
                'Dockerfile',
                'server.js',
                'broker.js',
                /[/\\]\./,
                '*.log'
            ]
        });
    }
};

const bootCheckInterval = Number(process.env.SOCKETCLUSTER_BOOT_CHECK_INTERVAL) || 200;
const bootStartTime = Date.now();

// Detect when Docker volumes are ready.
const startWhenFileIsReady = filePath => {
    const errorMessage = `Failed to locate a controller file at path ${filePath} before boot timeout`;
    return waitForFile(filePath, bootCheckInterval, bootStartTime, bootTimeout, errorMessage);
};

Promise
    .all([
        startWhenFileIsReady(workerControllerPath),
        startWhenFileIsReady(brokerControllerPath),
        startWhenFileIsReady(workerClusterControllerPath)
    ])
    .then(() => start())
    .catch(err => {
        Log.error(err.message, err.stack);
        process.exit(1);
    });
