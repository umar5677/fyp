// fyp/server/api/provider.js

const express = require('express');
const authenticateToken = require('../lib/authMiddleware.js');
const isProvider = require('../lib/isProvider.js');
const { encrypt, decrypt } = require('../lib/encryption.js');
const { createNotification } = require('../lib/notificationManager.js');

function createProviderRouter(dbPool) {
    const router = express.Router();

    // These middlewares protect all routes in this file, ensuring only authenticated providers can access them.
    router.use(authenticateToken);
    router.use(isProvider);

    // GET /api/provider/questions - Fetches pending questions for a provider
    router.get('/questions', async (req, res) => {
        const providerId = req.user.userId;
        try {
            const [questions] = await dbPool.query(`
                SELECT 
                    q.questionID, q.questionText, q.createdAt,
                    u.first_name AS askerFirstName, u.last_name AS askerLastName
                FROM questions q
                JOIN users u ON q.userID = u.userID 
                WHERE q.providerID = ? AND q.status = 'pending' AND q.deletedByProvider = FALSE
                ORDER BY q.createdAt ASC
            `, [providerId]);
            
            // Decrypt the question text before sending it to the provider's app
            const decryptedQuestions = questions.map(q => ({
                ...q,
                questionText: decrypt(q.questionText)
            }));
            
            res.json(decryptedQuestions);

        } catch (error) {
            console.error('Error fetching provider questions:', error);
            res.status(500).json({ message: 'Error fetching questions.' });
        }
    });

    // GET /api/provider/questions/answered - Fetches the provider's answer history
    router.get('/questions/answered', async (req, res) => {
        const providerId = req.user.userId;

        try {
            const [questions] = await dbPool.query(`
                SELECT 
                    q.questionID, q.questionText, q.answerText, q.createdAt, q.answeredAt,
                    u.first_name AS askerFirstName, u.last_name AS askerLastName
                FROM questions q
                JOIN users u ON q.userID = u.userID 
                WHERE q.providerID = ? AND q.status = 'answered' AND q.deletedByProvider = FALSE
                ORDER BY q.answeredAt DESC
            `, [providerId]);

            // Decrypt the sensitive data before sending it to the app
            const decryptedHistory = questions.map(q => ({
                ...q,
                questionText: decrypt(q.questionText),
                answerText: decrypt(q.answerText)
            }));
            
            res.json(decryptedHistory);

        } catch (error) {
            console.error('Error fetching provider answer history:', error);
            res.status(500).json({ message: 'Error fetching answer history.' });
        }
    });
    
    // DELETE /api/provider/questions/:questionId - Provider "soft deletes" a question
    router.delete('/questions/:questionId', async (req, res) => {
        const providerId = req.user.userId;
        const { questionId } = req.params;

        try {
            // Set the provider's delete flag.
            const [updateResult] = await dbPool.query(
                `UPDATE questions SET deletedByProvider = TRUE WHERE questionID = ? AND providerID = ?`,
                [questionId, providerId]
            );
            
            if (updateResult.affectedRows === 0) {
                return res.status(404).json({ message: 'Question not found or not assigned to you.' });
            }
            
            // Check if the user has ALSO deleted this question.
            const [[question]] = await dbPool.query( 
                'SELECT deletedByUser FROM questions WHERE questionID = ?',
                [questionId]
            );
            
            if (question && question.deletedByUser) {
                await dbPool.query('DELETE FROM questions WHERE questionID = ?', [questionId]);
                console.log(`Permanently deleted question ${questionId} as both parties have deleted it.`);
            }
            
            res.status(200).json({ success: true, message: 'Conversation removed from your history.' });

        } catch (error) {
            console.error('Error deleting provider question:', error);
            res.status(500).json({ message: 'An error occurred while deleting the question.' });
        }
    });

    router.post('/answer/:questionId', async (req, res) => {
        const { questionId } = req.params;
        const { answerText } = req.body;
        const providerId = req.user.userId;
    
        if (!answerText || answerText.trim() === '') {
            return res.status(400).json({ message: 'Answer text cannot be empty.' });
        }
    
        try {
            // Find the original user's ID to send them a notification.
            const [questions] = await dbPool.query(
                'SELECT userID FROM questions WHERE questionID = ? AND providerID = ?', 
                [questionId, providerId]
            );

            if (questions.length === 0) {
                 return res.status(404).json({ message: 'Question not found or you are not authorized to answer it.' });
            }
            const originalAskerId = questions[0].userID;

            const encryptedAnswer = encrypt(answerText);

            const [result] = await dbPool.query(`
                UPDATE questions 
                SET 
                    answerText = ?, 
                    status = 'answered', 
                    answeredAt = NOW() 
                WHERE 
                    questionID = ? AND providerID = ?
            `, [encryptedAnswer, questionId, providerId]);
    
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Question not found or you are not authorized to answer it.' });
            }

            // Create a notification for the user who asked the question.
            const notificationMessage = `Your provider has answered your question.`;
            await createNotification(dbPool, originalAskerId, notificationMessage, 'info');
            
            res.json({ success: true, message: 'Answer submitted successfully.' });
    
        } catch (error) {
            console.error('Error submitting answer:', error);
            res.status(500).json({ message: 'An error occurred while submitting your answer.' });
        }
    });
    
    return router;
}

module.exports = createProviderRouter;