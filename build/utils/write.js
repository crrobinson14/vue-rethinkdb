const fs = require('fs');

const { blue } = require('./log.js');

function getSize(code) {
    return (code.length / 1024).toFixed(2) + 'kb';
}

function write(dest, code) {
    return new Promise((resolve, reject) => {
        fs.writeFile(dest, code, err => {
            if (err) {
                return reject(err);
            }
            // eslint-disable-next-line no-console
            console.log(blue(dest) + ' ' + getSize(code));
            return resolve(code);
        });
    });
}

module.exports = write;
