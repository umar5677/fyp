// fyp/server/api/predictions.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// This factory function returns the configured router
module.exports = function createPredictionsRouter(dbPool) {

  // This endpoint is now protected
  router.get('/glucose', async (req, res) => {
    const userId = req.user.userId;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        try {
            // --- PREMIUM CHECK ---
            // First, check if the user has premium access.
            const [users] = await dbPool.query('SELECT setPremium FROM users WHERE userID = ?', [userId]);

            if (users.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }

            // If user is not premium, block the request before calling the AI API.
            if (!users[0].setPremium) {
                return res.status(403).json({ 
                    success: false, 
                    code: 'UPGRADE_REQUIRED', 
                    message: 'AI Glucose Forecast is a premium feature. Please upgrade to get access.' 
                });
            }
            // --- END OF PREMIUM CHECK ---

            if (!GEMINI_API_KEY) {
                return res.status(500).json({ success: false, message: 'Server is missing API key for predictions.' });
            }

            // The rest of the prediction logic only runs for premium users
            const [readings] = await dbPool.query('SELECT amount, date FROM dataLogs WHERE userID = ? AND type = 3 ORDER BY date DESC LIMIT 10', [userId]);
            if (readings.length < 2) {
                return res.json({ success: false, message: 'Not enough data for a prediction. Log at least two readings.' });
            }
            // ... (The rest of the Gemini API call logic is unchanged)
            const lastReading = readings[0]; 
            const timeAnchor = new Date(lastReading.date); 
            const projectionTime = new Date(timeAnchor.getTime() + 60 * 60 * 1000); 
            const formattedReadings = [...readings].reverse().map(r => `> ${Math.round(r.amount)} mg/dL on ${new Date(r.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}`).join('\n');
            const prompt = `
                You are a diabetic health assistant. A user's recent blood glucose readings are listed below in chronological order:
                ${formattedReadings}
    
                The last reading was taken at ${timeAnchor.toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}. This is our anchor time.
    
                Based on this data, analyze the immediate trend (must be 'Rising', 'Falling', or 'Stable'), project the user's approximate glucose value 60 minutes from the anchor time, and provide a brief, helpful insight (one sentence).
    
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
                        console.log(`Gemini attempt ${attempt} failed with 503. Retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else { throw error; }
                }
            }
            res.json({ success: true, ...predictionData, projectedTime: projectionTime.toISOString(), lastReading: { ...lastReading, amount: Math.round(lastReading.amount) } });
        } catch (error) {
            const errorMessage = error.response?.data?.error?.message || 'An error occurred while calculating the prediction.';
            res.status(500).json({ success: false, message: errorMessage });
        }
    });

  return router;
};