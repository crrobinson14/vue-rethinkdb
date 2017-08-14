import Vue from 'vue';
import Value from './Value.vue';

describe('Values', function() {
    it('should render values correctly', function(done) {
        this.timeout(10000);

        const Constructor = Vue.extend(Value);
        const vm = new Constructor().$mount();

        expect(vm.$el.querySelector('.number').textContent).to.equal('');
        expect(vm.$el.querySelector('.string').textContent).to.equal('');
        expect(vm.$el.querySelector('.bool').textContent).to.equal('');
        expect(vm.$el.querySelector('.object').textContent).to.equal('');
        expect(vm.$el.querySelector('.null').textContent).to.equal('');

        vm.$watch('valueCallbacks', function() {
            if (vm.valueCallbacks >= 4) {
                Vue.nextTick(function() {
                    expect(vm.$el.querySelector('.number').textContent).to.equal('1');
                    expect(vm.$el.querySelector('.string').textContent).to.equal('string');
                    expect(vm.$el.querySelector('.bool').textContent).to.equal('true');
                    expect(vm.$el.querySelector('.object').textContent).to.equal('value');
                    expect(vm.$el.querySelector('.null').textContent).to.equal('');
                    expect(vm.valueCallbacks).to.equal(4);
                    vm.$destroy();
                    done();
                });
            }
        });
    });

    // TODO: Add tests for missing required parameters
});
