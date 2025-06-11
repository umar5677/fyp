// server.js
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// --- Database Connection Pool ---
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- Import from API modules ---
const loginApi = require('./api/login.js');
const { createLoginRouter, hashPassword } = loginApi; // hashPassword is needed for signup

const createSignupRouter = require('./api/signup.js'); // Import signup router factory

// --- Mount Routers ---
// Mount the login router, passing the dbPool to its factory function
const loginRouter = createLoginRouter(dbPool);
app.use('/api/login', loginRouter);

// Mount the signup router, passing dbPool and hashPassword to its factory function
const signupRouter = createSignupRouter(dbPool, hashPassword);
app.use('/api/signup', signupRouter);


// --- Other Routes (e.g., Profile) ---
app.get('/profile/:userId', async (req, res) => {
    const userId = req.params.userId;
    if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ message: 'Valid User ID is required in the path.' });
    }
    try {
        const [users] = await dbPool.query(
            'SELECT userID, email, first_name, last_name, dob, weight, height, diabetes FROM users WHERE userID = ?',
            [userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ message: `Profile for user ${userId}`, user: users[0] });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Error fetching profile.', error: error.message });
    }
});


// --- Start the server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    dbPool.getConnection()
        .then(connection => {
            console.log('Successfully connected to the database!');
            connection.release();
        })
        .catch(err => {
            console.error('Failed to connect to the database:', err);
        });
});