const express = require('express');
const router = express.Router();

module.exports = function createUserSettingsRoutes(dbPool) {

  // GET the user's preferred provider
  router.get('/provider', async (req, res) => {
    try {
        const userId = req.user.userId;
        const query = `
            SELECT p.userID, p.first_name, p.last_name, p.email
            FROM user_thresholds ut
            JOIN users p ON ut.preferredProviderUserID = p.userID
            WHERE ut.userID = ?;
        `;
        const [rows] = await dbPool.query(query, [userId]);

        if (rows.length > 0) {
            const provider = rows[0];
            res.json({ userID: provider.userID, name: `${provider.first_name} ${provider.last_name}`, email: provider.email });
        } else {
            res.json({});
        }
    } catch (err) {
        console.error('Error fetching preferred provider:', err);
        res.status(500).json({ message: 'Failed to get preferred provider.' });
    }
  });

  // SAVE the user's preferred provider
  router.post('/provider', async (req, res) => {
    try {
        const { providerUserID } = req.body;
        const userId = req.user.userId;

        if (!providerUserID) {
            return res.status(400).json({ message: 'providerUserID is required.' });
        }
        
        const query = `
            INSERT INTO user_thresholds (userID, preferredProviderUserID)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                preferredProviderUserID = VALUES(preferredProviderUserID);
        `;
        await dbPool.query(query, [userId, providerUserID]);
        res.status(200).json({ message: 'Preferred provider saved successfully.' });
    } catch (err) {
        console.error('Error saving preferred provider:', err);
        res.status(500).json({ message: 'Failed to save preferred provider.' });
    }
  });

  // GET the user's report preference
  router.get('/report-preference', async (req, res) => {
    const userId = req.user.userId;
    try {
        const [rows] = await dbPool.query('SELECT automatedReportFrequency FROM user_thresholds WHERE userID = ?', [userId]);
        if (rows.length === 0) return res.json({ frequency: 'Disabled' });
        res.json({ frequency: rows[0].automatedReportFrequency });
    } catch (error) {
        console.error("Error fetching report preference:", error);
        res.status(500).json({ message: 'Failed to fetch preference.' });
    }
  });

  // SAVE the user's report preference
  router.put('/report-preference', async (req, res) => {
    const userId = req.user.userId;
    const { frequency } = req.body;
    const validFrequencies = ['Disabled', 'Weekly', 'Monthly'];
    if (!frequency || !validFrequencies.includes(frequency)) {
        return res.status(400).json({ message: 'A valid frequency is required.' });
    }
    try {
        const query = `
            INSERT INTO user_thresholds (userID, automatedReportFrequency) VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE automatedReportFrequency = ?
        `;
        await dbPool.query(query, [userId, frequency, frequency]);
        res.status(200).json({ success: true, message: 'Reporting preference updated successfully.' });
    } catch (error) {
        console.error("Error updating report preference:", error);
        res.status(500).json({ message: 'Failed to update preference.' });
    }
  });

  return router;
};