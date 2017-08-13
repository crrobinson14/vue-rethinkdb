import Vue from 'vue';
import IndexedCollection from '../components/IndexedCollection.vue';
import firebaseConfig from '../firebase.json';

const VueFirebaseData = require('../../src');
const firebase = require('firebase');
const chai = require('chai');
const dirtyChai = require('dirty-chai');

const expect = require('chai').expect;

chai.use(dirtyChai);

firebase.initializeApp(firebaseConfig);
Vue.use(VueFirebaseData);

describe('Indexed Collections', function() {
    it('should render values correctly', function(done) {
        // FIXME: These tests need to be written
        this.timeout(10000);

        const Constructor = Vue.extend(IndexedCollection);
        const vm = new Constructor().$mount();

        expect(vm.$el.querySelector('span').textContent).to.equal('');

        vm.$watch('record', function() {
            Vue.nextTick(function() {
                expect(vm.$el.querySelector('span').textContent).to.equal('Site Hosting');
                done();
            });
        });
    });
});
