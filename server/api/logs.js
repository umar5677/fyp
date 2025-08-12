const express = require('express');

function createLogsRouter(dbPool) {
    const router = express.Router();

    // GET /api/logs/history - Fetches the user's logging history
    router.get('/history', async (req, res) => {
        const userId = req.user.userId;
        const { types, period = 'day', targetDate, limit } = req.query;
        if (!types) { return res.status(400).json({ message: "Log type(s) are required as a query parameter." }); }
        const typeArray = types.split(',').map(t => parseInt(t.trim()));
        if (typeArray.some(isNaN)) { return res.status(400).json({ message: "Invalid 'types' parameter." }); }
        
        let query = `SELECT logID, type, amount, date, tag, foodName FROM dataLogs WHERE userID = ? AND type IN (?)`;
        const queryParams = [userId, typeArray];

        if (period !== 'all') {
            // The targetDate from the client IS the start of their local day, but in UTC.
            const clientLocalDate = targetDate ? new Date(targetDate) : new Date();

            if (period === 'day') {
                const startOfDay = new Date(clientLocalDate);
                const endOfDay = new Date(startOfDay);
                endOfDay.setDate(endOfDay.getDate() + 1); // The next day at 00:00

                query += ` AND date >= ? AND date < ?`;
                queryParams.push(startOfDay, endOfDay);

            } else if (period === 'week') {
                const startOfWeek = new Date(clientLocalDate);
                // Set to the beginning of the week (Sunday) based on the client's provided date.
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 7);

                query += ` AND date >= ? AND date < ?`;
                queryParams.push(startOfWeek, endOfWeek);

            } else if (period === 'month') {
                const year = clientLocalDate.getFullYear();
                const month = clientLocalDate.getMonth();
                const startOfMonth = new Date(year, month, 1);
                const endOfMonth = new Date(year, month + 1, 1);
                
                query += ` AND date >= ? AND date < ?`;
                queryParams.push(startOfMonth, endOfMonth);
            }
        }

        query += ` ORDER BY date DESC`;
        if (limit && /^\d+$/.test(limit)) { query += ` LIMIT ?`; queryParams.push(parseInt(limit)); }
        
        try {
            const [logs] = await dbPool.query(query, queryParams);
            // The mysql2 driver returns Date objects that JSON.stringify converts to proper ISO UTC strings,
            // which is what the client app expects.
            res.status(200).json(logs);
        } catch (error) {
            console.error('Error fetching history:', error);
            res.status(500).json({ message: 'Error fetching history.' });
        }
    });

    // POST /api/logs/ - Creates a new log entry
    router.post('/', async (req, res) => {
        const userId = req.user.userId;
        const { amount, type, date, tag, foodName } = req.body;
        
        // The `date` from the client is an ISO 8601 string in UTC. This is the correct value to insert.
        // If no date is provided, it's a new log for 'now'.
        const dateToInsert = date ? new Date(date) : new Date();

        if (amount == null || type == null) { return res.status(400).json({ message: 'Amount and type are required.' }); }
        if (type === 3 && !tag) { return res.status(400).json({ message: 'A tag (e.g., Fasting, Pre-Meal) is required for blood glucose logs.' }); }
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount < 0) { return res.status(400).json({ message: 'A valid, non-negative amount is required.' }); }
        
        try {
            await dbPool.query(
                'INSERT INTO dataLogs (userID, type, amount, date, tag, foodName) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, type, numericAmount, dateToInsert, tag || null, foodName || null]
            );
            res.status(201).json({ success: true, message: 'Log created successfully!' });
        } catch (error) {
            console.error('Error creating log:', error);
            res.status(500).json({ success: false, message: 'Error creating log.' });
        }
    });

    // PUT /api/logs/:logId - Updates an existing log entry
    router.put('/:logId', async (req, res) => {
        const { logId } = req.params;
        const { amount, tag } = req.body;
        if (amount === undefined || tag === undefined) { return res.status(400).json({ success: false, message: 'Amount and tag are required for an update.' }); }
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount < 0) { return res.status(400).json({ success: false, message: 'A valid, non-negative amount is required.' }); }
        try {
            await dbPool.query(
                `UPDATE dataLogs SET amount = ?, tag = ? WHERE logID = ? AND userID = ?`,
                [numericAmount, tag, logId, req.user.userId]
            );
            res.status(200).json({ success: true, message: 'Log updated successfully.' });
        } catch (error) {
            console.error('Error updating log:', error);
            res.status(500).json({ success: false, message: 'Error updating log.' });
        }
    });

    // DELETE /api/logs/:logId - Deletes a log entry
    router.delete('/:logId', async (req, res) => {
        const { logId } = req.params;
        if (!logId) return res.status(400).json({ message: "Log ID is required." });
        try {
            await dbPool.query(`DELETE FROM dataLogs WHERE logID = ? AND userID = ?`, [logId, req.user.userId]);
            res.status(200).json({ success: true, message: 'Log deleted successfully.' });
        } catch (error) {
            console.error('Error deleting log:', error);
            res.status(500).json({ message: 'Error deleting log.' });
        }
    });

    return router;
}

module.exports = createLogsRouter;