const { expect } = require('chai');
const net = require('net');
const sinon = require('sinon');
const server = require('../server'); // Adjust the path as necessary

describe('Server', () => {
  let sandbox;

  beforeEach((done) => {
    sandbox = sinon.createSandbox();
    server.listen(3333, done);
  });

  afterEach((done) => {
    sandbox.restore();
    server.close(done);
  });

  it('should accept a new connection', (done) => {
    const client = new net.Socket();
    client.connect(3333, 'localhost', () => {
      expect(client.connecting).to.be.false;
      client.destroy();
      done();
    });
  });

  // Add more tests here...
});
