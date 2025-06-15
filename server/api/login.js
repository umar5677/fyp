// api/login.js
const express = require('express');
const bcrypt = require('bcryptjs'); 

// Helper Function for Hashing Passwords (to be exported)
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// Helper Function for Comparing Passwords (used internally)
async function comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
}

// "Internal" Authentication Logic Function
async function authenticateUser(email, password, dbPool) {
    try {
        const [users] = await dbPool.query('SELECT userID, email, password FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return { success: false, message: 'User not found.' };
        }
        const user = users[0];
        const isMatch = await comparePassword(password, user.password); // Uses internal comparePassword

        if (!isMatch) {
            return { success: false, message: 'Invalid password.' };
        }
        return { success: true, user: { userId: user.userID, email: user.email } };
    } catch (error) {
        console.error('Authentication service error (within login.js):', error);
        throw new Error('Error during authentication process.');
    }
}

// Router Factory Function (to be exported)
function createLoginRouter(dbPool) {
    const router = express.Router();

    // POST / (which will be mounted at /api/login/)
    router.post('/', async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        try {
            // Call the internal authenticateUser function, passing dbPool
            const authResult = await authenticateUser(email, password, dbPool);

            if (!authResult.success) {
                return res.status(401).json({ message: 'Invalid email or password.' });
            }

            res.status(200).json({
                message: 'Login successful!',
                userId: authResult.user.userId,
                email: authResult.user.email
            });

        } catch (error) {
            console.error('Login route error (/api/login):', error);
            res.status(500).json({ message: 'Error logging in.', error: error.message });
        }
    });

    return router;
}

// Export both the router factory and the hashPassword utility
module.exports = {
    createLoginRouter,
    hashPassword
};