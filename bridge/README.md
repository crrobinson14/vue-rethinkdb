# RethinkDB WebSocket Bridge

> SocketCluster based bridge layer for browser and mobile clients to RethinkDB.

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

This daemon is a simple bridge layer between RethinkDB and WebSocket clients, typically Web or mobile apps, although it
could be useful for any client environment.

This layer embeds the business logic for database change-feed monitoring in the service. This is a tradeoff:

* **PRO:** Client apps no longer have lengthy query requests like r.db('mydb').table('mytable').do().lots().of().stuff().
* **CON:** Client apps no longer CAN have lengthy query requests like r.db('mydb').table('mytable').do().lots().of().stuff().

This requires some planning because one must create "named" queries in the server, such as `myOrders` or
`trendingPosts`. However, for most applications queries ARE known ahead of time, and differ only by their parameters.
And by pre-defining them in this way, clients can no longer "play around" and try to abuse the system. They must
operate within those predefined boundaries.

## Installation

Installation is simple:

1. Clone this repository,
2. Copy the `bridge` folder to a new project in your application,
3. Run `npm i`.

Review the source code for configurable parameters, nearly all of which can be set via environment variables (ideal for
Dockerized environments). Only two are required:

- **RETHINKDB_HOST** - RethinkDB host. No default, must be specified.
- **JWT_SECRET** - JWT authentication secret. If not specified, the process will exit with an error. Authentication may
  be disabled (not recommended), but you must edit the code to do so.

Some additional, optional, but useful settings:

- **RETHINKDB_PORT** - RethinkDB port. Defaults to 28015.
- **RETHINKDB_DB** - Default database to use in RethinkDB if not explicitly named in a query. Optional, but recommended.
- **SOCKETCLUSTER_PORT** - The port the service will listen on. Defaults to 8000.

## Customization

This project is a SocketCluster implementation, so all of the [documentation](https://socketcluster.io/#!/) for that
project applies here as well. What is listed below is only the additional information relevant to the bridge itself.

### Queries

Edit `lib/queries/index.js` and `lib/values/index.js` to define your collection and value queries. The full power of
RethinkDB is available to you here, as well as authentication (see below) for user-based parameters (e.g. `userId`) and
user-supplied parameters arriving with each request (e.g. `orderId`).

Queries are Promise-based and are expected to return a changefeed cursor. The bridge listens to the changefeed for this
cursor, and passes those changes back to the client. Queries are tracked by unique identifiers making it easy for
clients to figure out where to store the arriving data.

### Logging

The boilerplate SocketCluster implementation uses a very simplistic logger. This project includes a more sophisticated
Winston implementation with an optional Papertrail configuration. Review/customize `lib/Log.js` to adjust its
behavior.

### Cluster Operation

SocketCluster was designed specifically to be able to operate in a cluster (hence the name). But any service run in a
cluster needs a load balancer in front of it, and load balancers like health check endpoints.

To support that functionality, this bridge implements a simple `/health-check` endpoint you can configure your load
balancers for.
