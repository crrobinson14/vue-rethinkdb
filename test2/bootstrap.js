var chai = require('chai');
var dirtyChai = require('dirty-chai');
var firebase = require('firebase');
var jsdom = require('mocha-jsdom');
var firebaseConfig = require('./firebase.json');

firebase.initializeApp(firebaseConfig);
chai.use(dirtyChai);

global.bootstrap = {
    init: function(done) {
        jsdom();
        global.expect = chai.expect;
        done();
    },

    teardown: function(done) {
        delete global.expect;
        done();
    }
};
