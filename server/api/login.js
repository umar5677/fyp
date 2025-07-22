// server/api/login.js
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

async function authenticateUser(email, password, dbPool) {
    try {
        // Fetches the setProvider flag in addition to existing user data
        const [users] = await dbPool.query('SELECT userID, email, password, is_verified, hasProfileSetup, setProvider FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return { success: false, code: 'INVALID_CREDENTIALS', message: 'User not found.' };
        }
        
        const user = users[0];
        
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return { success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid password.' };
        }

        if (!user.is_verified) {
            return { success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address before logging in.' };
        }
        
        // Returns the user's role (isProvider) and setup status
        return { success: true, user: { 
            userId: user.userID, 
            email: user.email, 
            hasProfileSetup: user.hasProfileSetup,
            isProvider: user.setProvider === 1 // Convert DB value to a boolean
        } };

    } catch (error) {
        console.error('Authentication service error (within login.js):', error);
        throw new Error('Error during authentication process.');
    }
}

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
                if (authResult.code === 'EMAIL_NOT_VERIFIED') {
                    return res.status(401).json({ code: authResult.code, message: authResult.message });
                }
                return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
            }

            const userPayload = { 
                userId: authResult.user.userId,
                // Include isProvider in the JWT payload for backend authorization checks
                isProvider: authResult.user.isProvider 
            };
            const accessTokenSecret = process.env.JWT_SECRET;
            const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;

            const accessToken = jwt.sign(userPayload, accessTokenSecret, { expiresIn: '15m' });
            const refreshToken = jwt.sign(userPayload, refreshTokenSecret, { expiresIn: '7d' });

            res.status(200).json({
                message: 'Login successful!',
                userId: authResult.user.userId,
                accessToken: accessToken,
                refreshToken: refreshToken,
                hasProfileSetup: authResult.user.hasProfileSetup,
                isProvider: authResult.user.isProvider, // Sends the provider flag to the mobile app
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
    hashPassword,
    comparePassword,
};