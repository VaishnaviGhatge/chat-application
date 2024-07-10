const net = require('net');
const assert = require('assert');

function sendMessage(socket, message) {
    return new Promise((resolve, reject) => {
        socket.write(JSON.stringify(message) + '\n', (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function runTests() {
    const client = new net.Socket();
    
    client.connect(3333, 'localhost', async () => {
        console.log('Connected to server');

        try {
            // Test 1: Register a user
            await sendMessage(client, { type: 'register', username: 'testuser' });
            console.log('Test 1: User registered');

            // Test 2: List users
            await sendMessage(client, { type: 'list' });
            console.log('Test 2: User list requested');

            // Test 3: Send a message
            await sendMessage(client, { type: 'message', to: 'testuser', message: 'Hello' });
            console.log('Test 3: Message sent');

            // Additional tests can be added here

        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            client.end();
        }
    });

    client.on('data', (data) => {
        console.log('Received:', data.toString());
    });

    client.on('error', (err) => {
        console.error('Client error:', err.message);
    });

    client.on('close', () => {
        console.log('Connection closed');
    });
}

runTests();
