const net = require('net');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const userSocket = new net.Socket();
const port = 3333;
let username;
let targetUser;
let userList = [];

// Object to hold states for each user
const userStates = {};

const ClientState = {
    IDLE: 'Idle',
    WAITING_FOR_SERVER_RESPONSE: 'WaitingForServerResponse',
    WAITING_FOR_USER_RESPONSE: 'WaitingForUserResponse',
    CHATTING_WITH_USER: 'ChattingWithUser',
    SELECTING_USER: 'SelectingUser'
};

userSocket.connect(port, 'localhost', () => {
    askUsername();
});

userSocket.on('data', (data) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
        case 'list':
            handleUserList(message.users);
            break;
        case 'error':
            handleError(message.message);
            break;
        case 'notification':
            handleNotification(message.notificationType, message.message);
            break;
        case 'message':
            handleMessage(message);
            break;
        default:
            console.error('Unknown message type received.');
    }
});

userSocket.on('close', () => {
    console.error('Disconnected from server.');
    process.exit(1); // This line should be removed or adjusted
});


function setState(user, newState) {
    if (!userStates[user]) {
        userStates[user] = ClientState.IDLE;
    }
    userStates[user] = newState;
}

function validateInput(user, expectedState) {
    if (userStates[user] !== expectedState) {
        console.error(`Invalid action for ${user}. Current state: ${userStates[user]}, expected state: ${expectedState}`);
        return false;
    }
    return true;
}

function askUsername() {
    rl.question('Enter your username: ', (answer) => {
        username = answer;
        userSocket.write(JSON.stringify({ type: 'register', username }));
        setState(username, ClientState.SELECTING_USER);
    });
}

function handleUserList(users) {
    userList = users;
    console.log('Available users:');
    userList.forEach((user, index) => {
        console.log(`${index + 1}. ${user}`);
    });

    if (userStates[username] === ClientState.SELECTING_USER) {
        promptForUserSelection();
    } else if (targetUser) {
        promptForAction();
    }
}

function promptForAction() {
    rl.question(`Do you want to continue chatting with ${targetUser} or switch to another user? (continue/switch): `, (answer) => {
        if (answer.toLowerCase() === 'continue') {
            console.log(`Continuing chat with ${targetUser}`);
            setState(username, ClientState.CHATTING_WITH_USER);
            promptForMessage();
        } else if (answer.toLowerCase() === 'switch') {
            promptForUserSelection(); // Prompt user to select a new user to chat with
        } else {
            console.log('Invalid option. Please try again.');
            promptForAction();
        }
    });
}

function promptForUserSelection() {
    rl.question('Select the number of the user you want to chat with: ', (answer) => {
        const selectedNumber = parseInt(answer);
        if (selectedNumber > 0 && selectedNumber <= userList.length) {
            const selectedUser = userList[selectedNumber - 1];
            if (selectedUser === username) {
                console.log('You cannot chat with yourself. Please select another user.');
                promptForUserSelection();
                return;
            }
            if (userStates[username] === ClientState.CHATTING_WITH_USER && targetUser === selectedUser) {
                console.log(`You are already chatting with ${selectedUser}.`);
                promptForAction();
                return;
            }
            targetUser = selectedUser;
            console.log(`You can now chat with ${targetUser}`);
            setState(username, ClientState.CHATTING_WITH_USER);
            promptForMessage();
        } else {
            console.log('Invalid selection. Please try again.');
            promptForUserSelection();
        }
    });
}

function handleError(errorMessage) {
    console.error('Error:', errorMessage);
    setState(username, ClientState.IDLE);
    askUsername(); // Re-ask for username on error
}

function handleNotification(notificationType, notificationMessage) {
    console.log('Notification:', notificationMessage);
    if (notificationType === 'user_joined' || notificationType === 'user_left') {
        userSocket.write(JSON.stringify({ type: 'list' }));
    }
    if (notificationType === 'user_left' && notificationMessage.includes(targetUser)) {
        console.log('The user you were chatting with has left the chat.');
        targetUser = null; 
        setState(username, ClientState.SELECTING_USER); 
        promptForUserSelection(); 
    }
}

function handleMessage(message) {
    console.log(`${message.from}: ${message.message}`);
    setState(username, ClientState.CHATTING_WITH_USER);
    promptForMessage();
}

function promptForMessage() {
    if (!validateInput(username, ClientState.CHATTING_WITH_USER)) return;

    rl.question('', (message) => {
        if (message.trim() === '') {
            console.log('Message cannot be blank. Please enter your message.');
            promptForMessage();
        } else if (message.toLowerCase() === 'exit') {
            askExitConfirmation();
        } else {
            if (targetUser) {
                userSocket.write(JSON.stringify({
                    type: 'message',
                    to: targetUser,
                    message
                }));
                setState(username, ClientState.WAITING_FOR_USER_RESPONSE);
            } else {
                console.error('No target user selected.');
                setState(username, ClientState.SELECTING_USER);
                userSocket.write(JSON.stringify({ type: 'list' })); // Request updated user list
            }
        }
    });
}

function askExitConfirmation() {
    rl.question('Do you want to quit the program? (yes/no): ', (answer) => {
        if (answer.toLowerCase() === 'yes') {
            console.log('Goodbye!');
            process.exit(0);
        } else {
            console.log('Fetching user list...');
            userSocket.write(JSON.stringify({ type: 'list' }));
            setState(username, ClientState.WAITING_FOR_SERVER_RESPONSE);
        }
    });
}
