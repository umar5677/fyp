const express = require('express');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../lib/emailSender.js');

async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

function createPasswordResetRouter(dbPool) {
    const router = express.Router();

    router.post('/request', async (req, res) => {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email address is required.' });
        }
        try {
            const [users] = await dbPool.query('SELECT userID, first_name FROM users WHERE email = ?', [email]);
            if (users.length === 0) {
                return res.json({ message: 'If an account with this email exists, a reset code has been sent.' });
            }
            const user = users[0];
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            await dbPool.query('UPDATE users SET resetToken = ?, resetTokenExpires = ? WHERE userID = ?', [code, expires, user.userID]);
            
            const emailSubject = 'Your GlucoBites Password Reset Code';
            const emailText = `Hello ${user.first_name || 'User'},\n\nYour password reset code for GlucoBites is: ${code}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.\n\nBest regards,\nThe GlucoBites Team`;
            await sendEmail(email, emailSubject, emailText);
            
            res.json({ message: 'If an account with this email exists, a reset code has been sent.' });
        } catch (error) {
            console.error('Password reset request error:', error);
            res.status(500).json({ message: 'An error occurred while sending the reset code.' });
        }
    });

    router.post('/confirm', async (req, res) => {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'Email, code, and new password are required.' });
        }
        try {
            const [users] = await dbPool.query('SELECT userID, resetToken, resetTokenExpires FROM users WHERE email = ?', [email]);
            if (users.length === 0) {
                return res.status(400).json({ message: 'Invalid reset code or email.' });
            }
            const user = users[0];
            const now = new Date();
            if (user.resetToken !== code || user.resetTokenExpires < now) {
                return res.status(400).json({ message: 'Invalid or expired reset code.' });
            }
            const hashed = await hashPassword(newPassword);
            await dbPool.query(
                'UPDATE users SET password = ?, resetToken = NULL, resetTokenExpires = NULL WHERE userID = ?',
                [hashed, user.userID]
            );
            res.json({ message: 'Password has been updated successfully.' });
        } catch (error) {
            console.error('Password reset confirm error:', error);
            res.status(500).json({ message: 'An error occurred while resetting the password.' });
        }
    });
    
    return router;
}

module.exports = createPasswordResetRouter;