import ReconnectingWebSocket from 'reconnecting-websocket';

const RethinkDB = {
    rws: null,
    nextCid: 1,
    nextQueryId: 1,

    queries: {},
    requests: {},

    options: {
        url: 'ws://localhost:8000/socketcluster',
        log: console,
    },

    authToken: null,

    install(Vue, options) {
        Object.assign(RethinkDB.options, options || {}, RethinkDB.options);
        RethinkDB.options.log.debug('RethinkDB: Starting driver', options);

        Vue.mixin({
            created() {
                const vm = this;

                const configCallback = (vm.$options || {}).rethinkDB;
                if (!configCallback) {
                    return;
                }

                const config = configCallback.call(this);
                vm.$rethinkQueries = Object.keys(config)
                    .map(field => RethinkDB.registerField(Vue, vm, field, config[field]));
            },

            beforeDestroy() {
                RethinkDB.unsubscribeAll(this);
            }
        });

        RethinkDB.rws = new ReconnectingWebSocket(RethinkDB.options.url);

        RethinkDB.rws.addEventListener('open', () => {
            RethinkDB.options.log.debug('RethinkDB: Connection established, sending handshake...');
            RethinkDB.emitAck('#handshake')
                .then(() => RethinkDB.authenticate())
                .then(() => RethinkDB.subscribeAll())
                .catch(e => RethinkDB.options.log.error('RethinkDB: Handshake failed', e));
        });

        RethinkDB.rws.addEventListener('message', message => {
            // "#1" messages are heartbeats. We just process them silently with no further propagation
            if (message.data === '#1') {
                RethinkDB.rws.send('#2');
                return;
            }

            const data = JSON.parse(message.data);

            // emitAck requests go directly to their callers
            const request = RethinkDB.requests[data.rid];
            if (request) {
                request.resolve(data.data);
                delete RethinkDB.requests[data.rid];
                return;
            }

            // Query responses get processed and stored
            if (data.event === 'queryResponse') {
                RethinkDB.processQueryResponse(data.data);
                return;
            }

            // Everything else is an error
            RethinkDB.options.log.error('RethinkDB: Unhandled WebSocket message', data);
        });

        setInterval(() => {
            const now = Date.now();
            Object.keys(RethinkDB.requests).forEach(cid => {
                const request = RethinkDB.requests[cid];
                if (now > request.timestamp + 3000) {
                    RethinkDB.options.log.error('Expired request', request.cid);
                    delete RethinkDB.requests[cid];
                    request.reject(new Error('Timed out'));
                }
            });
        }, 1000);
    },

    registerField(Vue, vm, field, config) {
        // TODO: Would it make more sense to just annotate the config with these elements, instead of copying it?
        const query = {
            queryId: RethinkDB.nextQueryId++,
            vm,
            field,
            query: config.query || config.collection,
            params: config.params || {},
            state: 'initializing',
            onStateChanged: config.onStateChanged || null,
            onValueChanged: config.onValueChanged || null,
            onEntryAdded: config.onEntryAdded || null,
            onEntryUpdated: config.onEntryUpdated || null,
            onEntryMoved: config.onEntryMoved || null,
            onEntryDeleted: config.onEntryDeleted || null,
        };

        RethinkDB.options.log.debug('RethinkDB: Registering field ' + field, { config, query });

        let element;

        if (config.value) {
            query.type = 'value';
            element = {};
        } else if (config.collection) {
            query.type = 'collection';
            element = [];
        } else {
            throw new Error('Invalid query type for ' + field + ': must be value or collection.');
        }

        if (field in vm) {
            vm[field] = element;
        } else {
            Vue.util.defineReactive(vm, field, element);
        }

        RethinkDB.queries[query.queryId] = query;
        RethinkDB.subscribe(query);

        return query;
    },

    subscribeAll() {
        RethinkDB.options.log.debug('RethinkDB: Subscribing to all');
        Object.keys(RethinkDB.queries).forEach(queryId =>
            RethinkDB.subscribe(RethinkDB.queries[queryId]));

        return Promise.resolve(true);
    },

    subscribe(query) {
        RethinkDB.options.log.debug('RethinkDB: Subscribing to query', query);
        if (RethinkDB.rws.readyState === WebSocket.OPEN) {
            RethinkDB.emit('subscribeQuery', { queryId: query.queryId, query: query.query, params: query.params });
        }
    },

    unsubscribeAll(vm) {
        RethinkDB.options.log.debug('RethinkDB: Unsubscribing from all');
        if (vm.$rethinkQueries) {
            vm.$rethinkQueries.forEach(RethinkDB.unsubscribe);
            vm.$rethinkQueries.length = 0;
        }
    },

    unsubscribe(query) {
        RethinkDB.options.log.debug('RethinkDB: Unsubscribing from query', query);
        if (query.type === 'collection') {
            query.vm[query.field].length = 0;
        } else if (query.type === 'value') {
            query.vm[query.field] = {};
        }

        delete RethinkDB.queries[query.queryId];
        RethinkDB.emit('unsubscribeQuery', { queryId: query.queryId });
    },

    processQueryResponse(response) {
        const query = RethinkDB.queries[response.queryId];
        if (!query) {
            RethinkDB.options.log.error('RethinkDB: Ignoring query response for unknown queryId', response.change);
            return;
        }

        if (query.type === 'value') {
            RethinkDB.processValueResponse(query, response.change);
        } else {
            RethinkDB.processCollectionResponse(query, response.change);
        }
    },

    processValueResponse(query, response) {
        RethinkDB.options.log.debug('RethinkDB: Processing value response');
        if (response.type === 'state') {
            query.state = response.state;
            RethinkDB.options.log.debug('RethinkDB: Query ' + query.queryId + ' new state: ' + query.state);
            if (query.onStateChanged) {
                query.onStateChanged.call(query.vm, query.state);
            }
        } else if (response.new_val) {
            query.vm[query.field] = response.new_val;
            RethinkDB.options.log.debug('RethinkDB: Query ' + query.queryId + ' new value: ' + query.new_val);
            if (query.onValueChanged) {
                query.onValueChanged.call(query.vm, query.state, response.new_val);
            }
        }
    },

    processCollectionResponse(query, response) {
        // @credit https://github.com/rethinkdb/horizon/blob/next/client/src/ast.js#L185-L249
        switch (response.type) {
            case 'remove':
            case 'uninitial': {
                // Remove old values from the array
                if (response.old_offset != null) {
                    const removed = query.vm[query.field].splice(response.old_offset, 1);
                    if (query.onEntryDeleted) {
                        query.onEntryDeleted.call(query.vm, query.state, removed[0], response.old_offset);
                    }
                } else {
                    const index = query.vm[query.field].findIndex(x => x.id === response.old_val.id);
                    if (index === -1) {
                        // Programming error. This should not happen
                        throw new Error('Unable to apply change: ' + JSON.stringify(response));
                    }

                    const removed = query.vm[query.field].splice(index, 1);
                    if (query.onEntryDeleted) {
                        query.onEntryDeleted.call(query.vm, query.state, removed[0], index);
                    }
                }

                break;
            }

            case 'add':
            case 'initial': {
                // Add new values to the array
                if (response.new_offset != null) {
                    // If we have an offset, put it in the correct location
                    query.vm[query.field].splice(response.new_offset, 0, response.new_val);
                    if (query.onEntryAdded) {
                        query.onEntryAdded.call(query.vm, query.state, response.new_val, response.new_offset);
                    }
                } else {
                    // otherwise for unordered results, push it on the end
                    query.vm[query.field].push(response.new_val);
                    if (query.onEntryAdded) {
                        query.onEntryAdded.call(query.vm, query.state, response.new_val,
                            query.vm[query.field].length - 1);
                    }
                }

                break;
            }

            case 'change': {
                // Modify in place if a change is happening
                if (response.old_offset != null) {
                    // Remove the old document from the results
                    query.vm[query.field].splice(response.old_offset, 1);
                }
                if (response.new_offset != null) {
                    // Splice in the new val if we have an offset
                    query.vm[query.field].splice(response.new_offset, 0, response.new_val);
                    if (query.onEntryUpdated) {
                        query.onEntryUpdated.call(query.vm, query.state, response.new_val, response.new_offset);
                    }
                } else {
                    // If we don't have an offset, find the old val and
                    // replace it with the new val
                    const index = query.vm[query.field].findIndex(x => x.id === response.old_val.id);
                    if (index === -1) {
                        // indicates a programming bug. The server gives us the
                        // ordering, so if we don't find the id it means something is
                        // buggy.
                        throw new Error('Unable to apply change: ' + JSON.stringify(response));
                    }
                    query.vm[query.field][index] = response.new_val;
                    if (query.onEntryUpdated) {
                        query.onEntryUpdated.call(query.vm, query.state, response.new_val, index);
                    }
                }

                break;
            }

            case 'state':
                query.state = response.state;
                if (query.onStateChanged) {
                    query.onStateChanged.call(query.vm, query.state);
                }
                break;

            default:
                throw new Error('Unrecognized "type" field from server: ' + JSON.stringify(response));
        }
    },

    /**
     * Authenticate to the server. If we are not yet connected (or if we need to reconnect), the auth token will be
     * saved for future use.
     *
     * @param {String} [authToken] - Optional authentication token, typically a JWT (but may be changed server-side).
     *   Set to null to disable authentication for future connection requests.
     */
    authenticate(authToken) {
        if (authToken || authToken === null) {
            RethinkDB.options.log.debug('RethinkDB: Storing auth token');
            RethinkDB.authToken = authToken;
        }

        if (RethinkDB.authToken && RethinkDB.rws && RethinkDB.rws.readyState === WebSocket.OPEN) {
            RethinkDB.options.log.debug('RethinkDB: Authenticating...');
            RethinkDB.emitAck('auth', { authToken: RethinkDB.authToken })
                .then(r => RethinkDB.options.log.log('Authenticated', r))
                .catch(e => RethinkDB.options.log.error('Authentication error', e));
        } else {
            RethinkDB.options.log.debug('RethinkDB: Skipping authentication');
        }
    },

    /**
     * Send a message to the server.
     *
     * @param {String} event - The event to send.
     * @param {Object} [data] - Optional additional data to send as a parameter.
     */
    emit(event, data) {
        if (RethinkDB.rws.readyState !== WebSocket.OPEN) {
            return;
        }

        const message = {
            cid: RethinkDB.nextCid++,
            event,
            data: data || {},
        };

        RethinkDB.rws.send(JSON.stringify(message));
    },

    /**
     * Send a message to the server, returning a Promise that will be resolved with the server's response, or rejected
     * if the request times out.
     *
     * @param {String} event - The event to send.
     * @param {Object} [data] - Optional additional data to send as a parameter.
     */
    emitAck(event, data) {
        if (RethinkDB.rws.readyState !== WebSocket.OPEN) {
            return Promise.reject(new Error('Not connected.'));
        }

        const request = {};
        const cid = RethinkDB.nextCid++;

        const promise = new Promise((resolve, reject) => {
            request.resolve = resolve;
            request.reject = reject;
            request.timestamp = Date.now();
            RethinkDB.requests[cid] = request;
        });

        const message = {
            cid,
            event,
            data: data || {},
        };

        RethinkDB.rws.send(JSON.stringify(message));

        return promise;
    },
};

export default RethinkDB;
