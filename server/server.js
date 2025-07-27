require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken'); 
const authenticateToken = require('./lib/authMiddleware.js');
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const { startScheduledReports } = require('./lib/reportScheduler.js');

// Routers
const createPasswordResetRouter = require('./api/passwordReset.js');
const createReviewsRouter = require('./api/reviews.js');
const loginApi = require('./api/login.js');
const createGenerateReportRoute = require('./api/generateReport.js');
const createUserSettingsRoutes = require('./api/userSettings.js');
const createProvidersRouter = require('./api/providers.js');
const createOcrRouter = require('./api/ocr.js');
const createPredictionsRouter = require('./api/predictions.js');
const createQnaRouter = require('./api/qna.js');
const createProviderRouter = require('./api/provider.js');
const createAiRouter = require('./api/aiFoodScan.js');
const createNotificationsRouter = require('./api/notifications.js');
const createRemindersRouter = require('./api/reminders.js');
const createPostsRouter = require('./api/posts.js');


const app = express();
app.use(express.json({ limit: '10mb' }));

const dbPool = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, waitForConnections: true, connectionLimit: 10, queueLimit: 0 });

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_PROFILE_PIC_BUCKET, 
        metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
        key: (req, file, cb) => {
            const userId = req.user.userId;
            const fullPath = `profile-pictures/${userId}/profile`;
            cb(null, fullPath);
        }
    })
});


// PUBLIC ROUTES 
app.use('/api/login', loginApi.createLoginRouter(dbPool));
app.use('/api/password-reset', createPasswordResetRouter(dbPool));

app.use('/api/reviews', createReviewsRouter(dbPool));


app.post('/api/token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: 'Refresh Token is required.' });

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Refresh Token is not valid.' });
        
        const payload = { 
            userId: user.userId, 
            isProvider: user.isProvider
        };

        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.json({ accessToken });
    });
});


// PROTECTED ROUTES
app.use(authenticateToken);

app.post('/api/upload/profile-picture', upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    const imageUrl = req.file.location;
    try {
        await dbPool.query('UPDATE users SET pfpUrl = ? WHERE userID = ?', [imageUrl, req.user.userId]);
        res.status(200).json({ success: true, imageUrl });
    } catch (error) {
        res.status(500).json({ success: false, message: 'File uploaded, but failed to save link.' });
    }
});

// MOUNT FULLY-PROTECTED ROUTERS
app.use('/api/user-settings', createUserSettingsRoutes(dbPool));
app.post('/api/generate-report', createGenerateReportRoute(dbPool));
app.use('/api/providers', createProvidersRouter(dbPool));
app.use('/api/ocr', createOcrRouter(dbPool));
app.use('/api/predictions', createPredictionsRouter(dbPool));
app.use('/api/qna', createQnaRouter(dbPool));
app.use('/api/provider', createProviderRouter(dbPool));
app.use('/api/ai', createAiRouter(dbPool));
app.use('/api/notifications', createNotificationsRouter(dbPool));
app.use('/api/reminders', createRemindersRouter(dbPool));
app.use('/api/posts', createPostsRouter(dbPool));


app.put('/api/profile-setup', async (req, res) => {
    const userId = req.user.userId;
    const { dob, weight, height, diabetesType, gender, isInsulin } = req.body;
    if (dob === undefined || weight === undefined || height === undefined || gender === null || diabetesType === null || isInsulin === undefined) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    try {
        await dbPool.query(
            `UPDATE users SET dob = ?, weight = ?, height = ?, diabetes = ?, gender = ?, isInsulin = ?, hasProfileSetup = 1 WHERE userID = ?`,
            [dob, weight, height, diabetesType, gender, isInsulin, userId]
        );
        res.status(200).json({ success: true, message: 'Profile setup complete!' });
    } catch (error) {
        console.error('Profile setup error:', error);
        res.status(500).json({ message: 'Error updating profile.' });
    }
});

app.post('/api/profile/change-password', async (req, res) => {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Your new password must be at least 8 characters long.' });
    }
    try {
        const [users] = await dbPool.query('SELECT password FROM users WHERE userID = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const user = users[0];
        const isMatch = await loginApi.comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }
        const newHashedPassword = await loginApi.hashPassword(newPassword);
        await dbPool.query('UPDATE users SET password = ? WHERE userID = ?', [newHashedPassword, userId]);
        res.status(200).json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Error changing password.' });
    }
});

app.get('/api/profile', async (req, res) => {
    const userId = req.user.userId;
    try {
        const [users] = await dbPool.query(
            'SELECT userID, email, first_name, last_name, dob, weight, height, gender, diabetes, isInsulin, pfpUrl, hasProfileSetup, setProvider AS isProvider FROM users WHERE userID = ?', 
            [userId]
        );
        if (users.length === 0) return res.status(404).json({ message: 'User not found.' });
        res.json({ user: users[0] });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Error fetching profile.' });
    }
});

app.put('/api/profile', async (req, res) => {
    const userId = req.user.userId;
    const { first_name, last_name, email, dob, height, weight, gender, diabetes, isInsulin } = req.body;
    let queryFields = [];
    let queryParams = [];
    if (req.body.hasOwnProperty('first_name')) { queryFields.push('first_name = ?'); queryParams.push(first_name); }
    if (req.body.hasOwnProperty('last_name')) { queryFields.push('last_name = ?'); queryParams.push(last_name); }
    if (req.body.hasOwnProperty('email')) { queryFields.push('email = ?'); queryParams.push(email); }
    if (req.body.hasOwnProperty('dob')) { queryFields.push('dob = ?'); queryParams.push(dob); }
    if (req.body.hasOwnProperty('height') && height != null) { queryFields.push('height = ?'); queryParams.push(parseFloat(height)); }
    if (req.body.hasOwnProperty('weight') && weight != null) { queryFields.push('weight = ?'); queryParams.push(parseFloat(weight)); }
    if (req.body.hasOwnProperty('gender')) { queryFields.push('gender = ?'); queryParams.push(gender); }
    if (req.body.hasOwnProperty('diabetes')) { queryFields.push('diabetes = ?'); queryParams.push(diabetes); }
    if (req.body.hasOwnProperty('isInsulin')) { queryFields.push('isInsulin = ?'); queryParams.push(isInsulin); }
    if (queryFields.length === 0) {
        return res.status(400).json({ message: 'No valid fields to update.' });
    }
    const queryString = `UPDATE users SET ${queryFields.join(', ')} WHERE userID = ?`;
    queryParams.push(userId);
    try {
        await dbPool.query(queryString, queryParams);
        res.status(200).json({ message: "Profile updated successfully." });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Error updating profile." });
    }
});

app.delete('/api/profile', async (req, res) => {
    const userId = req.user.userId;
    try {
        await dbPool.query('DELETE FROM reviews WHERE userID = ?', [userId]);
        await dbPool.query('DELETE FROM reportLogs WHERE userID = ?', [userId]);
        await dbPool.query('DELETE FROM user_thresholds WHERE userID = ?', [userId]);
        await dbPool.query('DELETE FROM dataLogs WHERE userID = ?', [userId]);
        await dbPool.query('DELETE FROM users WHERE userID = ?', [userId]);
        res.status(200).json({ message: "Account deleted successfully." });
    } catch (error) {
        console.error("Account deletion error:", error);
        res.status(500).json({ message: "Error deleting account." });
    }
});

app.get('/api/logs/history', async (req, res) => {
    const userId = req.user.userId;
    const { types, period = 'day', targetDate, limit } = req.query;
    if (!types) { return res.status(400).json({ message: "Log type(s) are required as a query parameter." }); }
    const typeArray = types.split(',').map(t => parseInt(t.trim()));
    if (typeArray.some(isNaN)) { return res.status(400).json({ message: "Invalid 'types' parameter." }); }
    let query = `SELECT logID, type, amount, date, tag, foodName FROM dataLogs WHERE userID = ? AND type IN (?)`;
    const queryParams = [userId, typeArray];
    if (period !== 'all') {
        const date = targetDate ? new Date(targetDate) : new Date();
        if (period === 'day') { query += ` AND DATE(date) = DATE(?)`; queryParams.push(date); }
        else if (period === 'week') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            query += ` AND date BETWEEN ? AND ?`;
            queryParams.push(weekStart, weekEnd);
        } else if (period === 'month') {
            query += ` AND YEAR(date) = ? AND MONTH(date) = ?`;
            queryParams.push(date.getFullYear(), date.getMonth() + 1);
        }
    }
    query += ` ORDER BY date DESC`;
    if (limit && /^\d+$/.test(limit)) { query += ` LIMIT ?`; queryParams.push(parseInt(limit)); }
    try {
        const [logs] = await dbPool.query(query, queryParams);
        res.status(200).json(logs);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: 'Error fetching history.' });
    }
});

app.post('/api/logs', async (req, res) => {
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

app.put('/api/logs/:logId', async (req, res) => {
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

app.delete('/api/logs/:logId', async (req, res) => {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startScheduledReports();
});