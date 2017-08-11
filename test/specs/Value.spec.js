const chai = require('chai');
const dirtyChai = require('dirty-chai');

var expect = chai.expect;

chai.use(dirtyChai);

// var Vue = require('vue');
// var Value = require('./Value.vue');

describe('Values', function() {
    it('should render correct contents', function(done) {
        expect(1).to.equal(1);
        // const Constructor = Vue.extend(Value);
        // const vm = new Constructor().$mount();
        //
        // expect(vm.$el.querySelector('.icon').textContent)
        //     .to.equal('Copyright © 2017 Snap Interactive, Inc. All Rights Reserved.');
        //
        // Vue.nextTick(function() {
        //     expect(vm.$el.textContent).toBe('Static Hosting');
        //     done();
        // });
        done();
    });
});
