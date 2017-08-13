# Test Report

## PhantomJS 2.1.1 (Mac OS X 0.0.0)

### Collections

should render values correctly   <span style="color:green">✓</span>. `(3122ms)`

```js
function (done) {
        // FIXME: These tests need to be written
        this.timeout(10000);

        var Constructor = _vue2.default.extend(_Collection2.default);
        var vm = new Constructor().$mount();

        expect(vm.$el.querySelector('span').textContent).to.equal('');

        vm.$watch('record', function () {
            _vue2.default.nextTick(function () {
                expect(vm.$el.querySelector('span').textContent).to.equal('Site Hosting');
                done();
            });
        });
    }
```


### Indexed Collections

should render values correctly   <span style="color:green">✓</span>. `(671ms)`

```js
function (done) {
        // FIXME: These tests need to be written
        this.timeout(10000);

        var Constructor = _vue2.default.extend(_IndexedCollection2.default);
        var vm = new Constructor().$mount();

        expect(vm.$el.querySelector('span').textContent).to.equal('');

        vm.$watch('record', function () {
            _vue2.default.nextTick(function () {
                expect(vm.$el.querySelector('span').textContent).to.equal('Site Hosting');
                done();
            });
        });
    }
```


### Values

should render values correctly   <span style="color:green">✓</span>. `(2366ms)`

```js
function (done) {
        this.timeout(10000);

        var Constructor = _vue2.default.extend(_Value2.default);
        var vm = new Constructor().$mount();

        expect(vm.$el.querySelector('span').textContent).to.equal('');

        vm.$watch('record', function () {
            _vue2.default.nextTick(function () {
                expect(vm.$el.querySelector('span').textContent).to.equal('Site Hosting');
                done();
            });
        });
    }
```

