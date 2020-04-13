const jwt = require('jsonwebtoken');

const jwtSecretKey = process.env.JWT_SECRET_KEY || 'BOGUS';

// Authorizer function. Make sure you call "done" on success (with no parameters) or error (with the error).
// See https://github.com/primus/primus#authorization for more details on how to use this callback effectively.
// Note that this is the "correct/standard" way to check a session in Primus, but it has one disadvantage: you
// have no access to the "spark" that gets created later. What you DO have is the "request", which is a direct
// parameter here and available in `spark.request` later. So here we monkey-patch a place to track the decoded
// session token so we don't have to decode it twice. If you think this is a bad idea, just decode it again a
// second time in the `connection` event handler, or work out some other mechanism.
module.exports = (request, done) => {
  request.decodedSessionToken = null;

  const { authorization = '' } = request.headers;
  if (authorization.substr(0, 3) === 'JWT' || authorization.substr(0, 6) === 'Bearer') {
    if (jwtSecretKey === 'BOGUS') {
      console.error('You must set the JWT_SECRET_KEY environment variable.');
      process.exit(-1);
    }

    try {
      const authToken = authorization.split(' ').pop();
      const decoded = jwt.verify(authToken, jwtSecretKey, { algorithms: ['HS256'] });

      // Check fields in decoded here.
      // It is a VERY good idea to check the token's identifier against a revocation list.
      // See https://auth0.com/blog/blacklist-json-web-token-api-keys/.

      request.decodedSessionToken = decoded;
      done();
    } catch (e) {
      console.warn('Authentication error', e.message);
      done(e);
    }
    // Perform whatever checks desired here,
  }

  // NOTE: The implication of this line is that Authorization is required for all calls!
  done(new Error('Invalid auth token'));
};
