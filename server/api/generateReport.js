// api/GenerateReport.js

const moment = require('moment');
const { generateAndEmailReport, generatePdfBuffer } = require('../lib/reportGenerator');

module.exports = function createGenerateReportRoute(dbPool) {
  return async (req, res) => {
    try {
      const { action, providerEmail, providerName, sections, startDate, endDate } = req.body;
      const userId = req.user.userId;

      const user = {
          userID: userId,
          preferredProviderEmail: providerEmail,
          preferredProviderName: providerName,
      };

      if (action === 'email') {
        await generateAndEmailReport(user, new Date(startDate), new Date(endDate), dbPool, false);

        const logEmailQuery = 'INSERT INTO reportLogs (userID, actionType, recipientEmail, recipientName, startDate, endDate, sections) VALUES (?, ?, ?, ?, ?, ?, ?)';
        await dbPool.query(logEmailQuery, [userId, 'email', providerEmail, providerName, startDate, endDate, sections.join(',')]);
        
        return res.status(200).json({ message: 'Email with PDF report sent successfully.' });
      
      } else if (action === 'export') {
        const { pdfBuffer, filename } = await generatePdfBuffer(user, new Date(startDate), new Date(endDate), dbPool, false);

        const logExportQuery = 'INSERT INTO reportLogs (userID, actionType, startDate, endDate, sections) VALUES (?, ?, ?, ?, ?)';
        await dbPool.query(logExportQuery, [userId, 'export', startDate, endDate, sections.join(',')]);

        // Send the PDF back to the app
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);

      } else {
        return res.status(400).json({ message: 'Invalid action specified.' });
      }
    } catch (err) {
      console.error('Manual Report Generation Error:', err);
      res.status(500).json({ error: 'Failed to generate report.', details: err.message });
    }
  };
};