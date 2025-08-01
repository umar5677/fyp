// fyp/server/api/reviews.js

const express = require('express');

function createReviewsRouter(dbPool) {
    const router = express.Router();

    // PUBLIC ENDPOINT: For the website to fetch good reviews.
    // This will be mounted at GET /api/reviews/public
    router.get('/public', async (req, res) => {
        try {
            const query = `
                SELECT 
                    r.rating, r.reviewText, u.first_name, u.last_name, u.pfpUrl 
                FROM reviews AS r
                JOIN users AS u ON r.userID = u.userID
                WHERE r.rating >= 4
                ORDER BY r.createdAt DESC
                LIMIT 15;
            `;
            const [reviews] = await dbPool.query(query);

            const formattedReviews = reviews.map(review => ({
                rating: review.rating,
                quote: review.reviewText,
                name: `${review.first_name || ''} ${review.last_name ? review.last_name.substring(0, 1) + '.' : ''}`.trim(),
                pfpUrl: review.pfpUrl
            }));
            res.status(200).json(formattedReviews);
        } catch (error) {
            console.error('Error fetching public reviews:', error);
            res.status(500).json({ message: 'Failed to retrieve app reviews.' });
        }
    });

    // AUTHENTICATED ENDPOINT: For logged-in app users to submit a review.
    // This will be mounted at POST /api/reviews
    router.post('/', async (req, res) => {
        const userId = req.user.userId;
        const { rating, reviewText } = req.body;

        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'A rating between 1 and 5 is required.' });
        }
        if (reviewText && reviewText.length > 255) {
            return res.status(400).json({ message: 'Review text must be 255 characters or less.' });
        }

        try {
            const [existing] = await dbPool.query('SELECT reviewID FROM reviews WHERE userID = ?', [userId]);
            
            if (existing.length > 0) {
                await dbPool.query(
                    'UPDATE reviews SET rating = ?, reviewText = ? WHERE userID = ?', 
                    [rating, reviewText || null, userId]
                );
                return res.status(200).json({ success: true, message: 'Thank you, your feedback has been updated!' });
            }

            await dbPool.query(
                'INSERT INTO reviews (userID, rating, reviewText) VALUES (?, ?, ?)', 
                [userId, rating, reviewText || null]
            );
            res.status(201).json({ success: true, message: 'Thank you for your feedback!' });
            
        } catch (error) {
            console.error('Error submitting review:', error);
            res.status(500).json({ message: 'An error occurred while submitting your review.' });
        }
    });
    
    return router;
}

module.exports = createReviewsRouter;