var Vue = require('vue/dist/vue.common');
var firebase = require('firebase');

var ValueComponent = Vue.component('value-test', {
    template: '<span>{{ val }}</span>',
    data: function() {
        return {};
    },
    firebaseData: function() {
        return { val: { value: firebase.database().ref('/services/hosting/name') } };
    },
});

describe('Values', function() {
    it('should be able to look up individual values', function(done) {
        var vm = new Vue(ValueComponent).$mount();

        Vue.nextTick(function() {
            expect(vm.$el.textContent).toBe('Static Hosting');
            done();
        });

        // expect(vm.$el.textContent).toBe('Static Hosting');
        done();
    });
});
