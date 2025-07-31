// fyp/server/lib/reportScheduler.js

const cron = require('node-cron');
const mysql = require('mysql2/promise');
const dbPool = mysql.createPool({
    host: process.env.DB_HOST, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME, 
    waitForConnections: true, 
    connectionLimit: 10, 
    queueLimit: 0 
});
const { generateAndEmailReport } = require('./reportGenerator');

const startScheduledReports = () => {
    console.log('Automated Task Scheduler has been started.');

    // Cron Job to reset the weekly question count for all users.
    // This runs at 00:00 (midnight) every Sunday.
    cron.schedule('0 0 * * 0', async () => {
        console.log('Running weekly Q&A limit reset job...');
        try {
            // This single query efficiently resets the counter for everyone.
            const [result] = await dbPool.query(
                `UPDATE users SET questionsAskedThisWeek = 0`
            );
            
            console.log(`Weekly question limit reset successfully for ${result.affectedRows} user(s).`);

        } catch (error) {
            console.error('CRITICAL ERROR during weekly Q&A limit reset job:', error);
        }
    });

    // Cron job for sending WEEKLY email reports.
    // This runs at 7 AM every Sunday.
    cron.schedule('0 7 * * 0', async () => {
        console.log('Running weekly report job...');
        try {
            // Find all users who want a weekly report and have a provider email set.
            const [users] = await dbPool.query(
                `SELECT u.userID, ut.preferredProviderName, ut.preferredProviderEmail 
                 FROM users u
                 JOIN user_thresholds ut ON u.userID = ut.userID
                 WHERE ut.automatedReportFrequency = 'Weekly' AND ut.preferredProviderEmail IS NOT NULL`
            );

            if (users.length === 0) {
                console.log('No weekly reports to send today.');
                return;
            }

            console.log(`Found ${users.length} user(s) for weekly reports.`);

            // Define the date range for the last 7 days.
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 7);

            // Process and email a report for each user.
            for (const user of users) {
                await generateAndEmailReport(user, startDate, endDate, dbPool, true); 
            }

        } catch (error) {
            console.error('Error during weekly report job:', error);
        }
    });
    
    // Cron job for sending MONTHLY email reports.
    // This runs at 7 AM on the 1st day of every month.
    cron.schedule('0 7 1 * *', async () => {
        console.log('Running monthly report job...');
        try {
            // Find all users who want a monthly report and have a provider email set.
            const [users] = await dbPool.query(
                `SELECT u.userID, ut.preferredProviderName, ut.preferredProviderEmail 
                 FROM users u
                 JOIN user_thresholds ut ON u.userID = ut.userID
                 WHERE ut.automatedReportFrequency = 'Monthly' AND ut.preferredProviderEmail IS NOT NULL`
            );
            
            if (users.length === 0) {
                console.log('No monthly reports to send today.');
                return;
            }
            
            console.log(`Found ${users.length} user(s) for monthly reports.`);

            // Define the date range for the entire previous month.
            const endDate = new Date();
            endDate.setDate(0); // This correctly goes to the last day of the previous month.
            const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

            // Process and email a report for each user.
            for (const user of users) {
                await generateAndEmailReport(user, startDate, endDate, dbPool, true); 
            }

        } catch (error) {
            console.error('Error during monthly report job:', error);
        }
    });
};

module.exports = { startScheduledReports };