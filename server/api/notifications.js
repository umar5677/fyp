// fyp/server/api/notifications.js
const express = require('express');

function createNotificationsRouter(dbPool) {
    const router = express.Router();

    // GET /api/notifications
    // Fetches all notifications for the currently logged-in user
    router.get('/', async (req, res) => {
        const userId = req.user.userId;
        try {
            // --- THIS IS THE FIX ---
            // The column 'id' has been changed to 'notificationID' to match your likely database schema.
            const [notifications] = await dbPool.query(
                'SELECT notificationID, message, type, timestamp, isRead FROM notifications WHERE userID = ? ORDER BY timestamp DESC',
                [userId]
            );
            // We also need to map the result so the frontend receives a consistent 'id' property
            const formattedNotifications = notifications.map(n => ({
                id: n.notificationID, // Map notificationID to id
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

    // DELETE /api/notifications
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