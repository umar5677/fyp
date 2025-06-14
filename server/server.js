// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const { RekognitionClient, DetectTextCommand } = require('@aws-sdk/client-rekognition');

const app = express();
app.use(express.json({ limit: '10mb' }));

// --- AWS SDK Configuration ---
const rekognitionClient = new RekognitionClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// --- Database Connection Pool ---
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- API Module Imports & Router Mounting ---
const loginApi = require('./api/login.js');
const { createLoginRouter, hashPassword } = loginApi;
const createSignupRouter = require('./api/signup.js');
app.use('/api/login', createLoginRouter(dbPool));
app.use('/api/signup', createSignupRouter(dbPool, hashPassword));

// --- Profile Route ---
app.get('/profile/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const [users] = await dbPool.query('SELECT userID, email, first_name, last_name, dob, weight, height, diabetes FROM users WHERE userID = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found.' });
        res.json({ message: `Profile for user ${userId}`, user: users[0] });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Error fetching profile.', error: error.message });
    }
});

// --- UNIVERSAL OCR ENDPOINT ---
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

        const words = TextDetections
        .filter(d => d.Type === 'WORD')
        .sort((a, b) => {
          const dy = a.Geometry.BoundingBox.Top - b.Geometry.BoundingBox.Top;
          if (Math.abs(dy) < 0.02) {
            return a.Geometry.BoundingBox.Left - b.Geometry.BoundingBox.Left;
          }
          return dy;
        });
      
        let calories = null;
        let sugar = null;
        let bloodsugar = null;
        
        // Helper: extract decimal numbers from nearby words
        function extractNumericNear(index, wordList) {
            for (let j = index + 1; j <= index + 4 && j < wordList.length; j++) {
            const clean = wordList[j].DetectedText.replace(/[^\d.]/g, '');
            if (/^\d+(\.\d+)?$/.test(clean)) {
                return parseFloat(clean);
            }
            }
            return null;
        }
      
      // Define keyword sets
      const calorieKeywords = ['calorie', 'calories', 'energy'];
      const sugarKeywords = ['sugar', 'sugars', 'total sugar', 'total sugars', 'added sugar', 'added sugars'];
      const bloodSugarKeywords = ['blood sugar', 'glucose'];
      
      for (let i = 0; i < words.length; i++) {
        const text = words[i].DetectedText.toLowerCase();
        const phrase = words.slice(i, i + 2).map(w => w.DetectedText.toLowerCase()).join(' ');
      
        // --- CALORIES ---
        if (
          calorieKeywords.some(kw => text.includes(kw) || phrase.includes(kw)) &&
          calories === null
        ) {
          const numeric = extractNumericNear(i, words);
          if (numeric !== null) calories = numeric;
        }
      
        // --- SUGAR ---
        const slidingPhrase = words.slice(i, i + 3).map(w => w.DetectedText.toLowerCase()).join(' ');

        if (
        sugarKeywords.some(kw =>
            text.includes(kw) ||
            phrase.includes(kw) ||
            slidingPhrase.includes(kw)
        ) && sugar === null
        ) {
        const numeric = extractNumericNear(i, words);
        if (numeric !== null) sugar = numeric;
        }
      
        // --- BLOOD SUGAR ---
        if (
          bloodSugarKeywords.some(kw => text.includes(kw) || phrase.includes(kw)) &&
          bloodsugar === null
        ) {
          const numeric = extractNumericNear(i, words);
          if (numeric !== null) bloodsugar = numeric;
        }
      }

if (!calories && !sugar && !bloodsugar) {
  return res.status(404).json({ message: "Could not detect any values." });
}

return res.status(200).json({
  success: true,
  calories: calories ?? null,
  sugar: sugar ?? null,
  bloodsugar: bloodsugar ?? null
});

    } catch (error) {
        console.error("AWS Rekognition error:", error);
        res.status(500).json({ message: "Error analyzing image." });
    }
});


// --- Blood Sugar Log Routes ---
app.get('/api/logs/bloodsugar/history/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "User ID is required." });
    try {
        const [logs] = await dbPool.query(`SELECT logID, amount, date FROM dataLogs WHERE userID = ? AND type = 3 ORDER BY date DESC`, [userId]);
        res.status(200).json(logs);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: 'Error fetching history.' });
    }
});

app.post('/api/logs/bloodsugar', async (req, res) => {
    const { userId, amount, date } = req.body;
    const LOG_TYPE_BLOOD_SUGAR = 3;
    const dateToInsert = date ? new Date(date) : new Date();
    if (!userId || amount === null || amount === undefined) {
        return res.status(400).json({ message: 'User ID and amount are required.' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ message: 'A valid, non-negative amount is required.' });
    }
    try {
        const [result] = await dbPool.query(
            'INSERT INTO dataLogs (userID, type, amount, date) VALUES (?, ?, ?, ?)',
            [userId, LOG_TYPE_BLOOD_SUGAR, numericAmount, dateToInsert]
        );
        res.status(201).json({ success: true, message: 'Log created successfully!', logId: result.insertId });
    } catch (error) {
        console.error('Error creating log:', error);
        res.status(500).json({ success: false, message: 'Error creating log.' });
    }
});

app.put('/api/logs/bloodsugar/:logId', async (req, res) => {
    const { logId } = req.params;
    const { amount } = req.body;
    if (amount === null || amount === undefined) {
        return res.status(400).json({ message: 'Amount is required.' });
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ message: 'A valid, non-negative amount is required.' });
    }
    try {
        const [result] = await dbPool.query(`UPDATE dataLogs SET amount = ? WHERE logID = ?`, [numericAmount, logId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Log not found.' });
        }
        res.status(200).json({ message: 'Log updated successfully.' });
    } catch (error) {
        console.error('Error updating log:', error);
        res.status(500).json({ message: 'Error updating log.' });
    }
});

app.delete('/api/logs/bloodsugar/:logId', async (req, res) => {
    const { logId } = req.params;
    if (!logId) return res.status(400).json({ message: "Log ID is required." });
    try {
        const [result] = await dbPool.query(`DELETE FROM dataLogs WHERE logID = ?`, [logId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Log not found to delete.' });
        }
        res.status(200).json({ message: 'Log deleted successfully.' });
    } catch (error) {
        console.error('Error deleting log:', error);
        res.status(500).json({ message: 'Error deleting log.' });
    }
});

// --- Calorie and Sugar Log Routes ---
app.get('/api/logs/caloriesugar/history/:userId', async (req, res) => {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "User ID is required." });

    try {
        const [logs] = await dbPool.query(
            `SELECT logID, userID, type, amount, date FROM dataLogs WHERE userID = ? AND type IN (1, 2) ORDER BY date DESC`,
            [userId]
        );
        res.status(200).json(logs);
    } catch (error) {
        console.error('Error fetching calorie/sugar history:', error);
        res.status(500).json({ message: 'Error fetching history.' });
    }
});

app.post('/api/logs/caloriesugar', async (req, res) => {
    const { userId, amount, type, date } = req.body;
    const dateToInsert = date ? new Date(date) : new Date();

    if (!userId || amount == null || type == null) {
        return res.status(400).json({ message: 'User ID, amount, and type are required.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0 || ![1, 2].includes(type)) {
        return res.status(400).json({ message: 'Invalid input: amount must be non-negative, and type must be 1 or 2.' });
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

app.put('/api/logs/caloriesugar/:logId', async (req, res) => {
    const { logId } = req.params;
    const { amount } = req.body;

    if (amount == null) {
        return res.status(400).json({ message: 'Amount is required.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ message: 'A valid, non-negative amount is required.' });
    }

    try {
        const [result] = await dbPool.query(`UPDATE dataLogs SET amount = ? WHERE logID = ?`, [numericAmount, logId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Log not found.' });
        }
        res.status(200).json({ message: 'Log updated successfully.' });
    } catch (error) {
        console.error('Error updating log:', error);
        res.status(500).json({ message: 'Error updating log.' });
    }
});

app.delete('/api/logs/caloriesugar/:logId', async (req, res) => {
    const { logId } = req.params;
    if (!logId) return res.status(400).json({ message: "Log ID is required." });

    try {
        const [result] = await dbPool.query(`DELETE FROM dataLogs WHERE logID = ?`, [logId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Log not found to delete.' });
        }
        res.status(200).json({ message: 'Log deleted successfully.' });
    } catch (error) {
        console.error('Error deleting log:', error);
        res.status(500).json({ message: 'Error deleting log.' });
    }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));