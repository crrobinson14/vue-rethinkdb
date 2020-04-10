# RethinkDB WebSocket Bridge

:warning: **I no longer use SocketCluster myself, and will be rewriting this section to remove it soon.** SocketCluster
is a great project but in the time since I last used it here it's gotten even more sophisticated and also more complex.
There is actually no requirement in a project like this to use a cluster-aware backend - RethinkDB itself is already
clustered and the WebSocket bridge is easy to scale in most cases just using traditional horizontal scaling. It may
still be a good option if your project has complex needs, but for this module I'll be rewriting the bridge around a
simpler approach.

This module is based on the highly scalable, robust [SocketCluster](https://socketcluster.io/) framework. To use it,
do the following:

1. Set up a server or cluster visible to the Internet that can also communicate with your RethinkDB cluster,
2. Copy the contents of this `bridge/` folder there,
3. Aadjust the queries in `lib/Queries.js` to suit your needs,
4. Run `npm i`,
5. Run `npm start`.

Review the source code for configurable parameters, nearly all of which can be set via environment variables (ideal for
Dockerized environments). Only one is required:

- **RETHINKDB_HOST** - RethinkDB host to connect to.

Some additional, optional, but useful settings:

- **RETHINKDB_PORT** - RethinkDB port. Defaults to 28015.
- **RETHINKDB_DB** - Default database to use in RethinkDB if not explicitly named in a query. Optional, but recommended.
- **SOCKETCLUSTER_PORT** - The port the service will listen on. Defaults to 8000.
- **JWT_SECRET** - JWT authentication secret. If specified, authentication will be enabled and will expect clients to
  present a token before submitting any queries.

Then run `npm start` to start the bridge! You can use any mechanism you prefer (e.g. `forever`, `pm2`, or `supervisor`)
to manage the process long-term.

A nice feature of SocketCluster is that it automatically detects changes to worker logic files. This means you can
adjust your queries on the fly without needing to restart the daemon. Sample queries are provided covering a number of
different use-cases. Adjust these to suit your needs.

## Customization

This project is a SocketCluster implementation, so all of the [documentation](https://socketcluster.io/#!/) for that
project applies here as well. What is listed below is only the additional information relevant to the bridge itself.

### Logging

The boilerplate SocketCluster implementation uses a very simplistic logger. This project includes a more sophisticated
Winston implementation with an optional Papertrail config. Review/customize `lib/Log.js` to adjust its behavior.

### Cluster Operation

SocketCluster was designed specifically to be able to operate in a cluster (hence the name). But any service run in a
cluster needs a load balancer in front of it, and load balancers like health check endpoints.

To support that functionality, this bridge implements a simple `/health-check` endpoint you can configure your load
balancers for.
