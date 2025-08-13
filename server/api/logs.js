const express = require('express');

function createLogsRouter(dbPool) {
    const router = express.Router();

    // GET /api/logs/history - Fetches the user's logging history
    router.get('/history', async (req, res) => {
        const userId = req.user.userId;
        const { types, period = 'day', startDate, endDate, limit } = req.query;
        
        if (!types) { return res.status(400).json({ message: "Log type(s) are required as a query parameter." }); }
        const typeArray = types.split(',').map(t => parseInt(t.trim()));
        if (typeArray.some(isNaN)) { return res.status(400).json({ message: "Invalid 'types' parameter." }); }
        
        let query = `SELECT logID, type, amount, date, tag, foodName FROM dataLogs WHERE userID = ? AND type IN (?)`;
        const queryParams = [userId, typeArray];

        if (period === 'day' && startDate && endDate) {
            query += ` AND date >= ? AND date < ?`;
            queryParams.push(startDate, endDate);
        } else if (period === 'all' && limit) {
        } else if (period !== 'all') {
            console.warn(`Date filtering for period '${period}' is not fully implemented with timezone correction.`);
        }

        query += ` ORDER BY date DESC`;
        if (limit && /^\d+$/.test(limit)) { 
            query += ` LIMIT ?`; 
            queryParams.push(parseInt(limit)); 
        }
        
        try {
            const [logs] = await dbPool.query(query, queryParams);
            res.status(200).json(logs);
        } catch (error) {
            console.error('Error fetching history:', error);
            res.status(500).json({ message: 'Error fetching history.' });
        }
    });

    // POST /api/logs/ 
    router.post('/', async (req, res) => {
        const userId = req.user.userId;
        const { amount, type, date, tag, foodName } = req.body;
        
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