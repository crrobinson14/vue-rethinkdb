# Test Report

## PhantomJS 2.1.1 (Mac OS X 0.0.0)

### Collections

should render collections correctly   <span style="color:green">✓</span>. `(638ms)`

```js
function (done) {
        this.timeout(10000);

        var Constructor = _vue2.default.extend(_Collection2.default);
        var vm = new Constructor().$mount();

        expect(vm.$el.textContent).to.equal('');

        vm.$watch('collection1', function () {
            _vue2.default.nextTick(function () {
                expect(vm.$el.textContent.indexOf('456 - Test 456')).to.be.above(1);
                vm.$destroy();
                done();
            });
        });
    }
```


### Indexed Collections

should render collections correctly   <span style="color:green">✓</span>. `(156ms)`

```js
function (done) {
        cov_phus6uzfa.f[1]++;
        cov_phus6uzfa.s[2]++;

        this.timeout(10000);

        var Constructor = (cov_phus6uzfa.s[3]++, _vue2.default.extend(_IndexedCollection2.default));
        var vm = (cov_phus6uzfa.s[4]++, new Constructor().$mount());

        cov_phus6uzfa.s[5]++;
        expect(vm.$el.textContent).to.equal('');

        cov_phus6uzfa.s[6]++;
        vm.$watch('collection2', function () {
            cov_phus6uzfa.f[2]++;
            cov_phus6uzfa.s[7]++;

            _vue2.default.nextTick(function () {
                cov_phus6uzfa.f[3]++;
                cov_phus6uzfa.s[8]++;

                expect(vm.$el.textContent).to.equal('123 - Test 123789 - Test 789');
                cov_phus6uzfa.s[9]++;
                vm.$destroy();
                cov_phus6uzfa.s[10]++;
                done();
            });
        });
    }
```


### Values

should render values correctly   <span style="color:green">✓</span>. `(181ms)`

```js
function (done) {
        this.timeout(10000);

        var Constructor = _vue2.default.extend(_Value2.default);
        var vm = new Constructor().$mount();

        expect(vm.$el.querySelector('.number').textContent).to.equal('');
        expect(vm.$el.querySelector('.string').textContent).to.equal('');
        expect(vm.$el.querySelector('.bool').textContent).to.equal('');
        expect(vm.$el.querySelector('.object').textContent).to.equal('');
        expect(vm.$el.querySelector('.null').textContent).to.equal('');

        vm.$watch('valueCallbacks', function () {
            if (vm.valueCallbacks >= 4) {
                _vue2.default.nextTick(function () {
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
    }
```

