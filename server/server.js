// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const { RekognitionClient, DetectTextCommand } = require('@aws-sdk/client-rekognition');
const authenticateToken = require('./authMiddleware.js');

const app = express();
app.use(express.json({ limit: '10mb' }));

// --- AWS SDK & DB Setup ---
const rekognitionClient = new RekognitionClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
const dbPool = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, waitForConnections: true, connectionLimit: 10, queueLimit: 0 });

// --- PUBLIC ROUTES (No token needed) ---
const loginApi = require('./api/login.js');
const { createLoginRouter, hashPassword } = loginApi;
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

// --- PROTECTED ROUTES (All routes below this line require a valid JWT) ---
app.use(authenticateToken);

// --- Profile Route (Protected) ---
app.get('/api/profile', async (req, res) => {
    const userId = req.user.userId;
    try {
        const [users] = await dbPool.query('SELECT userID, email, first_name, last_name, dob, weight, height, diabetes FROM users WHERE userID = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found.' });
        res.json({ user: users[0] });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Error fetching profile.' });
    }
});

// --- Universal OCR Endpoint (Protected) ---
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


// --- CONSOLIDATED LOGS ENDPOINTS (Protected) ---

// GET history for specific types (e.g., /api/logs/history?types=3 or ?types=1,2)
app.get('/api/logs/history', async (req, res) => {
    const userId = req.user.userId;
    const { types } = req.query; 

    if (!types) {
        return res.status(400).json({ message: "Log type(s) are required as a query parameter." });
    }
    const typeArray = types.split(',').map(t => parseInt(t.trim()));
    if (typeArray.some(isNaN)) {
        return res.status(400).json({ message: "Invalid 'types' parameter." });
    }

    try {
        const [logs] = await dbPool.query(
            `SELECT logID, type, amount, date FROM dataLogs WHERE userID = ? AND type IN (?) ORDER BY date DESC`,
            [userId, typeArray]
        );
        res.status(200).json(logs);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: 'Error fetching history.' });
    }
});

// POST a new log (for any type)
app.post('/api/logs', async (req, res) => {
    const userId = req.user.userId;
    const { amount, type, date } = req.body;
    const dateToInsert = date ? new Date(date) : new Date();

    if (amount == null || type == null) {
        return res.status(400).json({ message: 'Amount and type are required.' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ message: 'A valid, non-negative amount is required.' });
    }

    try {
        const [result] = await dbPool.query(
            'INSERT INTO dataLogs (userID, type, amount, date) VALUES (?, ?, ?, ?)',
            [userId, type, numericAmount, dateToInsert]
        );
        res.status(201).json({ success: true, message: 'Log created successfully!', logId: result.insertId });
    } catch (error) {
        console.error('Error creating log:', error);
        res.status(500).json({ success: false, message: 'Error creating log.' });
    }
});

// PUT (update) a specific log
app.put('/api/logs/:logId', async (req, res) => {
    const { logId } = req.params;
    const { amount } = req.body;
    if (amount == null) return res.status(400).json({ message: 'Amount is required.' });
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ message: 'A valid, non-negative amount is required.' });
    }
    try {
        const [result] = await dbPool.query(`UPDATE dataLogs SET amount = ? WHERE logID = ? AND userID = ?`, [numericAmount, logId, req.user.userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Log not found or you do not have permission to edit it.' });
        }
        res.status(200).json({ success: true, message: 'Log updated successfully.' });
    } catch (error) {
        console.error('Error updating log:', error);
        res.status(500).json({ message: 'Error updating log.' });
    }
});

// DELETE a specific log
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


// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));