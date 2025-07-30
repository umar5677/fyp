// fyp/server/api/notifications.js
const express = require('express');

function createNotificationsRouter(dbPool) {
    const router = express.Router();

    router.post('/', async (req, res) => {
        const userId = req.user.userId;
        const { message, type } = req.body;

        if (!message || !type) {
            return res.status(400).json({ message: 'Message and type are required.' });
        }

        try {
            const query = 'INSERT INTO notifications (userID, message, type, timestamp) VALUES (?, ?, ?, NOW())';
            await dbPool.query(query, [userId, message, type]);
            res.status(201).json({ success: true, message: 'Notification saved successfully.' });
        } catch (error) {
            console.error('Error saving notification:', error);
            res.status(500).json({ message: 'Failed to save notification.' });
        }
    });


    // Fetches all notifications for the currently logged-in user
    router.get('/', async (req, res) => {
        const userId = req.user.userId;
        try {
            const [notifications] = await dbPool.query(
                'SELECT notificationID, message, type, timestamp, isRead FROM notifications WHERE userID = ? ORDER BY timestamp DESC',
                [userId]
            );
            const formattedNotifications = notifications.map(n => ({
                id: n.notificationID,
                message: n.message,
                type: n.type,
                timestamp: n.timestamp,
                isRead: n.isRead,
            }));
            res.json(formattedNotifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({ message: 'Error fetching notifications.' });
        }
    });

    // Deletes all notifications for the currently logged-in user
    router.delete('/', async (req, res) => {
        const userId = req.user.userId;
        try {
            await dbPool.query(
                'DELETE FROM notifications WHERE userID = ?',
                [userId]
            );
            res.json({ success: true, message: 'All notifications cleared.' });
        } catch (error) {
            console.error('Error clearing notifications:', error);
            res.status(500).json({ message: 'Error clearing notifications.' });
        }
    });

    return router;
}

module.exports = createNotificationsRouter;