# VueRethinkDB: A VueJS RethinkDB Driver

This repo provides a simpified RethinkDB plugin for managing data views in VueJS. It's similar to `vuefire` but with
some simplified metaphors for tracking individual values or collections of values.

RethinkDB is a great database but since it's no longer commercially supported, some aspects of its development have lost
their way. The biggest piece of this is Horizon, which was meant to be a client/server bridge between browsers and
RethinkDB. RethinkDB was intended to be accessed server-to-server. Horizon provided the business logic required to
access it from Web clients.

Unfortunately, although RethinkDB is very usable, Horizon is basically dead and some other bridge mechanism is required
to support Web clients. This project includes a simple SocketCluster-based WebSocket bridge layer in the `bridge/`
folder.

## Bridge Setup

The Bridge is based on the highly scalable, robust [SocketCluster](https://socketcluster.io/#!/) framework. To get
started, set up a server or cluster visible to the Internet that can also communicate with your RethinkDB cluster.
Copy the contents of the `bridge/` folder there, and adjust the queries to suit your needs. Make sure you run `npm i`
before trying to run `npm start`. You can use any mechanism you prefer (`forever`, `pm2`, `supervisor`, etc.) to
keep the process running long-term.

A nice feature of SocketCluster is that it automatically detects changes to worker logic files. This means you can
adjust your queries on the fly without even restarting the daemon. The workers will be restarted automatically. The
VueJS plugin keeps a list of open queries, and will automatically re-request them when it reconnects to the server.

Adding business logic for queries and values is simple. Just adjust `lib/queries/index.js` and `lib/values/index.js`
to suit your needs. If you need user-based access control, although SocketCluster provides its own authentication
layer this can be confusing to use at first. An example is provided in `lib/of a simpler mechanism

## Client Setup

Usage is easy. Simply `npm install -S vue-rethinkdb`, and add the plugin to VueJS, typically in your `main.js` file:

    import VueRethinkDB from 'vue-rethinkdb';
    Vue.use(VueRethinkDB);

The examples below all assume a simple database with two tables:

`logentries`:
```json
[
    {
        "id": "74B73033-75D0-432B-A106-E8A7DEEFD25B",
        "userId": "C6CB7A3B-59B6-4A24-9783-13B03E3EF6B1",
        "message": "I went to the river today.",
        "created": "2017-09-12T14:57:11Z"
    },
    {
        "id": "4D2E551A-C3B5-4BC4-A64D-10492E99265E",
        "userId": "C6CB7A3B-59B6-4A24-9783-13B03E3EF6B1",
        "message": "I went to the ocean today.",
        "created": "2017-09-14T16:39:41Z"
    },
    {
        "id": "E67F4009-C447-4CEB-BCB2-2D316072CAB7",
        "userId": "C6CB7A3B-59B6-4A24-9783-13B03E3EF6B1",
        "message": "I forgot to eat dinner today. The movie was so good!",
        "created": "2017-09-17T23:10:45Z"
    },
]
```

and

`users`:
```json
[
    {
        "id": "C6CB7A3B-59B6-4A24-9783-13B03E3EF6B1",
        "first": "Chad",
        "last": "Robinson",
        "isExplorer": true
    }
]
```

# Individual Records

Given this data, supplying data to a user profile page is as simple as:

```js
<template>
    <div>
        <label>First: </label><span>{{ user.first }}</span>
    </div>
    <div>
        <label>Last: </label><span>{{ user.last }}</span>
    </div>
</template>

<script>
    export default {
        name: 'user-profile',
        props: ['userId'],
        data: () => ({}),
        rethinkDB(r) {
            return {
                user: r.db('mydb').table('users').get(this.userId),
            };
        }
    };
</script>
```

In this case, the local component value `user` will be bound to the result of the query specified. There is no need to
append `changes()` or `run()` - this is added automatically by the plugin.

## Collections

Collections are just as simple:

```js
<template>
    <div>
        <div v-for="entry in logentries" key="entry.id">{{ entry.created }} :: {{ entry.message }}</span>
    </div>
</template>

<script>
    export default {
        name: 'log-entries',
        data: () => ({}),
        rethinkDB(r, opts) {
            return {
                logentries: r.db('mydb')
                    .table('logentries')
                    .getAll()
                    .changes(opts.standardCollection)
                    .merge(article => ({
                        new_val: {
                            body: db.db.table('articlebodies')
                                .get(article('new_val')('id'))('body')
                                .default('')
                        }
                    })),
            };
        }
    };
</script>
```

## Change Feed Options

As illustrated above, this driver provides two standard sets of options that may be supplied in change feed requests:

 - `standardValue`, for values, equates to `{ includeInitial: true, includeStates: true, includeTypes: true }`
 - `standardCollection`, for collections, equates to
   `{ includeInitial: true, includeStates: true, includeOffsets: true, includeTypes: true }`

It is strongly recommended that you use one of these two options in your query. This plugin expects change feeds to
include initial values, and will wait for `state` to become `ready` before sending the first change notification to
VueJS. This helps prevent flicker when loading data sets for the first time. (The first update for a collection will
include all initial rows at once.) It also expects offsets to be included for collection changes to help track `move`
operations.

In that case, why not just force one of these two options to be set? This is because in RethinkDB some data merge
operations must be done AFTER the change feed is defined, e.g.:

```js
        rethinkData(r, opts) {
            return {
                logentries: r.db('mydb')
                    .table('logentries')
                    .getAll([this.userId], { index: 'userId' })
                    .orderBy({ index: 'userId' })
                    .limit(20)
                    .changes(opts.standardCollection)
                    .merge(logentry => ({
                        new_val: {
                            user: r.db('mydb')
                                .table('users')
                                .get(logentry('new_val')('userId'))
                                .default({})
                        }
                    })),
```

The query above will include a nested `user` block for each log entry, saving a query when showing tabular data. This
is inefficient compared to `eqJoin` operations for large data sets, but for small, filtered data sets this is much
faster than doing a later lookup for each row.

Another benefit to manually specifying change feed options is you can access additional parameters such as `squash`.
See [ReQL command: changes](https://www.rethinkdb.com/api/javascript/changes/) for a list of available options here.
Please note that failing to include states, types, or offsets could produce undefined behavior by this plugin.

The only thing you do not have to add to a query is `.run()`. This plugin will do that for you (just like the
RethinkDB Data Explorer).
