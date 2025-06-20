// api/login.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); 

async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

async function comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
}

// Internal Authentication Logic 
async function authenticateUser(email, password, dbPool) {
    try {
        const [users] = await dbPool.query('SELECT userID, email, password FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return { success: false, message: 'User not found.' };
        }
        const user = users[0];
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return { success: false, message: 'Invalid password.' };
        }
        return { success: true, user: { userId: user.userID, email: user.email } };
    } catch (error) {
        console.error('Authentication service error (within login.js):', error);
        throw new Error('Error during authentication process.');
    }
}


// Router Factory Function 
function createLoginRouter(dbPool) {
    const router = express.Router();

    router.post('/', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        try {
            const authResult = await authenticateUser(email, password, dbPool);
            if (!authResult.success) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            // Create JWT Tokens
            const userPayload = { userId: authResult.user.userId };
            const accessTokenSecret = process.env.JWT_SECRET;
            const refreshTokenSecret = process.env.JWT_REFRESH_SECRET; // A separate, second secret from your .env file

            // 1. Create a short-lived Access Token (15 minutes)
            const accessToken = jwt.sign(userPayload, accessTokenSecret, { expiresIn: '15m' });

            // 2. Create a long-lived Refresh Token (e.g., 7 days)
            const refreshToken = jwt.sign(userPayload, refreshTokenSecret, { expiresIn: '7d' });

            // Store the refresh token in the database against the user
            // To revoke access if needed.
            // await dbPool.query('UPDATE users SET refreshToken = ? WHERE userID = ?', [refreshToken, userPayload.userId]);

            res.status(200).json({
                message: 'Login successful!',
                userId: authResult.user.userId,
                accessToken: accessToken,   // Send the access token
                refreshToken: refreshToken, // Send the refresh token
            });

        } catch (error) {
            console.error('Login route error:', error);
            res.status(500).json({ message: 'Error logging in.', error: error.message });
        }
    });

    return router;
}

module.exports = {
    createLoginRouter,
    hashPassword
};