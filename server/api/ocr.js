const express = require('express');
const { RekognitionClient, DetectTextCommand } = require('@aws-sdk/client-rekognition');
const router = express.Router();

// Initialize the Rekognition client directly within this module.
const rekognitionClient = new RekognitionClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
module.exports = function createOcrRouter(dbPool) {
    // This endpoint will be mounted at POST /api/ocr/aws-parse-image
    router.post('/aws-parse-image', async (req, res) => {
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
    return router;
};