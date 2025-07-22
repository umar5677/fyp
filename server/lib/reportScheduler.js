const cron = require('node-cron');
const mysql = require('mysql2/promise');
const dbPool = mysql.createPool({ host: process.env.DB_HOST, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME, 
    waitForConnections: true, 
    connectionLimit: 10, 
    queueLimit: 0 });
const { generateAndEmailReport } = require('./reportGenerator'); // We will create this helper function next

// --- Main Scheduling Function ---
const startScheduledReports = () => {
    console.log('Automated Report Scheduler has been started.');

    // Schedule 1: Run at 7:00 AM every Sunday for WEEKLY reports.
    // Cron format: 'minute hour day-of-month month day-of-week'
    cron.schedule('0 7 * * 0', async () => {
        console.log('Running weekly report job...');
        try {
            // Find all users who want a weekly report
            const [users] = await dbPool.query(
                `SELECT userID, preferredProviderName, preferredProviderEmail 
                 FROM user_thresholds 
                 WHERE automatedReportFrequency = 'Weekly' AND preferredProviderEmail IS NOT NULL`
            );

            if (users.length === 0) {
                console.log('No weekly reports to send today.');
                return;
            }

            console.log(`Found ${users.length} user(s) for weekly reports.`);

            // Define the date range for the last 7 days
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 7);

            // Process each user
            for (const user of users) {
                await generateAndEmailReport(user, startDate, endDate, dbPool, true); 
            }

        } catch (error) {
            console.error('Error during weekly report job:', error);
        }
    });

    // Schedule 2: Run at 7:00 AM on the 1st day of every month for MONTHLY reports.
    cron.schedule('0 7 1 * *', async () => {
        console.log('Running monthly report job...');
        try {
            // Find all users who want a monthly report
            const [users] = await dbPool.query(
                `SELECT userID, preferredProviderName, preferredProviderEmail 
                 FROM user_thresholds 
                 WHERE automatedReportFrequency = 'Monthly' AND preferredProviderEmail IS NOT NULL`
            );
            
            if (users.length === 0) {
                console.log('No monthly reports to send today.');
                return;
            }
            
            console.log(`Found ${users.length} user(s) for monthly reports.`);

            // Define the date range for the previous month
            const endDate = new Date();
            endDate.setDate(0); // Go to the last day of the previous month
            const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

            // Process each user
            for (const user of users) {
                await generateAndEmailReport(user, startDate, endDate, dbPool, true); 
            }

        } catch (error) {
            console.error('Error during monthly report job:', error);
        }
    });
};

module.exports = { startScheduledReports };