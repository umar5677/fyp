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

        const numericWords = TextDetections.filter(d => d.Type === 'WORD' && /^\d+$/.test(d.DetectedText));

        if (numericWords.length === 0) {
            return res.status(404).json({ message: "No numbers found in the image." });
        }

        // Sort by physical size (area) to find the most dominant number first
        numericWords.sort((a, b) => {
            const areaA = a.Geometry.BoundingBox.Width * a.Geometry.BoundingBox.Height;
            const areaB = b.Geometry.BoundingBox.Width * b.Geometry.BoundingBox.Height;
            return areaB - areaA;
        });

        // Iterate through our size-sorted numbers to find a plausible reading
        for (const anchor of numericWords) {
            let potentialParts = [anchor];

            // Find other numbers that are physically close to our current anchor
            for (const other of numericWords) {
                if (other.Id === anchor.Id) continue;

                const boxA = anchor.Geometry.BoundingBox;
                const boxB = other.Geometry.BoundingBox;

                // Check for horizontal or vertical proximity
                const horizontalDist = Math.abs(boxA.Left - boxB.Left);
                const verticalDist = Math.abs(boxA.Top - boxB.Top);
                
                // If they are close, consider them part of the same number
                if (horizontalDist < boxA.Width * 2 && verticalDist < boxA.Height) {
                    potentialParts.push(other);
                }
            }
            
            // Sort the parts of our potential number from left to right
            potentialParts.sort((a, b) => a.Geometry.BoundingBox.Left - b.Geometry.BoundingBox.Left);

            const combinedText = potentialParts.map(p => p.DetectedText).join('');
            const finalNumber = parseInt(combinedText);

            // If we have a valid number in the correct range, we're done
            if (!isNaN(finalNumber) && finalNumber >= 20 && finalNumber <= 600) {
                return res.status(200).json({ success: true, number: String(finalNumber) });
            }
        }
        
        // If no combination worked, return a failure message
        res.status(404).json({ message: "Could not identify a clear blood sugar reading." });

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

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));