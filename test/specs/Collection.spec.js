import Vue from 'vue';
import Collection from './Collection.vue';

describe('Collections', function() {
    it('should render collections correctly', function(done) {
        this.timeout(10000);

        const Constructor = Vue.extend(Collection);
        const vm = new Constructor().$mount();

        expect(vm.$el.textContent).to.equal('');

        vm.$watch('collection1', function() {
            Vue.nextTick(function() {
                expect(vm.$el.textContent.indexOf('456 - Test 456')).to.be.above(1);
                vm.$destroy();
                done();
            });
        });
    });
});
