/*!
 * vue-rethinkdb v1.0.1
 * (c) 2018 Chad Robinson
 * Released under the MIT License.
 */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var r = require('rethinkdb');

var QueryOptions = {
    standardCollection: { includeInitial: true, includeStates: true, includeOffsets: true, includeTypes: true },
    standardValue: { includeInitial: true, includeStates: true, includeTypes: true },
};

var trackValue = function (Vue, vm, field, cursor) {
    if (field in vm) {
        vm[field] = {};
    } else {
        Vue.util.defineReactive(vm, field, {});
    }

    cursor.each(function (err, change) {
        if (err) {
            throw new Error(err);
        }

        if (change.new_val) {
            vm[field] = change.new_val;
        }
    });

    return cursor;
};

var trackCollection = function (Vue, vm, field, cursor) {
    var entries = [];

    if (field in vm) {
        vm[field] = entries;
    } else {
        Vue.util.defineReactive(vm, field, entries);
    }

    cursor.each(function (err, change) {
        // @credit https://github.com/rethinkdb/horizon/blob/next/client/src/ast.js#L185-L249
        switch (change.type) {
            case 'remove':
            case 'uninitial': {
                // Remove old values from the array
                if (change.old_offset != null) {
                    entries.splice(change.old_offset, 1);
                } else {
                    var index = entries.findIndex(function (x) { return x.id === change.old_val.id; });
                    if (index === -1) {
                        // Programming error. This should not happen
                        throw new Error('Unable to apply change: ' + JSON.stringify(change));
                    }

                    entries.splice(index, 1);
                }

                break;
            }

            case 'add':
            case 'initial': {
                // Add new values to the array
                if (change.new_offset != null) {
                    // If we have an offset, put it in the correct location
                    entries.splice(change.new_offset, 0, change.new_val);
                } else {
                    // otherwise for unordered results, push it on the end
                    entries.push(change.new_val);
                }

                break;
            }

            case 'change': {
                // Modify in place if a change is happening
                if (change.old_offset != null) {
                    // Remove the old document from the results
                    entries.splice(change.old_offset, 1);
                }
                if (change.new_offset != null) {
                    // Splice in the new val if we have an offset
                    entries.splice(change.new_offset, 0, change.new_val);
                } else {
                    // If we don't have an offset, find the old val and
                    // replace it with the new val
                    var index$1 = entries.findIndex(function (x) { return x.id === change.old_val.id; });
                    if (index$1 === -1) {
                        // indicates a programming bug. The server gives us the
                        // ordering, so if we don't find the id it means something is
                        // buggy.
                        throw new Error('Unable to apply change: ' + JSON.stringify(change));
                    }
                    entries[index$1] = change.new_val;
                }

                break;
            }

            case 'state':
                break;

            default:
                throw new Error('Unrecognized "type" field from server: ' + JSON.stringify(change));
        }
    });

    return cursor;
};

var trackField = function (Vue, vm, field, cursor) {
    var type = cursor.toString();

    if (type === '[object AtomFeed]') {
        return trackValue(Vue, field, cursor);
    } else if (type === '[object OrderByLimitFeed]') {
        return trackCollection(Vue, field, cursor);
    }

    throw new Error('Field "' + field + '" has unsupported feed type ' + type);
};

var RethinkDB = {
    install: function(Vue, options) {
        RethinkDB.options = options || {};
        Vue.RethinkDB = RethinkDB;

        RethinkDB.getConnection();

        Vue.mixin({
            created: function() {
                var vm = this;

                var bindings = (vm.$options && vm.$options.rethinkDB)
                    ? vm.$options.rethinkDB.call(this, r, QueryOptions)
                    : null;

                if (bindings) {
                    // Process the bindings into an array of cursors we can close later when we lose scope.
                    vm.$rethinkCursors = Promise.all(Object.keys(bindings), function (field) { return RethinkDB.getConnection().then(function (conn) { return bindings[field].run(conn).then(function (cursor) { return trackField(Vue, vm, field, cursor); }); }); });
                }
            },

            beforeDestroy:
                function() {
                    var vm = this;

                    if (vm.$rethinkCursors) {
                        vm.$rethinkCursors.forEach(function (feed) { return feed.close(); });
                        delete vm.$rethinkCursors;
                    }
                }
        });
    },

    getConnection: function getConnection() {
        if (RethinkDB.conn) {
            return Promise.resolve(RethinkDB.conn);
        }

        RethinkDB.pendingConnections = RethinkDB.pendingConnections || [];
        var promise = new Promise(function (resolve, reject) {
            RethinkDB.pendingConnections.push({ resolve: resolve, reject: reject });
        });

        if (RethinkDB.pendingConnections.length === 1) {
            console.log('VueRethinkDB: Connecting...', RethinkDB.options);
            r.connect(RethinkDB.options)
                .then(function (connection) {
                    console.log('VueRethinkDB: Connected!');

                    RethinkDB.conn = connection;
                    RethinkDB.pendingConnections.map(function (pending) { return pending.resolve(connection); });
                    delete RethinkDB.pendingConnections;
                })
                .catch(function (e) {
                    console.error('VueRethinkDB: Connection error', e);
                    RethinkDB.pendingConnections.map(function (pending) { return pending.reject(e); });
                });
        }

        return promise;
    },
};

exports['default'] = RethinkDB;
