// fyp/server/api/verifyEmailChange.js
const express = require('express');

function createVerifyEmailChangeRouter(dbPool) {
    const router = express.Router();

    router.post('/', async (req, res) => {
        try {
            const { token } = req.body;
            if (!token) {
                return res.status(400).json({ message: 'Verification token is required.' });
            }

            // Find user with a matching, unexpired token
            const findUserSql = "SELECT userID, new_email_pending FROM users WHERE email_change_token = ? AND email_change_token_expires > UTC_TIMESTAMP()";
            const [rows] = await dbPool.query(findUserSql, [token]);

            if (rows.length === 0) {
                return res.status(400).json({ message: 'Invalid or expired verification token. Please try changing your email again.' });
            }
            const user = rows[0];

            // Update the email and clear the temporary fields
            const updateUserSql = "UPDATE users SET email = ?, new_email_pending = NULL, email_change_token = NULL, email_change_token_expires = NULL WHERE userID = ?";
            await dbPool.query(updateUserSql, [user.new_email_pending, user.userID]);
            
            res.status(200).json({ message: 'Email address updated successfully! You can now use this email to log in.' });
        } catch (error) {
            console.error('Email change verification error:', error);
            res.status(500).json({ message: 'Server error during email change verification.' });
        }
    });

    return router;
}

module.exports = createVerifyEmailChangeRouter;