const winston = require('winston');

const Log = new winston.createLogger({
  transports: [
    new (winston.transports.File)({
      filename: '/var/log/vue-rethinkdb.log',
      level: 'info',
      timestamp: true,
      json: false,
      prettyPrint: false,
      maxsize: 100000000,
      maxFiles: 1
    }),
    new winston.transports.Console({
      level: 'debug',
      handleExceptions: true,
      humanReadableUnhandledException: true,
      timestamp: () => (new Date()).toISOString(),
      colorize: true
    })
  ]
});

module.exports = Log;
