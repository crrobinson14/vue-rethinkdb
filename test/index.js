import Vue from 'vue';
// var Vue = require('vue');

// Vue.config.productionTip = false;
import firebaseConfig from './firebase.json';

const VueFirebaseData = require('../src');
const firebase = require('firebase');
const chai = require('chai');
const dirtyChai = require('dirty-chai');

chai.use(dirtyChai);

firebase.initializeApp(firebaseConfig);
Vue.use(VueFirebaseData);

// require all test files (files that ends with .spec.js)
const testsContext = require.context('./specs', true, /\.spec.js$/);
testsContext.keys().forEach(testsContext);

// require all src files except main.js for coverage.
// you can also change this to match only the subset of files that
// you want coverage for.
const srcContext = require.context('../src', true, /\.js$/);
// const srcContext = require.context('../src', true, /^\.\/(?!index(\.js)?$)/);
srcContext.keys().forEach(srcContext);
