// fyp/server/api/qna.js
const express = require('express');

function createQnaRouter(dbPool) {
    const router = express.Router();

    router.get('/providers', async (req, res) => {
        try {
            const [providers] = await dbPool.query(`
                SELECT u.userID, u.first_name, u.last_name, v.provType 
                FROM users u 
                JOIN verifyHP v ON u.userID = v.userID 
                WHERE u.setProvider = 1
            `);
            res.json(providers);
        } catch (error) {
            console.error('Provider fetch error:', error);
            res.status(500).json({ message: 'Error fetching providers.' });
        }
    });

    router.get('/status', async (req, res) => {
        const userId = req.user.userId;
        const weeklyLimit = 3;

        try {
            const [users] = await dbPool.query(
                'SELECT setPremium, questionsAskedThisWeek FROM users WHERE userID = ?',
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const user = users[0];
            const questionsAsked = user.questionsAskedThisWeek || 0;
            const isPremium = user.setPremium === 1; 

            const questionsRemaining = isPremium ? weeklyLimit - questionsAsked : 0;
            
            res.json({
                is_premium: isPremium, 
                limit_per_week: weeklyLimit,
                questions_asked_this_week: questionsAsked,
                questions_remaining: Math.max(0, questionsRemaining)
            });

        } catch (error) {
            console.error('Error fetching Q&A status:', error);
            res.status(500).json({ message: 'Error fetching Q&A status.' });
        }
    });
    
    router.post('/ask', async (req, res) => {
        const userId = req.user.userId;
        const { providerId, questionText } = req.body;
        const weeklyLimit = 3;

        if (!providerId || !questionText) {
            return res.status(400).json({ message: 'Provider and question text are required.' });
        }

        try {
            const [users] = await dbPool.query(
                'SELECT setPremium, questionsAskedThisWeek FROM users WHERE userID = ?',
                [userId]
            );

            if (users.length === 0) return res.status(404).json({ message: 'User not found.' });
            
            const user = users[0];
            const isPremium = user.setPremium === 1; 

            if (!isPremium || user.questionsAskedThisWeek >= weeklyLimit) {
                return res.status(403).json({ message: 'You have reached your weekly question limit.' });
            }

            await dbPool.query(
                'INSERT INTO questions (userID, providerID, questionText, status) VALUES (?, ?, ?, ?)',
                [userId, providerId, questionText, 'pending']
            );
            
            await dbPool.query(
                'UPDATE users SET questionsAskedThisWeek = questionsAskedThisWeek + 1 WHERE userID = ?',
                [userId]
            );
            
            res.status(201).json({ success: true, message: 'Your question has been submitted successfully!' });

        } catch (error) {
            console.error('Question submission error:', error);
            res.status(500).json({ success: false, message: 'An error occurred while submitting your question.' });
        }
    });

    router.get('/my-questions', async (req, res) => {
        const userId = req.user.userId;
    
        try {
            const [questions] = await dbPool.query(`
                SELECT 
                    q.questionID, q.questionText, q.answerText, q.status,
                    q.createdAt, q.answeredAt, p.first_name AS providerFirstName,
                    p.last_name AS providerLastName
                FROM 
                    questions AS q
                LEFT JOIN 
                    users AS p ON q.providerID = p.userID
                WHERE 
                    q.userID = ?
                ORDER BY 
                    q.createdAt DESC
            `, [userId]);
    
            res.json(questions);
    
        } catch (error) {
            console.error('Error fetching user questions:', error);
            res.status(500).json({ message: 'Error fetching your questions.' });
        }
    });

    return router;
}

module.exports = createQnaRouter;