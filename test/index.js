// Polyfills for PhantomJS
import bind from 'function-bind';
import objectAssign from 'object-assign';

import Vue from 'vue';

import * as firebase from 'firebase';
import firebaseConfig from './firebase.json';

import VueFirebaseData from '../src';

firebase.initializeApp(firebaseConfig);
Vue.use(VueFirebaseData);

/* eslint-disable no-extend-native */
Function.prototype.bind = bind;
Object.assign = objectAssign;

// require all src files for coverage.
// you can also change this to match only the subset of files that
// you want coverage for.
const srcContext = require.context('../src', true, /^\.\/(?!index(\.js)?$)/);
srcContext.keys().forEach(srcContext);

// Use a div to insert elements
before(function() {
    const el = document.createElement('DIV');
    el.id = 'tests';
    document.body.appendChild(el);
});

// Remove every test html scenario
afterEach(function() {
    const el = document.getElementById('tests');
    for (let i = 0; i < el.children.length; ++i) {
        el.removeChild(el.children[i]);
    }
});

const specsContext = require.context('./specs', true, /\.js$/);
specsContext.keys().forEach(specsContext);
