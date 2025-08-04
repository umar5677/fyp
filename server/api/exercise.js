// fyp/server/api/exercise.js
const express = require('express');
const authenticateToken = require('../lib/authMiddleware.js');

function createExerciseRouter(dbPool) {
    const router = express.Router();

    // Unauthenticated Endpoint for Direct IoT Devices
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

    // Authenticated Endpoints for the Mobile App
    
    // POST /api/exercise/log
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
    router.get('/summary', authenticateToken, async (req, res) => {
        const userId = req.user.userId;
        try {
            const today = new Date();
            const year = today.getFullYear();

            const [dayLogs] = await dbPool.query(
                `SELECT DATE_FORMAT(timestamp, '%Y-%m-%d') as date, SUM(caloriesBurnt) as calories 
                 FROM exerciseLogs WHERE userID = ? AND DATE(timestamp) >= CURDATE() - INTERVAL 6 DAY
                 GROUP BY DATE(timestamp) ORDER BY date DESC`, [userId]
            );

            const [weekLogs] = await dbPool.query(
                `SELECT YEARWEEK(timestamp, 1) as date, SUM(caloriesBurnt) as calories 
                 FROM exerciseLogs WHERE userID = ? AND YEAR(timestamp) = ?
                 GROUP BY YEARWEEK(timestamp, 1) ORDER BY date DESC LIMIT 4`, [userId, year]
            );

            const [monthLogs] = await dbPool.query(
                `SELECT DATE_FORMAT(timestamp, '%Y-%m') as date, SUM(caloriesBurnt) as calories 
                 FROM exerciseLogs WHERE userID = ? AND YEAR(timestamp) = ?
                 GROUP BY DATE_FORMAT(timestamp, '%Y-%m') ORDER BY date DESC LIMIT 6`, [userId, year]
            );
            
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
    
    // GET /api/exercise/leaderboard
    router.get('/leaderboard', authenticateToken, async (req, res) => {
        const { period = 'Day' } = req.query; 

        let dateFilterSql = '';
        switch (period) {
            case 'Week':
                dateFilterSql = 'AND YEARWEEK(el.timestamp, 1) = YEARWEEK(CURDATE(), 1)';
                break;
            case 'Month':
                dateFilterSql = 'AND YEAR(el.timestamp) = YEAR(CURDATE()) AND MONTH(el.timestamp) = MONTH(CURDATE())';
                break;
            case 'Day':
            default:
                dateFilterSql = 'AND DATE(el.timestamp) = CURDATE()';
                break;
        }

        try {
            const query = `
                SELECT
                    u.userID,
                    u.first_name,
                    u.last_name,
                    u.pfpUrl,
                    SUM(el.caloriesBurnt) AS totalCalories
                FROM exerciseLogs el
                JOIN users u ON el.userID = u.userID
                WHERE 1=1 ${dateFilterSql}
                GROUP BY u.userID
                ORDER BY totalCalories DESC
                LIMIT 20;
            `;

            const [leaderboardData] = await dbPool.query(query);
            
            const formattedLeaderboard = leaderboardData.map(user => ({
                userID: user.userID,
                name: `${user.first_name} ${user.last_name}`,
                avatar: user.pfpUrl || `https://i.pravatar.cc/150?u=${user.userID}`,
                calories: Math.round(user.totalCalories),
            }));

            res.json(formattedLeaderboard);
        } catch (error) {
            console.error(`Error fetching leaderboard for period "${period}":`, error);
            res.status(500).json({ message: 'Error fetching leaderboard data.' });
        }
    });

    return router;
}

module.exports = createExerciseRouter;