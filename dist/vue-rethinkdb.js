/*!
 * vue-rethinkdb v1.0.5
 * (c) 2018 Chad Robinson
 * Released under the MIT License.
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.VueRethinkdb = global.VueRethinkdb || {})));
}(this, (function (exports) { 'use strict';

var isWebSocket = function (constructor) {
    return constructor && constructor.CLOSING === 2;
};
var isGlobalWebSocket = function () {
    return typeof WebSocket !== 'undefined' && isWebSocket(WebSocket);
};
var getDefaultOptions = function () { return ({
    constructor: isGlobalWebSocket() ? WebSocket : null,
    maxReconnectionDelay: 10000,
    minReconnectionDelay: 1500,
    reconnectionDelayGrowFactor: 1.3,
    connectionTimeout: 4000,
    maxRetries: Infinity,
    debug: false,
}); };
var bypassProperty = function (src, dst, name) {
    Object.defineProperty(dst, name, {
        get: function () { return src[name]; },
        set: function (value) { src[name] = value; },
        enumerable: true,
        configurable: true,
    });
};
var initReconnectionDelay = function (config) {
    return (config.minReconnectionDelay + Math.random() * config.minReconnectionDelay);
};
var updateReconnectionDelay = function (config, previousDelay) {
    var newDelay = previousDelay * config.reconnectionDelayGrowFactor;
    return (newDelay > config.maxReconnectionDelay)
        ? config.maxReconnectionDelay
        : newDelay;
};
var LEVEL_0_EVENTS = ['onopen', 'onclose', 'onmessage', 'onerror'];
var reassignEventListeners = function (ws, oldWs, listeners) {
    Object.keys(listeners).forEach(function (type) {
        listeners[type].forEach(function (_a) {
            var listener = _a[0], options = _a[1];
            ws.addEventListener(type, listener, options);
        });
    });
    if (oldWs) {
        LEVEL_0_EVENTS.forEach(function (name) {
            ws[name] = oldWs[name];
        });
    }
};
var ReconnectingWebsocket = function (url, protocols, options) {
    var _this = this;
    if (options === void 0) { options = {}; }
    var ws;
    var connectingTimeout;
    var reconnectDelay = 0;
    var retriesCount = 0;
    var shouldRetry = true;
    var savedOnClose = null;
    var listeners = {};
    // require new to construct
    if (!(this instanceof ReconnectingWebsocket)) {
        throw new TypeError("Failed to construct 'ReconnectingWebSocket': Please use the 'new' operator");
    }
    // Set config. Not using `Object.assign` because of IE11
    var config = getDefaultOptions();
    Object.keys(config)
        .filter(function (key) { return options.hasOwnProperty(key); })
        .forEach(function (key) { return config[key] = options[key]; });
    if (!isWebSocket(config.constructor)) {
        throw new TypeError('Invalid WebSocket constructor. Set `options.constructor`');
    }
    var log = config.debug ? function () {
        var arguments$1 = arguments;

        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments$1[_i];
        }
        return console.log.apply(console, ['RWS:'].concat(params));
    } : function () { };
    /**
     * Not using dispatchEvent, otherwise we must use a DOM Event object
     * Deferred because we want to handle the close event before this
     */
    var emitError = function (code, msg) { return setTimeout(function () {
        var err = new Error(msg);
        err.code = code;
        if (Array.isArray(listeners.error)) {
            listeners.error.forEach(function (_a) {
                var fn = _a[0];
                return fn(err);
            });
        }
        if (ws.onerror) {
            ws.onerror(err);
        }
    }, 0); };
    var handleClose = function () {
        log('handleClose', { shouldRetry: shouldRetry });
        retriesCount++;
        log('retries count:', retriesCount);
        if (retriesCount > config.maxRetries) {
            emitError('EHOSTDOWN', 'Too many failed connection attempts');
            return;
        }
        if (!reconnectDelay) {
            reconnectDelay = initReconnectionDelay(config);
        }
        else {
            reconnectDelay = updateReconnectionDelay(config, reconnectDelay);
        }
        log('handleClose - reconnectDelay:', reconnectDelay);
        if (shouldRetry) {
            setTimeout(connect, reconnectDelay);
        }
    };
    var connect = function () {
        if (!shouldRetry) {
            return;
        }
        log('connect');
        var oldWs = ws;
        var wsUrl = (typeof url === 'function') ? url() : url;
        ws = new config.constructor(wsUrl, protocols);
        connectingTimeout = setTimeout(function () {
            log('timeout');
            ws.close();
            emitError('ETIMEDOUT', 'Connection timeout');
        }, config.connectionTimeout);
        log('bypass properties');
        for (var key in ws) {
            // @todo move to constant
            if (['addEventListener', 'removeEventListener', 'close', 'send'].indexOf(key) < 0) {
                bypassProperty(ws, _this, key);
            }
        }
        ws.addEventListener('open', function () {
            clearTimeout(connectingTimeout);
            log('open');
            reconnectDelay = initReconnectionDelay(config);
            log('reconnectDelay:', reconnectDelay);
            retriesCount = 0;
        });
        ws.addEventListener('close', handleClose);
        reassignEventListeners(ws, oldWs, listeners);
        // because when closing with fastClose=true, it is saved and set to null to avoid double calls
        ws.onclose = ws.onclose || savedOnClose;
        savedOnClose = null;
    };
    log('init');
    connect();
    this.close = function (code, reason, _a) {
        if (code === void 0) { code = 1000; }
        if (reason === void 0) { reason = ''; }
        var _b = _a === void 0 ? {} : _a, _c = _b.keepClosed, keepClosed = _c === void 0 ? false : _c, _d = _b.fastClose, fastClose = _d === void 0 ? true : _d, _e = _b.delay, delay = _e === void 0 ? 0 : _e;
        log('close - params:', { reason: reason, keepClosed: keepClosed, fastClose: fastClose, delay: delay, retriesCount: retriesCount, maxRetries: config.maxRetries });
        shouldRetry = !keepClosed && retriesCount <= config.maxRetries;
        if (delay) {
            reconnectDelay = delay;
        }
        ws.close(code, reason);
        if (fastClose) {
            var fakeCloseEvent_1 = {
                code: code,
                reason: reason,
                wasClean: true,
            };
            // execute close listeners soon with a fake closeEvent
            // and remove them from the WS instance so they
            // don't get fired on the real close.
            handleClose();
            ws.removeEventListener('close', handleClose);
            // run and remove level2
            if (Array.isArray(listeners.close)) {
                listeners.close.forEach(function (_a) {
                    var listener = _a[0], options = _a[1];
                    listener(fakeCloseEvent_1);
                    ws.removeEventListener('close', listener, options);
                });
            }
            // run and remove level0
            if (ws.onclose) {
                savedOnClose = ws.onclose;
                ws.onclose(fakeCloseEvent_1);
                ws.onclose = null;
            }
        }
    };
    this.send = function (data) {
        ws.send(data);
    };
    this.addEventListener = function (type, listener, options) {
        if (Array.isArray(listeners[type])) {
            if (!listeners[type].some(function (_a) {
                var l = _a[0];
                return l === listener;
            })) {
                listeners[type].push([listener, options]);
            }
        }
        else {
            listeners[type] = [[listener, options]];
        }
        ws.addEventListener(type, listener, options);
    };
    this.removeEventListener = function (type, listener, options) {
        if (Array.isArray(listeners[type])) {
            listeners[type] = listeners[type].filter(function (_a) {
                var l = _a[0];
                return l !== listener;
            });
        }
        ws.removeEventListener(type, listener, options);
    };
};
var dist = ReconnectingWebsocket;

var RethinkDB = {
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

    install: function install(Vue, options) {
        Object.assign(RethinkDB.options, options || {}, RethinkDB.options);
        RethinkDB.options.log.debug('RethinkDB: Starting driver', options);

        Vue.mixin({
            created: function created() {
                var vm = this;

                var configCallback = (vm.$options || {}).rethinkDB;
                if (!configCallback) {
                    return;
                }

                var config = configCallback.call(this);
                vm.$rethinkQueries = Object.keys(config)
                    .map(function (field) { return RethinkDB.registerField(Vue, vm, field, config[field]); });
            },

            beforeDestroy: function beforeDestroy() {
                RethinkDB.unsubscribeAll(this);
            }
        });

        RethinkDB.rws = new dist(RethinkDB.options.url);

        RethinkDB.rws.addEventListener('open', function () {
            RethinkDB.options.log.debug('RethinkDB: Connection established, sending handshake...');
            RethinkDB.emitAck('#handshake')
                .then(function () { return RethinkDB.authenticate(); })
                .then(function () { return RethinkDB.subscribeAll(); })
                .catch(function (e) { return RethinkDB.options.log.error('RethinkDB: Handshake failed', e); });
        });

        RethinkDB.rws.addEventListener('message', function (message) {
            // "#1" messages are heartbeats. We just process them silently with no further propagation
            if (message.data === '#1') {
                RethinkDB.rws.send('#2');
                return;
            }

            var data = JSON.parse(message.data);

            // emitAck requests go directly to their callers
            var request = RethinkDB.requests[data.rid];
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

        setInterval(function () {
            var now = Date.now();
            Object.keys(RethinkDB.requests).forEach(function (cid) {
                var request = RethinkDB.requests[cid];
                if (now > request.timestamp + 3000) {
                    RethinkDB.options.log.error('Expired request', request.cid);
                    delete RethinkDB.requests[cid];
                    request.reject(new Error('Timed out'));
                }
            });
        }, 1000);
    },

    registerField: function registerField(Vue, vm, field, config) {
        // TODO: Would it make more sense to just annotate the config with these elements, instead of copying it?
        var query = {
            queryId: RethinkDB.nextQueryId++,
            vm: vm,
            field: field,
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

        RethinkDB.options.log.debug('RethinkDB: Registering field ' + field, { config: config, query: query });

        var element;

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

    subscribeAll: function subscribeAll() {
        RethinkDB.options.log.debug('RethinkDB: Subscribing to all');
        Object.keys(RethinkDB.queries).forEach(function (queryId) { return RethinkDB.subscribe(RethinkDB.queries[queryId]); });

        return Promise.resolve(true);
    },

    subscribe: function subscribe(query) {
        RethinkDB.options.log.debug('RethinkDB: Subscribing to query', query);
        if (RethinkDB.rws.readyState === WebSocket.OPEN) {
            RethinkDB.emit('subscribeQuery', { queryId: query.queryId, query: query.query, params: query.params });
        }
    },

    unsubscribeAll: function unsubscribeAll(vm) {
        RethinkDB.options.log.debug('RethinkDB: Unsubscribing from all');
        if (vm.$rethinkQueries) {
            vm.$rethinkQueries.forEach(RethinkDB.unsubscribe);
            vm.$rethinkQueries.length = 0;
        }
    },

    unsubscribe: function unsubscribe(query) {
        RethinkDB.options.log.debug('RethinkDB: Unsubscribing from query', query);
        if (query.type === 'collection') {
            query.vm[query.field].length = 0;
        } else if (query.type === 'value') {
            query.vm[query.field] = {};
        }

        delete RethinkDB.queries[query.queryId];
        RethinkDB.emit('unsubscribeQuery', { queryId: query.queryId });
    },

    processQueryResponse: function processQueryResponse(response) {
        var query = RethinkDB.queries[response.queryId];
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

    processValueResponse: function processValueResponse(query, response) {
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

    processCollectionResponse: function processCollectionResponse(query, response) {
        // @credit https://github.com/rethinkdb/horizon/blob/next/client/src/ast.js#L185-L249
        switch (response.type) {
            case 'remove':
            case 'uninitial': {
                // Remove old values from the array
                if (response.old_offset != null) {
                    var removed = query.vm[query.field].splice(response.old_offset, 1);
                    if (query.onEntryDeleted) {
                        query.onEntryDeleted.call(query.vm, query.state, removed[0], response.old_offset);
                    }
                } else {
                    var index = query.vm[query.field].findIndex(function (x) { return x.id === response.old_val.id; });
                    if (index === -1) {
                        // Programming error. This should not happen
                        throw new Error('Unable to apply change: ' + JSON.stringify(response));
                    }

                    var removed$1 = query.vm[query.field].splice(index, 1);
                    if (query.onEntryDeleted) {
                        query.onEntryDeleted.call(query.vm, query.state, removed$1[0], index);
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
                    var index$1 = query.vm[query.field].findIndex(function (x) { return x.id === response.old_val.id; });
                    if (index$1 === -1) {
                        // indicates a programming bug. The server gives us the
                        // ordering, so if we don't find the id it means something is
                        // buggy.
                        throw new Error('Unable to apply change: ' + JSON.stringify(response));
                    }
                    query.vm[query.field][index$1] = response.new_val;
                    if (query.onEntryUpdated) {
                        query.onEntryUpdated.call(query.vm, query.state, response.new_val, index$1);
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
    authenticate: function authenticate(authToken) {
        if (authToken || authToken === null) {
            RethinkDB.options.log.debug('RethinkDB: Storing auth token');
            RethinkDB.authToken = authToken;
        }

        if (RethinkDB.authToken && RethinkDB.rws && RethinkDB.rws.readyState === WebSocket.OPEN) {
            RethinkDB.options.log.debug('RethinkDB: Authenticating...');
            RethinkDB.emitAck('auth', { authToken: RethinkDB.authToken })
                .then(function (r) { return RethinkDB.options.log.log('Authenticated', r); })
                .catch(function (e) { return RethinkDB.options.log.error('Authentication error', e); });
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
    emit: function emit(event, data) {
        if (RethinkDB.rws.readyState !== WebSocket.OPEN) {
            return;
        }

        var message = {
            cid: RethinkDB.nextCid++,
            event: event,
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
    emitAck: function emitAck(event, data) {
        if (RethinkDB.rws.readyState !== WebSocket.OPEN) {
            return Promise.reject(new Error('Not connected.'));
        }

        var request = {};
        var cid = RethinkDB.nextCid++;

        var promise = new Promise(function (resolve, reject) {
            request.resolve = resolve;
            request.reject = reject;
            request.timestamp = Date.now();
            RethinkDB.requests[cid] = request;
        });

        var message = {
            cid: cid,
            event: event,
            data: data || {},
        };

        RethinkDB.rws.send(JSON.stringify(message));

        return promise;
    },
};

exports['default'] = RethinkDB;

Object.defineProperty(exports, '__esModule', { value: true });

})));
