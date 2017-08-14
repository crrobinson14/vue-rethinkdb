import Vue from 'vue';
import IndexedCollection from './IndexedCollection.vue';

describe('Indexed Collections', function() {
    it('should render collections correctly', function(done) {
        this.timeout(10000);

        const Constructor = Vue.extend(IndexedCollection);
        const vm = new Constructor().$mount();

        expect(vm.$el.textContent).to.equal('');

        vm.$watch('collection2', function() {
            Vue.nextTick(function() {
                expect(vm.$el.textContent).to.equal('123 - Test 123789 - Test 789');
                vm.$destroy();
                done();
            });
        });
    });
});
