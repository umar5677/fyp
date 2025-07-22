// fyp/server/api/ai.js
const express = require('express');
const axios = require('axios');

function createAiRouter(dbPool) {
    const router = express.Router();
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Middleware to check for premium status on all routes in this file
    router.use(async (req, res, next) => {
        const userId = req.user.userId;
        try {
            const [users] = await dbPool.query('SELECT setPremium FROM users WHERE userID = ?', [userId]);
            if (users.length === 0 || !users[0].setPremium) {
                return res.status(403).json({ 
                    success: false, 
                    code: 'UPGRADE_REQUIRED',
                    message: 'This AI feature requires a Premium subscription.' 
                });
            }
            // If premium, continue to the route
            next();
        } catch (error) {
            console.error('AI premium check error:', error);
            res.status(500).json({ message: 'Error verifying user status.' });
        }
    });

    // Endpoint to identify food from an image
    router.post('/identify-food', async (req, res) => {
        const { image: base64 } = req.body;
        if (!base64) return res.status(400).json({ message: 'Image data is required.' });

        const requestBody = {
            contents: [{ parts: [
                { inlineData: { mimeType: 'image/jpeg', data: base64 } }, 
                { text: 'Identify the food in this image. Return up to 3 likely dish names, comma-separated. Be concise, no extra text.' }
            ] }]
        };
        try {
            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, requestBody);
            const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleaned = text.replace(/[^\w\s,]/g, '').split(',').map(s => s.trim()).filter(Boolean);
            res.json({ success: true, suggestions: cleaned.slice(0, 3) });
        } catch (err) {
            console.error('Gemini food identification error:', err.response?.data || err.message);
            res.status(500).json({ message: 'Could not identify the food in the image.' });
        }
    });

    // Endpoint to get nutrition info for a food name
    router.post('/get-nutrition', async (req, res) => {
        const { foodName } = req.body;
        if (!foodName) return res.status(400).json({ message: 'Food name is required.' });

        const requestBody = {
            contents: [{ parts: [{ text: `Estimate calories and sugar for one serving of "${foodName}". Return a JSON object like {"calories": number, "sugar_grams": number}.` }] }]
        };
        try {
            const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, requestBody);
            const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonString = text.match(/{.*}/s)[0];
            const nutrition = JSON.parse(jsonString);
            res.json({ success: true, calories: nutrition.calories || 0, sugar: nutrition.sugar_grams || 0 });
        } catch (err) {
            console.error('Gemini nutrition error:', err.response?.data || err.message);
            res.status(500).json({ message: 'Could not get nutrition info for this food.' });
        }
    });
    
    return router;
}

module.exports = createAiRouter;