// fyp/server/api/provider.js
const express = require('express');
const authenticateToken = require('../lib/authMiddleware.js');
const isProvider = require('../lib/isProvider.js');

function createProviderRouter(dbPool) {
    const router = express.Router();

    // These middlewares protect all routes in this file
    router.use(authenticateToken);
    router.use(isProvider);

    // GET /api/provider/questions
    router.get('/questions', async (req, res) => {
        const providerId = req.user.userId;
        try {
            // Find pending questions assigned to this provider
            const [questions] = await dbPool.query(`
                SELECT 
                    q.questionID, q.questionText, q.createdAt,
                    u.first_name AS askerFirstName, u.last_name AS askerLastName
                FROM questions q
                JOIN users u ON q.userID = u.userID 
                WHERE q.providerID = ? AND q.status = 'pending'
                ORDER BY q.createdAt ASC
            `, [providerId]);
            res.json(questions);
        } catch (error) {
            console.error('Error fetching provider questions:', error);
            res.status(500).json({ message: 'Error fetching questions.' });
        }
    });

    // POST /api/provider/answer/:questionId
    router.post('/answer/:questionId', async (req, res) => {
        const { questionId } = req.params;
        const { answerText } = req.body;
        const providerId = req.user.userId;
    
        if (!answerText || answerText.trim() === '') {
            return res.status(400).json({ message: 'Answer text cannot be empty.' });
        }
    
        try {
            const [result] = await dbPool.query(`
                UPDATE questions 
                SET 
                    answerText = ?, 
                    status = 'answered', 
                    answeredAt = NOW() 
                WHERE 
                    questionID = ? AND providerID = ?
            `, [answerText, questionId, providerId]);
    
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Question not found or you are not authorized to answer it.' });
            }
            
            res.json({ success: true, message: 'Answer submitted successfully.' });
    
        } catch (error) {
            console.error('Error submitting answer:', error);
            res.status(500).json({ message: 'An error occurred while submitting your answer.' });
        }
    });
    
    return router;
}

module.exports = createProviderRouter;