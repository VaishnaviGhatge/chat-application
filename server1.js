const net = require('net');

const server = net.createServer();
const port = 3333;
let users = {};

server.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('data', (data) => handleIncomingMessage(socket, data));
    socket.on('end', () => handleClientDisconnection(socket));
    socket.on('error', (err) => handleSocketError(socket, err)); // Error handling
});

function handleIncomingMessage(socket, data) {
    try {
        const message = JSON.parse(data.toString());
        switch (message.type) {
            case 'register':
                registerUser(socket, message.username);
                break;
            case 'message':
                sendMessageToUser(socket, message.to, message.message);
                break;
            case 'list':
                sendUserList(socket);
                break;
            case 'switch_chat':
                handleChatSwitch(socket, message.to);
                break;
            default:
                sendErrorNotification(socket, 'Unknown message type');
                console.log('Unknown message type:', message.type);
        }
    } catch (error) {
        console.error('Error parsing incoming message:', error.message);
        sendErrorNotification(socket, 'Invalid message format');
    }
}

function registerUser(socket, username) {
    if (!username) {
        sendErrorNotification(socket, 'Username cannot be empty');
        return;
    }
    if (users[username]) {
        sendErrorNotification(socket, 'Username already taken');
    } else {
        users[username] = socket;
        socket.username = username;
        console.log(username + ' registered');
        notifyUsersOfNewRegistration(username);
    }
}

function notifyUsersOfNewRegistration(newUsername) {
    const notification = JSON.stringify({
        type: 'notification',
        notificationType: 'user_joined',
        message: newUsername + ' has joined the chat'
    });
    broadcastMessage(notification);
}

function sendMessageToUser(fromSocket, to, message) {
    const targetSocket = users[to];
    if (targetSocket) {
        const messageData = JSON.stringify({
            type: 'message',
            from: fromSocket.username,
            message: message
        });
        targetSocket.write(messageData + '\n');
    } else {
        sendErrorNotification(fromSocket, `User ${to} does not exist`);
    }
}

function sendUserList(socket) {
    const userList = Object.keys(users).filter(username => username !== socket.username && !users[username].isChatting);
    const listData = JSON.stringify({
        type: 'list',
        users: userList
    });
    socket.write(listData + '\n');
}

function handleClientDisconnection(socket) {
    if (socket.username && users[socket.username]) {
        const disconnectedUser = socket.username;
        const previousTarget = socket.targetUser;
        
        if (previousTarget) {
            const leaveMessage = JSON.stringify({
                type: 'notification',
                notificationType: 'user_left',
                message: `${socket.username} has left the chat`
            });
            sendMessageToUser(socket, previousTarget, leaveMessage);
            delete users[socket.username].targetUser;
        }

        delete users[socket.username];
        console.log(disconnectedUser + ' disconnected');
        notifyUsersOfDisconnection(disconnectedUser);
    } else {
        console.log('Client disconnected without proper registration.');
    }
    
    socket.destroy(); // Ensure socket is destroyed to prevent memory leaks
}

function notifyUsersOfDisconnection(username) {
    const notification = JSON.stringify({
        type: 'notification',
        notificationType: 'user_left',
        message: username + ' has left the chat'
    });
    broadcastMessage(notification);
}

function handleChatSwitch(socket, newTarget) {
    const currentUser = socket.username;

    if (!currentUser) {
        sendErrorNotification(socket, 'User not registered');
        return;
    }

    const targetSocket = users[newTarget];
    if (targetSocket) {
        if (socket.targetUser) {
            const notificationPrevUser = JSON.stringify({
                type: 'notification',
                notificationType: 'user_left',
                message: `${socket.username} has left the chat`
            });
            sendMessageToUser(socket, socket.targetUser, notificationPrevUser);
            delete users[socket.username].targetUser;
        }

        socket.targetUser = newTarget;
        users[newTarget].targetUser = currentUser;
        const notificationNewUser = JSON.stringify({
            type: 'notification',
            notificationType: 'user_switched',
            message: `User ${currentUser} is now chatting with you`
        });
        targetSocket.write(notificationNewUser + '\n');
        
        const notificationCurrentUser = JSON.stringify({
            type: 'notification',
            notificationType: 'switch_successful',
            message: `You have switched to chat with ${newTarget}`
        });
        socket.write(notificationCurrentUser + '\n');
    } else {
        sendErrorNotification(socket, `User ${newTarget} does not exist`);
    }
}

function sendErrorNotification(socket, errorMessage) {
    const errorData = JSON.stringify({
        type: 'error',
        message: errorMessage
    });
    socket.write(errorData + '\n');
}

function broadcastMessage(message) {
    Object.keys(users).forEach(username => {
        users[username].write(message + '\n');
    });
}

function handleSocketError(socket, err) {
    console.error('Socket error:', err.message);
    // Implement any additional cleanup or error handling as needed
    handleClientDisconnection(socket);
}

// Global error handler
process.on('uncaughtException', (err) => {
    console.error('Unhandled exception:', err);
    // Optionally, add logic to restart the server or notify administrators
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection:', reason);
    // Optionally, add logic to restart the server or notify administrators
});

server.listen(port, () => {
    console.log('TCP server started on port ' + port);
});
