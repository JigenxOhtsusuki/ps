const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const usersFilePath = path.join(__dirname, 'users.json');
const slotsFilePath = path.join(__dirname, 'slots.json');

// Helper function to ensure the data file exists
function ensureFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8'); // Initialize with an empty array
    }
}

// Ensure the data files exist on startup
ensureFileExists(usersFilePath);
ensureFileExists(slotsFilePath);

// Helper function to read JSON data
function readData(filePath, callback) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err && err.code === 'ENOENT') {
            // File does not exist, return empty array
            return callback([]);
        } else if (err) {
            console.error(err);
            return callback([]);
        }
        try {
            callback(JSON.parse(data));
        } catch (parseErr) {
            console.error('Error parsing JSON:', parseErr);
            callback([]);
        }
    });
}

// Helper function to write JSON data
function writeData(filePath, data, callback) {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        }
        callback();
    });
}

// Endpoint to handle saving location and slots
app.post('/set-location', (req, res) => {
    const { latitude, longitude, slots } = req.body;
    if (!latitude || !longitude || !slots) {
        return res.status(400).json({ message: 'Latitude, longitude, and slots are required' });
    }

    readData(slotsFilePath, (slotsData) => {
        const newEntry = { latitude, longitude, slots };
        slotsData.push(newEntry);

        writeData(slotsFilePath, slotsData, () => {
            res.json({ message: 'Location and slots set successfully!' });
        });
    });
});

// Set role endpoint
app.post('/set-role', (req, res) => {
    const { username, role } = req.body;
    if (!role || (role !== 'client' && role !== 'user')) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    readData(usersFilePath, (users) => {
        const user = users.find(user => user.username === username);
        if (user) {
            if (!user.role) {
                user.role = role;
                writeData(usersFilePath, users, () => {
                    res.json({ message: 'Role set successfully', redirectTo: role === 'client' ? 'client.html' : 'user.html' });
                });
            } else {
                res.status(400).json({ message: 'Role already set' });
            }
        } else {
            res.status(400).json({ message: 'User not found' });
        }
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    readData(usersFilePath, (users) => {
        const user = users.find(user => user.username === username && user.password === password);
        if (user) {
            if (!user.role) {
                res.json({ message: 'Login successful', redirectTo: 'first-login.html' });
            } else {
                res.json({ message: 'Login successful', redirectTo: 'dashboard.html' });
            }
        } else {
            res.status(400).send('Invalid username or password');
        }
    });
});

// Registration endpoint
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    readData(usersFilePath, (users) => {
        const existingUser = users.find(user => user.username === username);
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const newUser = { username, password };
        users.push(newUser);

        writeData(usersFilePath, users, () => {
            res.json({ message: 'Registration successful' });
        });
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
