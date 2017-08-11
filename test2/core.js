const chai = require('chai');
const dirtyChai = require('dirty-chai');

const expect = chai.expect;
chai.use(dirtyChai);

// Bootstrap functions before each test
before(bootstrap.init);
after(bootstrap.teardown);

describe('Test Harness Internals', function() {
    it('should boot into the test environment', function() {
        expect(process.env.NODE_ENV).to.equal('test');
    });
});
