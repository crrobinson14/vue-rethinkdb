# RethinkDB WebSocket Bridge

This module provides the server side component of the driver. It is based on a simple Primus WebSocket stack and meant
to be more of a reference implementation than used as-is. It is recommended that you do the following:

1. Set up a server, cluster, or Docker stack of your choice. It must be reachable by Web clients and also be able to
 reach your RethinkDB cluster.
2. Copy the contents of this `bridge/` folder to a new project and adjust to suit.
3. Deploy to the server cluster from step 1.

As is, this code will look for three environment variables:

- **DB_HOST** - RethinkDB host to connect to. Required.
- **DB_PORT** - RethinkDB port to connect to. Defaults to 28015 if not specified.
- **JWT_SECRET_KEY** - A JWT secret key to validate token-based authentication. See comments below.
- **PORT** - The port this service should listen on. Defaults to 8000 if not specified.

## Authentication

An authentication callback for Primus is configured in `server.js`. It expects that you will provide a JWT Secret Key
via the `JWT_SECRET_KEY` environment variable, and that callers will provide a token to authenticate via an
`Authorization: Bearer ...token...` or `Authorization: JWT ...token...` header.

If the client authenticates successfully then the contents of the decoded token will be available via `socket.session`
in your code. Otherwise the connection will be rejected.

To disable authentication either comment the entire function out, or replace it with your own custom logic.

### Customization

This project has a simple structure with three subfolders under `lib/`:

- `operations` - Handlers for API calls
- `queries` - Handlers to create change feeds for collection queries
- `values` - Handlers to return individual values and subscribe to their updates

Of course there is no requirement for you to keep the same structure. This is just a demo project. That said, this is
a simple, usable approach. Samples of each type of operation are included. Customize to suit the needs of your project.
