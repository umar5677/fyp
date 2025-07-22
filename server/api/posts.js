// fyp/server/api/posts.js
const express = require('express');
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

function createPostsRouter(dbPool) {
    const router = express.Router();

    const s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
    });
    
    const upload = multer({
        storage: multerS3({ s3, bucket: process.env.S3_POSTS_BUCKET, acl: 'public-read', metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }), key: (req, file, cb) => { const userId = req.user.userId; const fullPath = `community-posts/${userId}/${Date.now()}_${file.originalname}`; cb(null, fullPath); } })
    });

    // GET / - Fetch the main community feed
    router.get('/', async (req, res) => {
        const currentUserID = req.user.userId;
        try {
            const query = `
                SELECT 
                    p.id, p.title, p.content, p.createdAt, p.likeCount, p.commentCount,
                    u.userID, u.first_name, u.last_name, u.pfpUrl,
                    GROUP_CONCAT(pi.imageUrl) as images,
                    (SELECT COUNT(*) FROM post_likes WHERE postID = p.id AND userID = ?) > 0 AS likedByUser
                FROM posts p
                JOIN users u ON p.userID = u.userID
                LEFT JOIN post_images pi ON p.id = pi.postID
                GROUP BY p.id
                ORDER BY p.createdAt DESC;
            `;
            const [posts] = await dbPool.query(query, [currentUserID]);

            const formattedPosts = posts.map(post => ({
                ...post,
                images: post.images ? post.images.split(',') : [],
                likedByUser: !!post.likedByUser
            }));
            res.json(formattedPosts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            res.status(500).json({ message: 'Error fetching posts' });
        }
    });
    
    // POST / - Create a new post
    router.post('/', upload.array('images', 5), async (req, res) => {
        const { title, content } = req.body;
        const userId = req.user.userId;
        if (!title || !content) { return res.status(400).json({ message: 'Title and content are required.' }); }
        
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            // Explicitly set the createdAt timestamp in the application
            const [postResult] = await connection.query(
                'INSERT INTO posts (userID, title, content, createdAt) VALUES (?, ?, ?, ?)', 
                [userId, title, content, new Date()]
            );
            const postId = postResult.insertId;

            if (req.files && req.files.length > 0) {
                const imagePromises = req.files.map(file => 
                    connection.query('INSERT INTO post_images (postID, imageUrl) VALUES (?, ?)', [postId, file.location])
                );
                await Promise.all(imagePromises);
            }
            await connection.commit();
            res.status(201).json({ message: 'Post created successfully', postId });
        } catch (error) {
            await connection.rollback();
            console.error("Error creating post:", error)
            res.status(500).json({ message: 'Failed to create post' });
        } finally {
            connection.release();
        }
    });

    router.post('/:postId/like', async (req, res) => {
        const { postId } = req.params;
        const userId = req.user.userId;
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('INSERT IGNORE INTO post_likes (userID, postID) VALUES (?, ?)', [userId, postId]);
            await connection.query('UPDATE posts SET likeCount = (SELECT COUNT(*) FROM post_likes WHERE postID = ?) WHERE id = ?', [postId, postId]);
            await connection.commit();
            res.json({ success: true, message: 'Post liked.' });
        } catch (error) {
            await connection.rollback();
            console.error("Error liking post:", error);
            res.status(500).json({ message: "Failed to like post." });
        } finally {
            connection.release();
        }
    });

    router.delete('/:postId/like', async (req, res) => {
        const { postId } = req.params;
        const userId = req.user.userId;
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('DELETE FROM post_likes WHERE userID = ? AND postID = ?', [userId, postId]);
            await connection.query('UPDATE posts SET likeCount = GREATEST(0, (SELECT COUNT(*) FROM post_likes WHERE postID = ?)) WHERE id = ?', [postId, postId]);
            await connection.commit();
            res.json({ success: true, message: 'Post unliked.' });
        } catch (error) {
            await connection.rollback();
            console.error("Error unliking post:", error);
            res.status(500).json({ message: "Failed to unlike post." });
        } finally {
            connection.release();
        }
    });

    router.get('/:postId', async (req, res) => {
        const { postId } = req.params;
        const currentUserID = req.user.userId;
        try {
            const query = `
                SELECT 
                    p.id, p.title, p.content, p.createdAt, p.likeCount, p.commentCount,
                    u.userID, u.first_name, u.last_name, u.pfpUrl,
                    GROUP_CONCAT(pi.imageUrl) as images,
                    (SELECT COUNT(*) FROM post_likes WHERE postID = p.id AND userID = ?) > 0 AS likedByUser
                FROM posts p
                JOIN users u ON p.userID = u.userID
                LEFT JOIN post_images pi ON p.id = pi.postID
                WHERE p.id = ?
                GROUP BY p.id;
            `;
            const [posts] = await dbPool.query(query, [currentUserID, postId]);

            if (posts.length === 0) {
                return res.status(404).json({ message: "Post not found." });
            }
            
            const post = posts[0];
            const formattedPost = { ...post, images: post.images ? post.images.split(',') : [], likedByUser: !!post.likedByUser };
            res.json(formattedPost);
        } catch (error) {
            console.error('Error fetching post details:', error);
            res.status(500).json({ message: 'Error fetching post details' });
        }
    });

    router.get('/:postId/comments', async (req, res) => {
        const { postId } = req.params;
        try {
            const query = `
                SELECT c.id, c.commentText, c.createdAt, u.userID, u.first_name, u.last_name, u.pfpUrl
                FROM post_comments c
                JOIN users u ON c.userID = u.userID
                WHERE c.postID = ?
                ORDER BY c.createdAt ASC;
            `;
            const [comments] = await dbPool.query(query, [postId]);
            res.json(comments);
        } catch (error) {
            console.error("Error fetching comments:", error);
            res.status(500).json({ message: "Error fetching comments." });
        }
    });

    router.post('/:postId/comment', async (req, res) => {
        const { postId } = req.params;
        const { commentText } = req.body;
        const userId = req.user.userId;
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            // Explicitly set the createdAt timestamp in the application
            await connection.query(
                'INSERT INTO post_comments (postID, userID, commentText, createdAt) VALUES (?, ?, ?, ?)',
                [postId, userId, commentText, new Date()]
            );
            await connection.query(
                'UPDATE posts SET commentCount = (SELECT COUNT(*) FROM post_comments WHERE postID = ?) WHERE id = ?',
                [postId, postId]
            );
            await connection.commit();
            res.status(201).json({ success: true, message: "Comment added." });
        } catch (error) {
            await connection.rollback();
            console.error("Error adding comment:", error);
            res.status(500).json({ message: "Failed to add comment." });
        } finally {
            connection.release();
        }
    });

    return router;
}

module.exports = createPostsRouter;