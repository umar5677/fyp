// fyp/server/api/predictions.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
module.exports = function createPredictionsRouter(dbPool) {
router.get('/glucose', async (req, res) => {
const userId = req.user.userId;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        try {
        // PREMIUM CHECK
        const [users] = await dbPool.query('SELECT setPremium FROM users WHERE userID = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (!users[0].setPremium) {
            return res.status(403).json({ 
                success: false, 
                code: 'UPGRADE_REQUIRED', 
                message: 'AI Glucose Forecast is a premium feature. Please upgrade to get access.' 
            });
        }

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ success: false, message: 'Server is missing API key for predictions.' });
        }

        // Fetch the user's two most recent glucose readings
        const [recentGlucoseReadings] = await dbPool.query(
            'SELECT amount, date FROM dataLogs WHERE userID = ? AND type = 3 ORDER BY date DESC LIMIT 2', 
            [userId]
        );

        // Not enough data in total.
        if (recentGlucoseReadings.length < 2) {
            return res.json({ success: false, message: 'Not enough data for a prediction. Log at least two glucose readings to get started.' });
        }

        const lastReading = recentGlucoseReadings[0]; 
        const timeAnchor = new Date(lastReading.date);
        const projectionTime = new Date(timeAnchor.getTime() + 60 * 60 * 1000);

        const startTime = new Date(timeAnchor.getTime() - (24 * 60 * 60 * 1000));

        //Fetch all relevant logs (glucose, calories, sugar)
        const [allLogsInWindow] = await dbPool.query(
            'SELECT amount, date, type, tag, foodName FROM dataLogs WHERE userID = ? AND type IN (1, 2, 3) AND date BETWEEN ? AND ? ORDER BY date ASC',
            [userId, startTime, timeAnchor]
        );
        
        // Not enough RECENT data. Only one in the last 24 hours.
        const glucoseLogsInWindow = allLogsInWindow.filter(log => log.type === 3);
        if (glucoseLogsInWindow.length < 2) {
             return res.json({ success: false, message: 'A prediction requires at least two glucose readings in the last 24 hours.' });
        }

        const formattedHistory = allLogsInWindow.map(log => {
            const logTime = new Date(log.date).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            if (log.type === 3) {
                return `> At ${logTime}, glucose reading was ${Math.round(log.amount)} mg/dL (Tag: ${log.tag || 'N/A'}).`;
            }
            if (log.type === 1) {
                return `> At ${logTime}, user consumed "${log.foodName || 'Food'}" (${Math.round(log.amount)} kcal).`;
            }
            if (log.type === 2) {
                return `> The meal "${log.foodName || 'Food'}" at ${logTime} also contained ${log.amount.toFixed(1)}g of sugar.`;
            }
            return '';
        }).join('\n');

        const prompt = `
            You are a diabetic health assistant. You must analyze a user's health logs from the last 24 hours to predict their future glucose value.
            The logs are in chronological order and include both blood glucose readings and nutritional intake (calories and sugar).

            User's recent health log history:
            ${formattedHistory}

            The last reading was taken at ${timeAnchor.toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}. This is our anchor time.

            Analyze this complete history, paying close attention to how calorie and sugar intake may have influenced the subsequent glucose readings. Based on all this data:
            1.  Determine the immediate trend ('Rising', 'Falling', or 'Stable').
            2.  Project the approximate glucose value for 60 minutes after the anchor time.
            3.  Provide a shortest brief, helpful short insight (one sentence) that considers both the food eaten and the glucose trend.

            Return ONLY a valid JSON object in this exact format:
            {"trend": "value", "projectedValue": value, "analysis": "text"}
        `;

        let predictionData;
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                    { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }
                );
                const geminiResultText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!geminiResultText) throw new Error('No valid response from prediction model.');
                predictionData = JSON.parse(geminiResultText);
                break;
            } catch (error) {
                if (error.response && error.response.status === 503 && attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // Waits 2s, then 4s
                    console.log(`Gemini attempt ${attempt} failed with 503. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else { throw error; }
            }
        }
        res.json({ success: true, ...predictionData, projectedTime: projectionTime.toISOString(), lastReading: { ...lastReading, amount: Math.round(lastReading.amount) } });
    } catch (error) {
        // This now handles errors from inside the loop if all retries fail
        const errorMessage = error.response?.data?.error?.message || 'An error occurred while calculating the prediction.';
        res.status(500).json({ success: false, message: errorMessage });
    }
});

  return router;
};