// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken'); 
const { RekognitionClient, DetectTextCommand } = require('@aws-sdk/client-rekognition');
const authenticateToken = require('./authMiddleware.js');
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

const app = express();
app.use(express.json({ limit: '10mb' }));

// AWS SDK & DB Setup
const rekognitionClient = new RekognitionClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
const dbPool = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, waitForConnections: true, connectionLimit: 10, queueLimit: 0 });

// S3 and Multer Setup
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
        bucket: process.env.S3_BUCKET_NAME,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const userId = req.user.userId;
            const fileName = 'profile'; 
            const folderPath = `profile-pictures/${userId}`;
            const fullPath = `${folderPath}/${fileName}`;
            
            cb(null, fullPath);
        }
    })
});

// PUBLIC ROUTES 
const loginApi = require('./api/login.js');
const { createLoginRouter, hashPassword, comparePassword } = loginApi;
const createSignupRouter = require('./api/signup.js');
app.use('/api/login', createLoginRouter(dbPool));
app.use('/api/signup', createSignupRouter(dbPool, hashPassword));

// Token Refresh Route
app.post('/api/token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: 'Refresh Token is required.' });

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Refresh Token is not valid.' });
        
        const payload = { userId: user.userId };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.json({ accessToken });
    });
});

// PROFILE PICTURE UPLOAD ROUTE
app.post('/api/upload/profile-picture', authenticateToken, upload.single('photo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    
    const imageUrl = req.file.location;

    try {
        await dbPool.query(
            'UPDATE users SET pfpUrl = ? WHERE userID = ?',
            [imageUrl, req.user.userId]
        );
        res.status(200).json({ success: true, imageUrl });
    } catch (error) {
        console.error('Failed to update pfpUrl in database:', error);
        res.status(500).json({ success: false, message: 'File uploaded, but failed to save profile link.' });
    }
});



// PROTECTED ROUTES
app.use(authenticateToken);

app.put('/api/profile-setup', async (req, res) => {
    const userId = req.user.userId;
    const { dob, weight, height, diabetesType, gender, isInsulin } = req.body;

    if (dob === undefined || weight === undefined || height === undefined || gender === null || diabetesType === null || isInsulin === undefined) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const [result] = await dbPool.query(
            `UPDATE users SET dob = ?, weight = ?, height = ?, diabetes = ?, gender = ?, isInsulin = ?, hasProfileSetup = 1 WHERE userID = ?`,
            [dob, weight, height, diabetesType, gender, isInsulin, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

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
        const isMatch = await comparePassword(currentPassword, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        const newHashedPassword = await hashPassword(newPassword);
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
            'SELECT userID, email, first_name, last_name, dob, weight, height, gender, diabetes, isInsulin, pfpUrl FROM users WHERE userID = ?',
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
    if (req.body.hasOwnProperty('height') && height) { queryFields.push('height = ?'); queryParams.push(parseFloat(height)); }
    if (req.body.hasOwnProperty('weight') && weight) { queryFields.push('weight = ?'); queryParams.push(parseFloat(weight)); }
    if (req.body.hasOwnProperty('gender')) { queryFields.push('gender = ?'); queryParams.push(gender); }
    if (req.body.hasOwnProperty('diabetes')) { queryFields.push('diabetes = ?'); queryParams.push(diabetes); }
    if (req.body.hasOwnProperty('isInsulin')) { queryFields.push('isInsulin = ?'); queryParams.push(isInsulin); }

    if (queryFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update.' });
    }

    const queryString = `UPDATE users SET ${queryFields.join(', ')} WHERE userID = ?`;
    queryParams.push(userId);
    
    try {
        const [result] = await dbPool.query(queryString, queryParams);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found." });
        }
        res.status(200).json({ message: "Profile updated successfully." });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Error updating profile." });
    }
});

app.delete('/api/profile', async (req, res) => {
    const userId = req.user.userId;
    try {
        await dbPool.query('DELETE FROM dataLogs WHERE userID = ?', [userId]);
        await dbPool.query('DELETE FROM users WHERE userID = ?', [userId]);
        res.status(200).json({ message: "Account deleted successfully." });
    } catch (error) {
        console.error("Account deletion error:", error);
        res.status(500).json({ message: "Error deleting account." });
    }
});

app.post('/api/ocr/aws-parse-image', async (req, res) => {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'Image data is required.' });

    const imageBytes = Buffer.from(image, 'base64');
    const command = new DetectTextCommand({ Image: { Bytes: imageBytes } });

    try {
        const { TextDetections } = await rekognitionClient.send(command);
        if (!TextDetections || TextDetections.length === 0) {
            return res.status(404).json({ message: "No text was detected." });
        }

        const words = TextDetections.filter(d => d.Type === 'WORD').sort((a, b) => {
            const dy = a.Geometry.BoundingBox.Top - b.Geometry.BoundingBox.Top;
            return Math.abs(dy) < 0.02 ? a.Geometry.BoundingBox.Left - b.Geometry.BoundingBox.Left : dy;
        });
      
        let calories = null, sugar = null, bloodsugar = null;
        
        const extractNumericNear = (index, wordList) => {
            for (let j = index + 1; j <= index + 4 && j < wordList.length; j++) {
                const clean = wordList[j].DetectedText.replace(/[^\d.]/g, '');
                if (/^\d+(\.\d+)?$/.test(clean)) return parseFloat(clean);
            }
            return null;
        };
      
        const calorieKeywords = ['calorie', 'calories', 'energy'];
        const sugarKeywords = ['sugar', 'sugars', 'total sugar', 'total sugars'];
        const bloodSugarKeywords = ['blood sugar', 'glucose', 'mg/dl'];
      
        for (let i = 0; i < words.length; i++) {
            const text = words[i].DetectedText.toLowerCase();
            const phrase = words.slice(i, i + 2).map(w => w.DetectedText.toLowerCase()).join(' ');
            
            if (calorieKeywords.some(kw => text.includes(kw) || phrase.includes(kw)) && calories === null) {
                calories = extractNumericNear(i, words);
            }
            if (sugarKeywords.some(kw => text.includes(kw) || phrase.includes(kw)) && sugar === null) {
                sugar = extractNumericNear(i, words);
            }
            if (bloodSugarKeywords.some(kw => text.includes(kw) || phrase.includes(kw)) && bloodsugar === null) {
                for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                    const clean = words[j].DetectedText.replace(/[^\d.]/g, '');
                    if (/^\d+$/.test(clean) && parseInt(clean) >= 20 && parseInt(clean) <= 600) {
                        bloodsugar = parseInt(clean);
                        break;
                    }
                }
            }
        }

        if (!calories && !sugar && !bloodsugar) {
            const numericWords = TextDetections.filter(d => /^\d+$/.test(d.DetectedText) && parseInt(d.DetectedText) >= 20 && parseInt(d.DetectedText) <= 600);
            if(numericWords.length > 0) {
                numericWords.sort((a,b) => (b.Geometry.BoundingBox.Width * b.Geometry.BoundingBox.Height) - (a.Geometry.BoundingBox.Width * a.Geometry.BoundingBox.Height));
                bloodsugar = parseInt(numericWords[0].DetectedText);
            } else {
                 return res.status(404).json({ message: "Could not detect any values." });
            }
        }

        return res.status(200).json({ success: true, calories, sugar, bloodsugar });

    } catch (error) {
        console.error("AWS Rekognition error:", error);
        res.status(500).json({ message: "Error analyzing image." });
    }
});

app.get('/api/predictions/glucose', async (req, res) => {
    const userId = req.user.userId;
    const NUM_READINGS = 5;

    try {
        const [readings] = await dbPool.query(
            'SELECT amount, date FROM dataLogs WHERE userID = ? AND type = 3 ORDER BY date DESC LIMIT ?',
            [userId, NUM_READINGS]
        );

        if (readings.length < 2) {
            return res.json({ success: false, message: 'Not enough data for a prediction. Log at least two readings.' });
        }

        readings.reverse();

        const firstTimestamp = new Date(readings[0].date).getTime();
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        const points = readings.map(r => {
            const y = parseFloat(r.amount);
            const x = (new Date(r.date).getTime() - firstTimestamp) / (1000 * 60);
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
            return { x, y };
        });
        
        const n = points.length;
        const denominator = (n * sumX2 - sumX * sumX);
        if (denominator === 0) {
             return res.json({ success: false, message: 'Readings are too close in time to predict a trend.' });
        }
        
        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;
        
        let trend;
        const STABLE_THRESHOLD = 0.2;
        if (slope > STABLE_THRESHOLD) trend = 'Rising';
        else if (slope < -STABLE_THRESHOLD) trend = 'Falling';
        else trend = 'Stable';

        const minutesAhead = 60;
        const lastPoint = points[points.length - 1];
        const projectedValue = Math.round(slope * (lastPoint.x + minutesAhead) + intercept);

        res.json({
            success: true,
            trend,
            projectedValue,
            lastReading: { ...readings[readings.length-1], amount: Math.round(readings[readings.length-1].amount) }
        });

    } catch (error) {
        console.error('Glucose prediction error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while calculating the prediction.' });
    }
});

app.get('/api/logs/history', async (req, res) => {
    const userId = req.user.userId;
    const { types, period = 'day', targetDate, limit } = req.query;

    if (!types) {
        return res.status(400).json({ message: "Log type(s) are required as a query parameter." });
    }
    const typeArray = types.split(',').map(t => parseInt(t.trim()));
    if (typeArray.some(isNaN)) {
        return res.status(400).json({ message: "Invalid 'types' parameter." });
    }

    let query = `SELECT logID, type, amount, date, tag, foodName FROM dataLogs WHERE userID = ? AND type IN (?)`;
    const queryParams = [userId, typeArray];
    
    if (period !== 'all') {
        const date = targetDate ? new Date(targetDate) : new Date();

        if (period === 'day') {
            query += ` AND DATE(date) = DATE(?)`;
            queryParams.push(date);
        } else if (period === 'week') {
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

app.post('/api/logs', async (req, res) => {
    const userId = req.user.userId;
    const { amount, type, date, tag, foodName } = req.body;
    const dateToInsert = date ? new Date(date) : new Date();

    if (amount == null || type == null) {
        return res.status(400).json({ message: 'Amount and type are required.' });
    }

    if (type === 3 && !tag) {
         return res.status(400).json({ message: 'A tag (e.g., Fasting, Pre-Meal) is required for blood glucose logs.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ message: 'A valid, non-negative amount is required.' });
    }

    try {
        const [result] = await dbPool.query(
            'INSERT INTO dataLogs (userID, type, amount, date, tag, foodName) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, type, numericAmount, dateToInsert, tag || null, foodName || null]
        );
        res.status(201).json({ success: true, message: 'Log created successfully!', logId: result.insertId });
    } catch (error) {
        console.error('Error creating log:', error);
        res.status(500).json({ success: false, message: 'Error creating log.' });
    }
});

app.put('/api/logs/:logId', async (req, res) => {
    const { logId } = req.params;
    const { amount, tag } = req.body;

    if (amount === undefined || tag === undefined) {
        return res.status(400).json({ success: false, message: 'Amount and tag are required for an update.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ success: false, message: 'A valid, non-negative amount is required.' });
    }

    try {
        const [result] = await dbPool.query(
            `UPDATE dataLogs SET amount = ?, tag = ? WHERE logID = ? AND userID = ?`,
            [numericAmount, tag, logId, req.user.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Log not found or you do not have permission to edit it.' });
        }
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
        const [result] = await dbPool.query(`DELETE FROM dataLogs WHERE logID = ? AND userID = ?`, [logId, req.user.userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Log not found or you do not have permission to delete it.' });
        }
        res.status(200).json({ success: true, message: 'Log deleted successfully.' });
    } catch (error) {
        console.error('Error deleting log:', error);
        res.status(500).json({ message: 'Error deleting log.' });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));