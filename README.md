# VueRethinkDB: RethinkDB driver for VueJS

This project provides a basic plugin for communicating with RethinkDB from a VueJS app.

RethinkDB is a great database, but since it's no longer commercially supported, some aspects of its development have
lost momentum. The biggest piece of this was Horizon, a client/server bridge between browsers and RethinkDB. RethinkDB
has a Javascript driver, but it's only intended to be used in NodeJS, server-side. Horizon would have provided the
business logic to support Web clients.

Unfortunately, although RethinkDB is very usable, Horizon is all but dead. Some other bridge mechanism is required to
support Web clients.

This project provides two components: a VueJS plugin and a server-side "bridge". The protocol between the two is very
simple, so the server side component could be easily replaced. (Used correctly, it could even talk to any database that
supports subscription-based monitoring of data - not just RethinkDB).

## Server-side Bridge

See the [Bridge README](bridge/README.md) for more details on this component. Set this component up first: queries and
business logic are defined here.

## Client Installation

Installation is easy. Just `npm install -S vue-rethinkdb`, then and add VueRethinkDB to VueJS:

```js
import RethinkDB from 'vue-rethinkdb';
Vue.use(RethinkDB, { options });
```

Two options are currently supported, with the defaults shown below:

```js
{
    url: 'ws://localhost:8000/socketcluster',
    log: console,
}
```

- **uri** is obviously the endpoint to connect to. Note that because a full URI is specified here, you can choose
  between wss:// and ws:// connections easily.
- **log** controls where logs are sent. This is provided to allow you to override the default logging in VueRethinkDB
  (to console) such as if you use Winston, or simply wish to disable certain log levels. For example, to disable debug
  and info logging but show errors, you could set this to:

```js
log: {
    error: console.error,
    debug: () => {},
    log: () => {},
}
```

## Authentication

Authentication is optional but recommended. By default the Bridge provides a simple JWT validation mechanism, but this
could be changed to any desired implementation (e.g. session cookie) just by altering the logic there.

If you elect to use the JWT token mechanism, set the token as follows, ideally as early as possible when your
application starts:

```js
RethinkDB.authenticate(authToken);
```

Note that storing JWTs is a security concern. Ideally a Web application should not store these in localStorage or
similar. If you prefer a more secure solution, use HTTP "Secure Cookies" to maintain a session with your other
back-end application servers, and arrange an endpoint in your API layer such as "/get-data-token" that confirms the
user's identity via other means. Make this token short-lived (e.g. 60 seconds), so if it is stolen it will not be
useful:

```js
axios
    .get('/get-data-token')
    .then(response => RethinkDB.authenticate(response.data.authToken))
    .catch(e => console.error('Unable to authenticate!', e);
```

## Usage in a Component

Two sample queries are provided in the Bridge called `myUser` and `myFollowers`. Suppose we wanted to build a simple
public profile page for a user and his/her followers. We could just do the following:

```js
<template>
    <h1>{{ user.firstName }} {{ user.lastName }}</h1>
    <h2>Followers:</h2>
    <div class="followers">
        <div v-for="follower in followers" key="follower.id">{{ follower.firstName }} {{ follower.lastName }}</span>
    </div>
</template>

<script>
    export default {
        name: 'user-profile',
        props: ['userId'],
        data: () => ({}),
        rethinkDB() {
            return {
                user: { value: 'getUser', params: { userId: this.userId } },
                followers: { collection: 'userFollowers', params: { userId: this.userId } },
            };
        }
    };
</script>
```

Note that the fields defined in this way are reactive, so you can observe them with other VueJS mechanisms as well.

## Event Notifications

Reactivity is great, but sometimes it's hard to bind components directly to raw data sets, particularly when working
with third party widgets like charting libraries, or if you need to manually control how updates are displayed (such
as to put a visual indicator on updated rows in a collection). Another good example would be inhibiting the rendering
of a component (again, such as a chart) until the initial data set was loaded, to prevent high CPU workload and display
"flicker" while the initial data set was filling in.

To provide this functionality, VueRethinkDB allows you to specify event callbacks that will be triggered as data sets
change. Specify these as functions in the query definition:

```js
return {
    followers: {
        collection: 'userFollowers',
        params: { userId: this.userId },
        onStateChanged(state) {
            // Called when RethinkDB sends state changes. state 'ready' is a good time to update non-reactive widgets
            // with initial data loads.
        },
        onValueChanged(state, value) {
            // Called when documents are updated, eliminating the need to create a watcher on the property. This can be
            // a good way to do clever things like not update thumbnails if the user is on mobile, or post-process the
            // data received before it is used.
        },
        onEntryAdded(state, value, index) {
            // Called when an entry is added to a collection. This is a good place to update tables incrementally,
            // or do special things like call non-reactive widgets to notify them of new data.
        },
        onEntryUpdated(state, value, index) {
            // Called when an entry is updated in a collection. This is a good place to update tables incrementally,
            // or do special things like call non-reactive widgets to notify them of new data.
        },
        onEntryMoved(state, value, fromIndex, toIndex) {
            // Called when an entry is moved within a collection. This is a good place to update tables incrementally,
            // or do special things like call non-reactive widgets to notify them of new data.
        },
        onEntryDeleted(state, value, index) {
            // Called when an entry is removed from a collection. This is a good place to update tables incrementally,
            // or do special things like call non-reactive widgets to notify them of new data.
        },
    },
};
```

In each of these callbacks, one or more of the following fields will be provided:

- **state** - RethinkDB's "state" value for the changefeed, typically "initializing" or "ready".
- **value** - The document that was changed.
- **index** - For add, update, and delete notifications in collections, the location the document is/was in.
- **fromIndex**, **toIndex** - For move notifications in collections, where the document is moving from/to.

Note that callbacks are made AFTER the effects are applied to values and arrays. Be careful to avoid memory leaks in
callbacks. Doing things like saving external references to values or the data inside them can create reference cycles
that prevents JS from freeing the referenced objects!

## Manual Binding

In some cases (particularly when working with non-reactive widgets, such as D3 charts) you may want to manually bind
to documents or collections and manage the subscription cycle yourself.

This is fairly easy with this plugin. Instead of defining a `rethinkDB() {...}` configuration in your component, just
import the plugin and call it directly via it API:

```js
<template>
    <div>
        <svg ref="chart"></svg>
        ... other stuff ...
    </div>
</template>

<script>
import Vue from 'vue';
import RethinkDB from 'vue-rethinkdb';

export default {
    name: 'StockChart',
    data() {
        return {
            chartFeed: null,
        };
    },
    beforeDestroy() {
        // We will need to manually do this
        if (this.chartFeed) {
            RethinkDB.unsubscribe(this.chartFeed);
        }
    },
    methods: {
        drawMyChart(symbol, day) {
            // Note that "registerField" returns a query metadata object that can be used to unsubscribe
            if (this.chartFeed) {
                RethinkDB.unsubscribe(this.chartFeed);
            }

            this.chartFeed = RethinkDB.registerField(Vue, this, 'chartData', {
                collection: 'chartData',
                params: { symbol, day },
                onStateChanged(state) {
                    if (state === 'ready') {
                        // Render the chart into this.$refs.chart using this.chartData as the data source

                    }
                }
                // We could also listen to onEntry* events to dynamically add live data to the chart.
            });
        }
    },
    props: {
        type: String
    },
    components: {},
    data() {
    }
}
</script/>
```

## Other Usage

Because the Bridge is based on SocketCluster, many other forms of communication are possible. Two (`emit` and `emitAck`)
are already used by VueRethinkDB, so they are exposed for you to use as well:

```js
import RethinkDB from 'vue-rethinkdb';

// Send a message, no response required
RethinkDB.emit('tellTheServerThis', { itHappened: 'finally!' });

// Send a message, resolve a promise when the server replies
RethinkDB.emitAck('askTheServerSomething', { id: 1234 })
    .then(response => console.log('The server replied!', response))
    .catch(e => console.error('The request timed out', e));
```

Although they are not shown here, you could easily take advantage of additional SocketCluster features as well. One
useful option is SocketCluster's cross-cluster communication and pub/sub mechanics. This would make it very easy to
build a real-time chat service with presence tracking, combining SocketCluster's communication tools with RethinkDB
tracking data like user "friend" lists, room membership, profiles, and other data!
