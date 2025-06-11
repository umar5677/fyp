// api/signup.js
const express = require('express');

// This module exports a function that takes dependencies (dbPool, hashPassword)
// and returns the configured router.
module.exports = function (dbPool, hashPassword) {
    const router = express.Router();

    // POST / (which will be mounted, e.g., at /api/signup/)
    router.post('/', async (req, res) => {
        const { email, password, first_name, last_name, dob, weight, height, diabetes } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        try {
            // Check if user already exists
            const [existingUsers] = await dbPool.query('SELECT userID FROM users WHERE email = ?', [email]);
            if (existingUsers.length > 0) {
                return res.status(409).json({ message: 'Email already in use.' });
            }

            // Hash the password using the passed-in hashPassword function
            const hashedPassword = await hashPassword(password);

            // Insert the new user
            const [result] = await dbPool.query(
                'INSERT INTO users (email, password, first_name, last_name, dob, weight, height, diabetes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [email, hashedPassword, first_name || null, last_name || null, dob || null, weight || null, height || null, (typeof diabetes === 'boolean' ? diabetes : null)]
            );

            res.status(201).json({ message: 'User created successfully!', userId: result.insertId });

        } catch (error) {
            console.error('Signup route error (/api/signup):', error);
            res.status(500).json({ message: 'Error creating user.', error: error.message });
        }
    });

    return router; // Return the configured router
};