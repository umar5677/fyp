const express = require('express');
const bcrypt = require('bcryptjs');
const { SESClient, VerifyEmailIdentityCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: process.env.AWS_REGION });

function createAdminRouter(db) {
    const router = express.Router();

    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }
        try {
            const sql = 'SELECT * FROM admins WHERE username = ?';
            const [rows] = await db.execute(sql, [username]);
            if (rows.length === 0) {
                console.error(`Admin Login Attempt Failed: Username "${username}" not found.`);
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            const user = rows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                console.log(`Admin Login Success: User "${username}" successfully authenticated.`);
                res.status(200).json({ message: 'Login successful.' });
            } else {
                console.error(`Admin Login Attempt Failed: Invalid password for username "${username}".`);
                res.status(401).json({ message: 'Invalid credentials' });
            }
        } catch (error) {
            console.error('CRITICAL ADMIN LOGIN ERROR:', error);
            res.status(500).json({ message: 'Server error during login process.' });
        }
    });

    router.get('/users', async (req, res) => {
        try {
            const sql = 'SELECT userID, email, is_verified, setPremium, setProvider, isSuspended FROM users';
            const [users] = await db.execute(sql);
            res.status(200).json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Server error while fetching users.' });
        }
    });

    router.post('/users', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        try {
            const checkUserSql = 'SELECT userID FROM users WHERE email = ?';
            const [existingUsers] = await db.execute(checkUserSql, [email]);
            if (existingUsers.length > 0) {
                return res.status(409).json({ message: 'A user with this email already exists.' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const insertSql = 'INSERT INTO users (email, password) VALUES (?, ?)';
            await db.execute(insertSql, [email, hashedPassword]);
            res.status(201).json({ message: 'User created successfully.' });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ message: 'Server error while creating user.' });
        }
    });

    router.delete('/users/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const sql = 'DELETE FROM users WHERE userID = ?';
            const [result] = await db.execute(sql, [id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }
            res.status(200).json({ message: 'User deleted successfully.' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ message: 'Server error while deleting user.' });
        }
    });

    router.get('/verifyhp', async (req, res) => {
        try {
            const sql = 'SELECT verifyID, userID, dateCreated, provType, document, isVerified FROM verifyHP';
            const [applications] = await db.execute(sql);
            res.status(200).json(applications);
        } catch (error) {
            console.error('Error fetching applications:', error);
            res.status(500).json({ message: 'Server error while fetching applications.' });
        }
    });

    router.patch('/verifyhp/:id', async (req, res) => {
        const { id: verifyID } = req.params;
        const { isVerified: newStatus } = req.body;
        if (newStatus === undefined || (newStatus !== 0 && newStatus !== 1)) {
            return res.status(400).json({ message: 'Invalid verification status provided. Must be 0 or 1.' });
        }
        let connection;
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            const [appRows] = await connection.execute(
                'SELECT v.userID, u.email FROM verifyHP v JOIN users u ON v.userID = u.userID WHERE v.verifyID = ?', 
                [verifyID]
            );

            if (appRows.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: 'Verification application not found.' });
            }
            
            const { userID, email: hpEmail } = appRows[0];

            await connection.execute('UPDATE verifyHP SET isVerified = ? WHERE verifyID = ?', [newStatus, verifyID]);
            await connection.execute('UPDATE users SET setProvider = ? WHERE userID = ?', [newStatus, userID]);

            await connection.commit();

            if (newStatus === 1 && hpEmail) {
                try {
                    const verifyEmailCommand = new VerifyEmailIdentityCommand({ EmailAddress: hpEmail });
                    await sesClient.send(verifyEmailCommand);
                    console.log(`Successfully sent SES verification request to ${hpEmail}`);
                } catch (sesError) {
                    console.error(`Failed to send SES verification email to ${hpEmail}:`, sesError);
                }
            }

            res.status(200).json({ message: 'Application and user provider status updated successfully.' });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Error during verification transaction:', error);
            res.status(500).json({ message: 'Server error during verification process.' });
        } finally {
            if (connection) connection.release();
        }
    });

    const createToggleRouteHandler = (fieldName) => {
        return async (req, res) => {
            const { id } = req.params;
            const value = req.body[fieldName];
            if (value === undefined || (value !== 0 && value !== 1)) {
                return res.status(400).json({ message: `Invalid ${fieldName} value. Must be 0 or 1.` });
            }
            try {
                const sql = `UPDATE users SET ${fieldName} = ? WHERE userID = ?`;
                const [result] = await db.execute(sql, [value, id]);
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'User not found.' });
                }
                res.status(200).json({ message: `User ${fieldName} status updated successfully.` });
            } catch (error) {
                console.error(`Error updating user ${fieldName}:`, error);
                res.status(500).json({ message: 'Server error while updating user status.' });
            }
        };
    };

    router.patch('/users/:id/isSuspended', createToggleRouteHandler('isSuspended'));
    router.patch('/users/:id/setPremium', createToggleRouteHandler('setPremium'));
    router.patch('/users/:id/is_verified', createToggleRouteHandler('is_verified'));
    router.patch('/users/:id/setProvider', createToggleRouteHandler('setProvider'));

    const getAdminPostQuery = `
    SELECT
        p.id, p.title, p.content, p.createdAt, p.likeCount, p.commentCount,
        u.first_name, u.last_name, u.pfpUrl, u.email AS authorEmail,
        COALESCE(v.isVerified, 0) AS authorIsHpVerified,
        GROUP_CONCAT(pi.imageUrl) as images,
        (SELECT COUNT(*) FROM post_reports WHERE postID = p.id) as reportCount
    FROM posts p
    JOIN users u ON p.userID = u.userID
    LEFT JOIN verifyHP v ON p.userID = v.userID
    LEFT JOIN post_images pi ON p.id = pi.postID
`;

    router.get('/posts', async (req, res) => {
        try {
            const sql = `${getAdminPostQuery} GROUP BY p.id ORDER BY p.createdAt DESC`;
            const [posts] = await db.execute(sql);
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error fetching all posts for admin:', error);
            res.status(500).json({ message: 'Server error fetching posts.' });
        }
    });

    router.get('/posts/reported', async (req, res) => {
        try {
            const sql = `
            ${getAdminPostQuery}
            WHERE EXISTS (SELECT 1 FROM post_reports pr WHERE pr.postID = p.id)
            GROUP BY p.id
            ORDER BY reportCount DESC, p.createdAt DESC
        `;
            const [posts] = await db.execute(sql);
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error fetching reported posts:', error);
            res.status(500).json({ message: 'Server error fetching reported posts.' });
        }
    });
    
    router.delete('/posts/:id/reports', async (req, res) => {
        const { id: postId } = req.params;
        try {
            await db.execute('DELETE FROM post_reports WHERE postID = ?', [postId]);
            res.status(200).json({ message: 'All reports for this post have been cleared.' });
        } catch (error) {
            console.error(`Error clearing reports for post ${postId}:`, error);
            res.status(500).json({ message: 'Server error while clearing reports.' });
        }
    });

    router.delete('/posts/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const [result] = await db.execute('DELETE FROM posts WHERE id = ?', [id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Post not found.' });
            }
            res.status(200).json({ message: 'Post deleted successfully.' });
        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).json({ message: 'Server error while deleting post.' });
        }
    });
    
    router.get('/posts/:postId/comments', async (req, res) => {
        const { postId } = req.params;
        try {
            const sql = `
                SELECT 
                    c.id, c.commentText, c.createdAt, 
                    u.email as authorEmail, u.first_name, u.last_name
                FROM post_comments c
                JOIN users u ON c.userID = u.userID
                WHERE c.postID = ?
                ORDER BY c.createdAt ASC;
            `;
            const [comments] = await db.execute(sql, [postId]);
            res.status(200).json(comments);
        } catch (error) {
            console.error(`Error fetching comments for post ${postId}:`, error);
            res.status(500).json({ message: 'Server error fetching comments.' });
        }
    });

    router.get('/comments/reported', async (req, res) => {
        try {
            const sql = `
            SELECT 
                c.id, c.commentText, c.createdAt, c.likeCount,
                u.first_name, u.last_name, u.email as authorEmail,
                p.title as postTitle, p.id as postID,
                (SELECT COUNT(*) FROM comment_reports WHERE commentID = c.id) as reportCount
            FROM post_comments c
            JOIN users u ON c.userID = u.userID
            JOIN posts p ON c.postID = p.id
            WHERE EXISTS (SELECT 1 FROM comment_reports cr WHERE cr.commentID = c.id)
            ORDER BY reportCount DESC, c.createdAt DESC
        `;
            const [comments] = await db.execute(sql);
            res.status(200).json(comments);
        } catch (error) {
            console.error('Error fetching reported comments:', error);
            res.status(500).json({ message: 'Server error fetching reported comments.' });
        }
    });

    router.delete('/comments/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const [result] = await db.execute('DELETE FROM post_comments WHERE id = ?', [id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Comment not found.' });
            }
            res.status(200).json({ message: 'Comment deleted successfully.' });
        } catch (error) {
            console.error('Error deleting comment:', error);
            res.status(500).json({ message: 'Server error while deleting comment.' });
        }
    });

    router.delete('/comments/:id/reports', async (req, res) => {
        const { id: commentId } = req.params;
        try {
            await db.execute('DELETE FROM comment_reports WHERE commentID = ?', [commentId]);
            res.status(200).json({ message: 'All reports for this comment have been cleared.' });
        } catch (error) {
            console.error(`Error clearing reports for comment ${commentId}:`, error);
            res.status(500).json({ message: 'Server error while clearing reports.' });
        }
    });

    return router;
}

module.exports = createAdminRouter;