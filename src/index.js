let Vue;

// Create or set a reactive field in a vm.
const defineReactive = (vm, key, val) => {
    if (key in vm) {
        vm[key] = val;
    } else {
        Vue.util.defineReactive(vm, key, val);
    }
};

// Create a record that tracks a single value
function createValueRecord(snapshot) {
    let record = snapshot.val();

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
    const record = {};
    record.$$index = snapshot.val();
    record.$$key = snapshot.key;
    record.$$ref = snapshot.ref;
    record.$$ready = false;
    record.value = {};
    return record;
}

// Find the index for an object with given key
function indexForKey(array, key) {
    for (let i = 0; i < array.length; i++) {
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
function bindAsCollection(vm, key, source) {
    const array = [];
    defineReactive(vm, key, array);

    source.collection.on('child_added', (snapshot, prevKey) => {
        const index = prevKey ? indexForKey(array, prevKey) + 1 : 0;
        const entry = createValueRecord(snapshot);
        array.splice(index, 0, entry);

        if (source.onChildAdded) {
            source.onChildAdded.call(vm, array, index, entry);
        }
    });

    source.collection.on('child_removed', snapshot => {
        const index = indexForKey(array, snapshot.key);
        const entry = array.splice(index, 1);

        if (source.onChildRemoved) {
            source.onChildRemoved.call(vm, array, index, entry);
        }
    });

    source.collection.on('child_changed', snapshot => {
        const index = indexForKey(array, snapshot.key);
        const oldValue = array[index];
        const newValue = createValueRecord(snapshot);
        array.splice(index, 1, newValue);

        if (source.onChildChanged) {
            source.onChildChanged.call(vm, array, index, oldValue, newValue);
        }
    });

    source.collection.on('child_moved', (snapshot, prevKey) => {
        const oldIndex = indexForKey(array, snapshot.key);
        const entry = array.splice(oldIndex, 1)[0];
        const newIndex = prevKey ? indexForKey(array, prevKey) + 1 : 0;
        array.splice(newIndex, 0, entry);

        if (source.onChildMoved) {
            source.onChildMoved.call(vm, array, oldIndex, newIndex, entry);
        }
    });

    if (source.onValue) {
        source.collection.value.on('value', snapshot => source.onValue.call(vm, snapshot));
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
function bindAsIndexedCollection(vm, key, source) {
    var indexArray = [];
    defineReactive(vm, key, indexArray);

    source.indexedCollection.on('child_added', (indexSnapshot, prevKey) => {
        const index = prevKey ? indexForKey(indexArray, prevKey) + 1 : 0;
        const entry = createIndexRecord(indexSnapshot);
        indexArray.splice(index, 0, entry);

        const valueSource = source.valueLookup.call(vm, indexSnapshot);
        valueSource.on('value', snapshot => {
            entry.value = snapshot.val();
            entry.$$ready = true;
            entry.$$valueKey = snapshot.key;
            entry.$$valueRef = snapshot.ref;

            if (source.onChildAdded) {
                source.onChildAdded.call(vm, indexArray, index, entry);
            }
        });

        vm.$firebaseSources.push(valueSource);
    });

    // TODO: Minor memleak. The listener is not cleaned up until the entire collection is destroyed.
    source.indexedCollection.on('child_removed', snapshot => {
        const index = indexForKey(indexArray, snapshot.key);
        const entry = indexArray.splice(index, 1);

        if (source.onChildRemoved) {
            source.onChildRemoved.call(vm, indexArray, index, entry);
        }
    });

    // TODO: Add processing for childChanged for indexedCollection bindings.
    // source.indexArray.on('child_changed', snapshot => {
    //     var index = indexForKey(indexArray, snapshot.key);
    //     indexArray.splice(index, 1, createIndexValueRecord(snapshot));
    // });

    source.indexedCollection.on('child_moved', (snapshot, prevKey) => {
        const oldIndex = indexForKey(indexArray, snapshot.key);
        const entry = indexArray.splice(oldIndex, 1)[0];
        const newIndex = prevKey ? indexForKey(indexArray, prevKey) + 1 : 0;
        indexArray.splice(newIndex, 0, entry);

        if (source.onChildMoved) {
            source.onChildMoved.call(vm, indexArray, oldIndex, newIndex, entry);
        }
    });

    vm.$firebaseSources.push(source.indexedCollection);
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
    // TODO: If we're the "third query" in a chain, sort out some kind of way we can watch what we're bound to.
    // For example, assume an indexedCollection query of services -> apiKeys for each service. If we then want to
    // look up createdBy in the users collection, at the time we go to do that, apiKey is still being retrieved.
    // But we've already stuck the record in the index - we had to, to get the sort ordering correct from Firebase
    // (which uses array.splice and so on, with fixed position indices - you have to process them in the order the
    // messages arrive for the ordering to work). That means our template has likely fired off any child components
    // required for the rendering. If those child components require data (e.g. a userId) from the second (value)
    // query, it will be undefined at the moment they're mounted - which is when firebaseData will ask them for their
    // queries. We need some way for that third component to know what data it cares about and refresh its firebase
    // queries somehow.
    if ('value' in source) {
        bindAsValue(vm, fieldName, source);
    } else if ('collection' in source) {
        bindAsCollection(vm, fieldName, source);
    } else if ('indexedCollection' in source && 'valueLookup' in source) {
        bindAsIndexedCollection(vm, fieldName, source);
    } else {
        throw new Error('FirebaseDataProvider: Missing or invalid source for "' + fieldName + '"');
    }
}

const apiUserRef = (api, userId) => firebase.database().ref(`api-requests/${api}/${userId}`);
const responseRef = (api, userId, requestId) => firebase.database().ref(`api-responses/${api}/${userId}/${requestId}`);
const standardFBHandler = promise => promise.then(() => {}).catch(e => Vue.$log.error(e));

const VueFirebaseApi = {
    /**
     * Submit a request to an API endpoint. Returns a promise that will fulfill/reject with the server's response.
     * This is NOT a live reference - only one response will ever be returned. It is up to the client application to
     * implement any timeout functionality, if desired.
     * TODO: Add support for timeouts in requests.
     *
     * @param {string} api - The API to call
     * @param {string} userId - Our user ID
     * @param {object} params - Parameters to include in the call
     * @param {object} [timeout] - Optional. Defaults to 5000. Timeout in milliseconds for the request.
     * @returns {Promise}
     */
    request(api, userId, params, timeout) {
        const requestRef = apiUserRef(api, userId).push();
        const requestId = requestRef.key;
        const createdOn = Date.now();
        const request = Object.assign({ requestId, createdOn, userId }, params);
        const waitFor = +timeout || 5000;

        standardFBHandler(requestRef.set(request));

        const pendingResponse = responseRef(api, userId, requestId);
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                pendingResponse.off();
                standardFBHandler(requestRef.ref.remove());
                reject(new Error(`No response from server within timeout (${waitFor}).`));
            }, waitFor);

            pendingResponse.on('value', snapshot => {
                // We (almost) always get at least one callback with snapshot=null.
                if (snapshot && snapshot.val() !== null) {
                    clearTimeout(timer);
                    pendingResponse.off();
                    resolve(snapshot);
                }
            }, () => {
                clearTimeout(timer);
                pendingResponse.off();
            });
        });
    },
};

const VueFirebaseData = {
    install: function(_Vue) {
        Vue = _Vue;
        _Vue.mixin({
            created: function() {
                const bindings = ((typeof this.$options.firebaseData === 'function')
                    ? this.$options.firebaseData.call(this)
                    : this.$options.firebaseData);

                if (bindings) {
                    this.$firebaseBindings = bindings;
                    this.$firebaseSources = [];
                    Object.keys(bindings)
                        .forEach(key => bind(this, key, bindings[key]));
                }

                // eslint-disable-next-line no-multi-assign
                _Vue.$firebaseApi = _Vue.prototype.$firebaseApi = VueFirebaseApi;
            },

            beforeDestroy: function() {
                const vm = this;
                if (vm.$firebaseBindings) {
                    vm.$firebaseSources.forEach(listener => listener.off());

                    delete vm.$firebaseSources;
                    delete vm.$firebaseBindings;
                }
            }
        });
    }
};

export default VueFirebaseData;
