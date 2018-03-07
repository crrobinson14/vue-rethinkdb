# RethinkDB WebSocket Bridge

> SocketCluster based bridge layer for browser and mobile clients to RethinkDB.

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
