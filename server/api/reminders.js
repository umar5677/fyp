// fyp/server/api/reminders.js
const express = require('express');

function createRemindersRouter(dbPool) {
    const router = express.Router();

    // GET all reminders for the logged-in user
    router.get('/', async (req, res) => {
        try {
            const [reminders] = await dbPool.query(
                'SELECT reminderID, label, time, repeatDays, isEnabled, notificationIDs FROM reminders WHERE userID = ?',
                [req.user.userId]
            );
            res.json(reminders);
        } catch (error) {
            console.error('Error fetching reminders:', error);
            res.status(500).json({ message: 'Error fetching reminders.' });
        }
    });

    // POST a new reminder for the logged-in user
    router.post('/', async (req, res) => {
        const { label, time, repeatDays, notificationIDs } = req.body;
        if (!label || !time) {
            return res.status(400).json({ message: 'Label and time are required.' });
        }
        try {
            // Save the new notificationIDs to the database
            const [result] = await dbPool.query(
                'INSERT INTO reminders (userID, label, time, repeatDays, isEnabled, notificationIDs) VALUES (?, ?, ?, ?, ?, ?)',
                [req.user.userId, label, time, JSON.stringify(repeatDays || []), 1, JSON.stringify(notificationIDs || [])]
            );
            res.status(201).json({ reminderID: result.insertId, message: 'Reminder created.' });
        } catch (error) {
            console.error('Error creating reminder:', error);
            res.status(500).json({ message: 'Error creating reminder.' });
        }
    });

    // PUT (update) an existing reminder
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { label, time, repeatDays, isEnabled, notificationIDs } = req.body;
        try {
            const [result] = await dbPool.query(
                'UPDATE reminders SET label = ?, time = ?, repeatDays = ?, isEnabled = ?, notificationIDs = ? WHERE reminderID = ? AND userID = ?',
                [label, time, JSON.stringify(repeatDays), isEnabled, JSON.stringify(notificationIDs), id, req.user.userId]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Reminder not found or you are not authorized.' });
            }
            res.json({ message: 'Reminder updated.' });
        } catch (error) {
            console.error('Error updating reminder:', error);
            res.status(500).json({ message: 'Error updating reminder.' });
        }
    });

    // DELETE a specific reminder
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const [result] = await dbPool.query(
                'DELETE FROM reminders WHERE reminderID = ? AND userID = ?',
                [id, req.user.userId]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Reminder not found or you are not authorized.' });
            }
            res.json({ message: 'Reminder deleted.' });
        } catch (error) {
            console.error('Error deleting reminder:', error);
            res.status(500).json({ message: 'Error deleting reminder.' });
        }
    });

    return router;
}

module.exports = createRemindersRouter;