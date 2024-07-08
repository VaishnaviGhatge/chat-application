const { expect } = require('chai');
const net = require('net');
const sinon = require('sinon');

describe('Client', () => {
  let client;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    client = new net.Socket();
  });

  afterEach(() => {
    sandbox.restore();
    client.destroy();
  });

  it('should connect to the server', (done) => {
    client.connect(3333, 'localhost', () => {
      expect(client.connecting).to.be.false;
      done();
    });
  });

  // Add more tests here...
});
