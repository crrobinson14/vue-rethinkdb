const winston = require('winston');
// const Papertrail = require('winston-papertrail').Papertrail;

// To log to Papertrail, uncomment the require line above and config blocks below, configure them, then run
//   `npm install -S winston-papertrail`

const Log = new winston.Logger({
    transports: [
        new (winston.transports.File)({
            filename: '/var/log/bridge.log',
            level: 'info',
            timestamp: true,
            json: false,
            prettyPrint: false,
            maxsize: 100000000,
            maxFiles: 1
        }),
        // new winston.transports.Papertrail({
        //     host: 'logs###.papertrailapp.com',
        //     port: #####,
        //     colorize: true,
        //     inlineMeta: true,
        //     program: 'bridge'
        // }),
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            humanReadableUnhandledException: true,
            timestamp: () => new Date(),
            colorize: true
        })
    ]
});

module.exports = Log;

