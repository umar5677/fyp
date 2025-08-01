// /home/ec2-user/fyp/server/api/verifyEmail.js

const express = require('express');

function createVerifyEmailRouter(dbPool) {
    const router = express.Router();

    router.post('/', async (req, res) => {
        try {
            const { token } = req.body;
            if (!token) {
                return res.status(400).json({ message: 'Verification token is required.' });
            }

            const findUserSql = "SELECT * FROM users WHERE verification_token = ? AND token_expires_at > UTC_TIMESTAMP()";
            const [rows] = await dbPool.query(findUserSql, [token]);

            if (rows.length === 0) {
                return res.status(400).json({ message: 'Invalid or expired verification token. Please try registering again.' });
            }
            const user = rows[0];

            const updateUserSql = "UPDATE users SET is_verified = TRUE, verification_token = NULL, token_expires_at = NULL WHERE userID = ?";
            await dbPool.query(updateUserSql, [user.userID]);
            
            res.status(200).json({ message: 'Email verified successfully! You can now download and log in to the app.' });
        } catch (error) {
            console.error('Email verification error:', error);
            res.status(500).json({ message: 'Server error during email verification.' });
        }
    });

    return router;
}

module.exports = createVerifyEmailRouter;