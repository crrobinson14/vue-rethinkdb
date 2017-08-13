var Vue;

// Create or set a reactive field in a vm.
function defineReactive(vm, key, val) {
    if (key in vm) {
        vm[key] = val;
    } else {
        Vue.util.defineReactive(vm, key, val);
    }
}

// Create a record that tracks a single value
function createValueRecord(snapshot) {
    var record = snapshot.val();

    // Has to come first. Null is an object!
    if (record === null) {
        record = { value: {} };
    } else if (typeof record !== 'object') {
        record = { value: record };
    }

    record.$$key = snapshot.key;
    record.$$ref = snapshot.ref;

    return record;
}

// Create a record that tracks a single value
function createIndexRecord(snapshot) {
    var record = {};
    record.$$index = snapshot.val();
    record.$$key = snapshot.key;
    record.$$ref = snapshot.ref;
    record.value = {};
    return record;
}

// Find the index for an object with given key
function indexForKey(array, key) {
    var i;

    for (i = 0; i < array.length; i++) {
        if (array[i].$$key === key) {
            return i;
        }
    }

    return -1;
}

/**
 * Bind a firebase data source to a key on a vm as an Array.
 *
 * @param {Vue} vm
 * @param {Object} vm.$firebaseListeners
 * @param {string} key
 * @param {object} source
 */
function bindAsArray(vm, key, source) {
    var array = [];
    defineReactive(vm, key, array);

    source.array.on('child_added', function(snapshot, prevKey) {
        var index = prevKey ? indexForKey(array, prevKey) + 1 : 0;
        var entry = createValueRecord(snapshot);
        array.splice(index, 0, entry);

        if (source.onChildAdded) {
            source.onChildAdded(array, entry, prevKey);
        }
    });

    source.array.on('child_removed', function(snapshot) {
        var index = indexForKey(array, snapshot.key);
        array.splice(index, 1);
    });

    source.array.on('child_changed', function(snapshot) {
        var index = indexForKey(array, snapshot.key);
        array.splice(index, 1, createValueRecord(snapshot));
    });

    source.array.on('child_moved', function(snapshot, prevKey) {
        var index = indexForKey(array, snapshot.key);
        var record = array.splice(index, 1)[0];
        var newIndex = prevKey ? indexForKey(array, prevKey) + 1 : 0;
        array.splice(newIndex, 0, record);
    });

    if (source.onValue) {
        source.array.value.on('value', function(snapshot) {
            source.onValue.call(vm, snapshot);
        });
    }

    return array;
}

/**
 * Bind a firebase data source to a key on a vm as an Array.
 *
 * @param {Vue} vm
 * @param {Object} vm.$firebaseListeners
 * @param {string} key
 * @param {object} source
 */
function bindAsIndexedArray(vm, key, source) {
    var indexArray = [];
    defineReactive(vm, key, indexArray);

    source.indexArray.on('child_added', function(indexSnapshot, prevKey) {
        var index = prevKey ? indexForKey(indexArray, prevKey) + 1 : 0;
        var indexRecord = createIndexRecord(indexSnapshot);
        var valueSource;
        indexArray.splice(index, 0, indexRecord);

        valueSource = source.valueLookup.call(vm, indexSnapshot);
        valueSource.on('value', function(snapshot) {
            indexRecord.value = snapshot.val();
            indexRecord.$$valueKey = snapshot.key;
            indexRecord.$$valueRef = snapshot.ref;

            if (source.onChildAdded) {
                source.onChildAdded(indexArray, indexRecord, prevKey);
            }
        });

        vm.$firebaseSources.push(valueSource);
    });

    // TODO: We memleak here until the collection is destroyed because we don't clean up the listener
    // even though we could here.
    source.indexArray.on('child_removed', function(snapshot) {
        var index = indexForKey(indexArray, snapshot.key);
        indexArray.splice(index, 1);
    });

    // TODO: We don't process this event yet, should we?
    // source.indexArray.on('child_changed', snapshot => {
    //     var index = indexForKey(indexArray, snapshot.key);
    //     indexArray.splice(index, 1, createIndexValueRecord(snapshot));
    // });

    source.indexArray.on('child_moved', function(snapshot, prevKey) {
        var index = indexForKey(indexArray, snapshot.key);
        var record = indexArray.splice(index, 1)[0];
        var newIndex = prevKey ? indexForKey(indexArray, prevKey) + 1 : 0;
        indexArray.splice(newIndex, 0, record);
    });

    vm.$firebaseSources.push(source.indexArray);
}

/**
 * Bind a data source to a key on a vm as a discrete value.
 *
 * @param {Vue} vm
 * @param {Object} vm.$firebaseSources
 * @param {string} key
 * @param {Object} source
 */
function bindAsValue(vm, key, source) {
    defineReactive(vm, key, {});

    source.value.on('value', function(snapshot) {
        vm[key] = createValueRecord(snapshot);

        if (source.onValue) {
            source.onValue.call(vm, snapshot);
        }
    });

    vm.$firebaseSources.push(source.value);
}

/**
 * Bind a firebase data source to a key on a vm.
 *
 * @param {Vue} vm
 * @param {string} fieldName
 * @param {object} source
 */
function bind(vm, fieldName, source) {
    if ('value' in source) {
        bindAsValue(vm, fieldName, source);
    } else if ('array' in source) {
        bindAsArray(vm, fieldName, source);
    } else if ('indexArray' in source && 'valueLookup' in source) {
        bindAsIndexedArray(vm, fieldName, source);
    } else {
        throw new Error('FirebaseDataProvider: Missing or invalid source for "' + fieldName + '"');
    }
}

module.exports = {
    install: function(_Vue) {
        Vue = _Vue;
        _Vue.mixin({
            created: function() {
                // We save a copy of these so we only ever call the definition mechanism once, if it's a function.
                var vm = this;
                var bindings = ((typeof vm.$options.firebaseData === 'function')
                    ? vm.$options.firebaseData.call(vm)
                    : vm.$options.firebaseData);

                if (bindings) {
                    vm.$firebaseBindings = bindings;
                    vm.$firebaseSources = [];
                    Object.keys(bindings).forEach(function(key) {
                        bind(vm, key, bindings[key]);
                    });
                }
            },

            beforeDestroy: function() {
                var vm = this;
                if (vm.$firebaseBindings) {
                    vm.$firebaseSources.forEach(function(listener) {
                        listener.off();
                    });

                    delete vm.$firebaseSources;
                    delete vm.$firebaseBindings;
                }
            }
        });
    }
};
