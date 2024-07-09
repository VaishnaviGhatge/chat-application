(async () => {
    const { expect } = await import('chai'); // Dynamically import chai
    const net = require('net');

    describe('Chat Application', function() {
        let server;
        let client1, client2;

        before((done) => {
            server = require('../server1'); // Assuming server1.js exports the server instance
            server.listen(3333, done);
        });

        after((done) => {
            server.close(done);
        });

        beforeEach((done) => {
            client1 = new net.Socket();
            client2 = new net.Socket();
            done();
        });

        afterEach((done) => {
            client1.destroy();
            client2.destroy();
            done();
        });

        it('should register users and send messages', (done) => {
            client1.connect(3333, 'localhost', () => {
                client1.write(JSON.stringify({ type: 'register', username: 'user1' }));
            });

            client1.on('data', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'notification' && message.notificationType === 'user_joined') {
                    client2.connect(3333, 'localhost', () => {
                        client2.write(JSON.stringify({ type: 'register', username: 'user2' }));
                    });
                } else if (message.type === 'list') {
                    client2.write(JSON.stringify({ type: 'message', to: 'user1', message: 'Hello from user2' }));
                } else if (message.type === 'message') {
                    expect(message.message).to.equal('Hello from user2');
                    done();
                }
            });

            client2.on('data', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'notification' && message.notificationType === 'user_joined') {
                    client1.write(JSON.stringify({ type: 'list' }));
                }
            });
        });
    });
})();
