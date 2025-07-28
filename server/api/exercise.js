// fyp/server/api/exercise.js
const express = require('express');
const authenticateToken = require('../lib/authMiddleware.js');

function createExerciseRouter(dbPool) {
    const router = express.Router();

    // --- Unauthenticated Endpoint for Direct IoT Devices (e.g., Wi-Fi Pi) ---
    // This route uses a device token for security instead of a user's JWT.
    router.post('/log/iot', async (req, res) => {
        const deviceToken = req.headers['x-device-token'];
        const { calories } = req.body;

        if (!deviceToken) {
            return res.status(401).json({ message: 'Device token is required.' });
        }
        if (calories == null) {
            return res.status(400).json({ message: 'Calorie data is missing.' });
        }

        try {
            const [users] = await dbPool.query('SELECT userID FROM users WHERE deviceToken = ?', [deviceToken]);
            if (users.length === 0) {
                return res.status(403).json({ message: 'Invalid device token.' });
            }
            const userId = users[0].userID;

            await dbPool.query(
                'INSERT INTO exerciseLogs (userID, caloriesBurnt, timestamp) VALUES (?, ?, ?)',
                [userId, parseFloat(calories), new Date()]
            );

            res.status(201).json({ success: true, message: 'IoT log received.' });
        } catch (error) {
            console.error('Error in IoT calorie log:', error);
            res.status(500).json({ message: 'Server error processing IoT log.' });
        }
    });

    // --- Authenticated Endpoints for the Mobile App ---
    // All routes below this line will be protected and require a valid user JWT.
    
    // POST /api/exercise/log
    // Used by the app to log data received from a Bluetooth device.
    router.post('/log', authenticateToken, async (req, res) => {
        const userId = req.user.userId;
        const { caloriesBurnt } = req.body;

        if (caloriesBurnt == null) {
            return res.status(400).json({ message: 'caloriesBurnt data is required.' });
        }
        try {
            await dbPool.query(
                'INSERT INTO exerciseLogs (userID, caloriesBurnt, timestamp) VALUES (?, ?, ?)',
                [userId, parseFloat(caloriesBurnt), new Date()]
            );
            res.status(201).json({ success: true, message: 'Exercise log received.' });
        } catch (error) {
            console.error('Error logging exercise data:', error);
            res.status(500).json({ message: 'Server error while logging exercise data.' });
        }
    });

    // GET /api/exercise/summary
    // Used by the CalorieBurnt component to fetch aggregated data.
    router.get('/summary', authenticateToken, async (req, res) => {
        const userId = req.user.userId;
        try {
            const today = new Date();
            const year = today.getFullYear();

            // Daily Summary for the last 7 days
            const [dayLogs] = await dbPool.query(
                `SELECT DATE_FORMAT(timestamp, '%Y-%m-%d') as date, SUM(caloriesBurnt) as calories 
                 FROM exerciseLogs WHERE userID = ? AND DATE(timestamp) >= CURDATE() - INTERVAL 6 DAY
                 GROUP BY DATE(timestamp) ORDER BY date DESC`, [userId]
            );

            // Weekly Summary for the last 4 weeks
            const [weekLogs] = await dbPool.query(
                `SELECT YEARWEEK(timestamp, 1) as date, SUM(caloriesBurnt) as calories 
                 FROM exerciseLogs WHERE userID = ? AND YEAR(timestamp) = ?
                 GROUP BY YEARWEEK(timestamp, 1) ORDER BY date DESC LIMIT 4`, [userId, year]
            );

            // Monthly Summary for the last 6 months
            const [monthLogs] = await dbPool.query(
                `SELECT DATE_FORMAT(timestamp, '%Y-%m') as date, SUM(caloriesBurnt) as calories 
                 FROM exerciseLogs WHERE userID = ? AND YEAR(timestamp) = ?
                 GROUP BY DATE_FORMAT(timestamp, '%Y-%m') ORDER BY date DESC LIMIT 6`, [userId, year]
            );
            
            // Format data for the frontend
            const formattedData = {
                Day: dayLogs.map(log => ({
                    date: new Date(log.date).toLocaleDateString('en-GB'),
                    calories: Math.round(log.calories)
                })),
                Week: weekLogs.map(log => {
                    const year = log.date.toString().substring(0, 4);
                    const week = log.date.toString().substring(4);
                    return { date: `Week ${week}, ${year}`, calories: Math.round(log.calories) }
                }),
                Month: monthLogs.map(log => ({
                    date: new Date(log.date).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                    calories: Math.round(log.calories)
                }))
            };
            res.json(formattedData);
        } catch (error) {
            console.error('Error fetching exercise summary:', error);
            res.status(500).json({ message: 'Error fetching exercise summary.' });
        }
    });

    return router;
}

module.exports = createExerciseRouter;