const express = require('express');
const multer = require('multer');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const { createNotification } = require('../lib/notificationManager.js');

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
        storage: multerS3({ s3, bucket: process.env.S3_POSTS_BUCKET, metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }), key: (req, file, cb) => { const userId = req.user.userId; const fullPath = `community-posts/${userId}/${Date.now()}_${file.originalname}`; cb(null, fullPath); } })
    });

    // Helper function to create the common SELECT fields for posts
    const addSharedPostFields = (currentUserID) => `
        p.id, p.title, p.content, p.createdAt, p.likeCount, p.commentCount,
        u.userID, u.first_name, u.last_name, u.pfpUrl,
        COALESCE(v.isVerified, 0) AS authorIsHpVerified,
        GROUP_CONCAT(pi.imageUrl) as images,
        (SELECT COUNT(*) FROM post_likes WHERE postID = p.id AND userID = ${currentUserID}) > 0 AS likedByUser,
        (SELECT COUNT(*) FROM post_bookmarks WHERE postID = p.id AND userID = ${currentUserID}) > 0 AS bookmarkedByUser,
        (SELECT COUNT(*) FROM post_reports WHERE postID = p.id AND reportingUserID = ${currentUserID}) > 0 AS reportedByUser
    `;

    // Helper function to format post data consistently
    const formatPost = (post, currentUserID) => ({
        ...post,
        images: post.images ? post.images.split(',') : [],
        likedByUser: !!post.likedByUser,
        bookmarkedByUser: !!post.bookmarkedByUser,
        reportedByUser: !!post.reportedByUser,
        authorIsHpVerified: !!post.authorIsHpVerified,
        isOwner: post.userID === currentUserID
    });

    // GET /api/posts - Fetch the main community feed
    router.get('/', async (req, res) => {
        const currentUserID = req.user.userId;
        try {
            const query = `
                SELECT ${addSharedPostFields(currentUserID)}
                FROM posts p
                JOIN users u ON p.userID = u.userID
                LEFT JOIN verifyHP v ON p.userID = v.userID
                LEFT JOIN post_images pi ON p.id = pi.postID
                GROUP BY p.id
                ORDER BY p.createdAt DESC;
            `;
            const [posts] = await dbPool.query(query);
            res.json(posts.map(post => formatPost(post, currentUserID)));
        } catch (error) {
            console.error('Error fetching posts:', error);
            res.status(500).json({ message: 'Error fetching posts' });
        }
    });

    // GET /api/posts/bookmarked - Fetch all of a user's bookmarked posts
    router.get('/bookmarked', async (req, res) => {
        const currentUserID = req.user.userId;
        try {
            const query = `
                SELECT ${addSharedPostFields(currentUserID)}
                FROM posts p
                JOIN users u ON p.userID = u.userID
                LEFT JOIN verifyHP v ON p.userID = v.userID
                LEFT JOIN post_images pi ON p.id = pi.postID
                JOIN post_bookmarks b ON p.id = b.postID AND b.userID = ?
                GROUP BY p.id
                ORDER BY b.createdAt DESC;
            `;
            const [posts] = await dbPool.query(query, [currentUserID]);
            res.json(posts.map(post => ({ ...formatPost(post, currentUserID), bookmarkedByUser: true })));
        } catch (error) {
            console.error('Error fetching bookmarked posts:', error);
            res.status(500).json({ message: 'Error fetching bookmarked posts' });
        }
    });

    // GET /api/posts/my-posts - Fetch the current user's own posts
    router.get('/my-posts', async (req, res) => {
        const currentUserID = req.user.userId;
        try {
            const query = `
                SELECT ${addSharedPostFields(currentUserID)}
                FROM posts p
                JOIN users u ON p.userID = u.userID
                LEFT JOIN verifyHP v ON p.userID = v.userID
                LEFT JOIN post_images pi ON p.id = pi.postID
                WHERE p.userID = ?
                GROUP BY p.id
                ORDER BY p.createdAt DESC;
            `;
            const [posts] = await dbPool.query(query, [currentUserID]);
            res.json(posts.map(post => ({...formatPost(post, currentUserID), isOwner: true})));
        } catch (error) {
            console.error('Error fetching user\'s own posts:', error);
            res.status(500).json({ message: 'Error fetching your posts' });
        }
    });
    
    // POST /api/posts - Create a new post
    router.post('/', upload.array('images', 5), async (req, res) => {
        const { title, content } = req.body;
        const userId = req.user.userId;
        if (!title || !content) { return res.status(400).json({ message: 'Title and content are required.' }); }
        
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            const [postResult] = await connection.query('INSERT INTO posts (userID, title, content, createdAt) VALUES (?, ?, ?, ?)', [userId, title, content, new Date()]);
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

    // PUT /api/posts/:postId - Update an existing post
    router.put('/:postId', upload.array('newImages', 5), async (req, res) => {
        const { postId } = req.params;
        const { title, content, imagesToDelete } = req.body;
        const userId = req.user.userId;
        const connection = await dbPool.getConnection();

        try {
            await connection.beginTransaction();
            const [ownerCheck] = await connection.query('SELECT userID FROM posts WHERE id = ?', [postId]);
            if (ownerCheck.length === 0 || ownerCheck[0].userID !== userId) {
                await connection.rollback();
                return res.status(403).json({ message: 'Forbidden: You do not own this post.' });
            }
            await connection.query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, postId]);
            if (imagesToDelete) {
                const urlsToDelete = JSON.parse(imagesToDelete);
                if (Array.isArray(urlsToDelete) && urlsToDelete.length > 0) {
                    await connection.query('DELETE FROM post_images WHERE postID = ? AND imageUrl IN (?)', [postId, urlsToDelete]);
                    const deleteS3Promises = urlsToDelete.map(url => {
                        const { pathname } = new URL(url);
                        const key = decodeURIComponent(pathname.substring(1));
                        return s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_POSTS_BUCKET, Key: key }));
                    });
                    await Promise.all(deleteS3Promises);
                }
            }
            if (req.files && req.files.length > 0) {
                const imagePromises = req.files.map(file => 
                    connection.query('INSERT INTO post_images (postID, imageUrl) VALUES (?, ?)', [postId, file.location])
                );
                await Promise.all(imagePromises);
            }
            await connection.commit();
            res.status(200).json({ message: 'Post updated successfully' });
        } catch (error) {
            await connection.rollback();
            console.error("Error updating post:", error);
            res.status(500).json({ message: 'Failed to update post' });
        } finally {
            connection.release();
        }
    });

    // DELETE /api/posts/:postId - Delete a post
    router.delete('/:postId', async (req, res) => {
        const { postId } = req.params;
        const userId = req.user.userId;
        const connection = await dbPool.getConnection();

        try {
            await connection.beginTransaction();
            const [ownerCheck] = await connection.query('SELECT userID FROM posts WHERE id = ?', [postId]);
            if (ownerCheck.length === 0 || ownerCheck[0].userID !== userId) {
                await connection.rollback();
                return res.status(403).json({ message: 'Forbidden: You do not own this post.' });
            }
            const [images] = await connection.query('SELECT imageUrl FROM post_images WHERE postID = ?', [postId]);
            await connection.query('DELETE FROM posts WHERE id = ?', [postId]);
            await connection.commit();
            if (images.length > 0) {
                const deleteS3Promises = images.map(img => {
                    const { pathname } = new URL(img.imageUrl);
                    const key = decodeURIComponent(pathname.substring(1));
                    return s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_POSTS_BUCKET, Key: key }));
                });
                await Promise.all(deleteS3Promises);
            }
            res.status(200).json({ success: true, message: 'Post deleted successfully.' });
        } catch (error) {
            await connection.rollback();
            console.error("Error deleting post:", error);
            res.status(500).json({ message: 'Failed to delete post.' });
        } finally {
            connection.release();
        }
    });

    // POST /api/posts/:postId/like - Like a post
    router.post('/:postId/like', async (req, res) => {
        const { postId } = req.params;
        const userId = req.user.userId;
        try {
            await dbPool.query('INSERT IGNORE INTO post_likes (userID, postID) VALUES (?, ?)', [userId, postId]);
            await dbPool.query('UPDATE posts SET likeCount = (SELECT COUNT(*) FROM post_likes WHERE postID = ?) WHERE id = ?', [postId, postId]);
            res.json({ success: true, message: 'Post liked.' });
        } catch (error) {
            console.error("Error liking post:", error);
            res.status(500).json({ message: "Failed to like post." });
        }
    });

    // DELETE /api/posts/:postId/like - Unlike a post
    router.delete('/:postId/like', async (req, res) => {
        const { postId } = req.params;
        const userId = req.user.userId;
        try {
            await dbPool.query('DELETE FROM post_likes WHERE userID = ? AND postID = ?', [userId, postId]);
            await dbPool.query('UPDATE posts SET likeCount = GREATEST(0, (SELECT COUNT(*) FROM post_likes WHERE postID = ?)) WHERE id = ?', [postId, postId]);
            res.json({ success: true, message: 'Post unliked.' });
        } catch (error) {
            console.error("Error unliking post:", error);
            res.status(500).json({ message: "Failed to unlike post." });
        }
    });

    // POST /api/posts/:postId/bookmark - Bookmark a post
    router.post('/:postId/bookmark', async (req, res) => {
        const { postId } = req.params;
        const userId = req.user.userId;
        try {
            await dbPool.query('INSERT IGNORE INTO post_bookmarks (userID, postID) VALUES (?, ?)', [userId, postId]);
            res.status(200).json({ success: true, message: 'Post bookmarked.' });
        } catch (error) {
            console.error("Error bookmarking post:", error);
            res.status(500).json({ message: "Failed to bookmark post." });
        }
    });

    // DELETE /api/posts/:postId/bookmark - Unbookmark a post
    router.delete('/:postId/bookmark', async (req, res) => {
        const { postId } = req.params;
        const userId = req.user.userId;
        try {
            await dbPool.query('DELETE FROM post_bookmarks WHERE userID = ? AND postID = ?', [userId, postId]);
            res.status(200).json({ success: true, message: 'Post removed from bookmarks.' });
        } catch (error) {
            console.error("Error unbookmarking post:", error);
            res.status(500).json({ message: "Failed to unbookmark post." });
        }
    });
    
    // POST /api/posts/:postId/report - Report a post
    router.post('/:postId/report', async (req, res) => {
        const { postId } = req.params;
        const reportingUserId = req.user.userId;
        try {
            await dbPool.query(
                'INSERT IGNORE INTO post_reports (postID, reportingUserID) VALUES (?, ?)',
                [postId, reportingUserId]
            );
            res.status(200).json({ success: true, message: 'Thank you for your report. Our team will review this post.' });
        } catch (error) {
            console.error(`Error reporting post ${postId} by user ${reportingUserId}:`, error);
            res.status(500).json({ message: "An error occurred while reporting the post." });
        }
    });

    // DELETE /api/posts/:postId/report - Un-report a post
    router.delete('/:postId/report', async (req, res) => {
        const { postId } = req.params;
        const reportingUserId = req.user.userId;
        try {
            await dbPool.query(
                'DELETE FROM post_reports WHERE postID = ? AND reportingUserID = ?',
                [postId, reportingUserId]
            );
            res.status(200).json({ success: true, message: 'Your report has been retracted.' });
        } catch (error) {
            console.error(`Error un-reporting post ${postId} by user ${reportingUserId}:`, error);
            res.status(500).json({ message: "An error occurred while retracting the report." });
        }
    });

    // GET /api/posts/:postId - Get details for a single post
    router.get('/:postId', async (req, res) => {
        const { postId } = req.params;
        const currentUserID = req.user.userId;
        try {
            const query = `
                SELECT 
                    ${addSharedPostFields(currentUserID)}
                FROM posts p
                JOIN users u ON p.userID = u.userID
                LEFT JOIN verifyHP v ON p.userID = v.userID
                LEFT JOIN post_images pi ON p.id = pi.postID
                WHERE p.id = ?
                GROUP BY p.id;
            `;
            const [posts] = await dbPool.query(query, [postId]);
            if (posts.length === 0) {
                return res.status(404).json({ message: "Post not found." });
            }
            res.json(formatPost(posts[0], currentUserID));
        } catch (error) {
            console.error('Error fetching post details:', error);
            res.status(500).json({ message: 'Error fetching post details' });
        }
    });

    // GET /api/posts/:postId/comments - Get all comments for a post
    router.get('/:postId/comments', async (req, res) => {
        const { postId } = req.params;
        const currentUserID = req.user.userId;
        try {
            const query = `
                SELECT 
                    c.id, c.commentText, c.createdAt, c.likeCount,
                    u.userID, u.first_name, u.last_name, u.pfpUrl,
                    COALESCE(v.isVerified, 0) AS commenterIsHpVerified,
                    (SELECT COUNT(*) FROM comment_likes WHERE userID = ? AND commentID = c.id) > 0 AS likedByUser,
                    (SELECT COUNT(*) FROM comment_reports WHERE commentID = c.id AND reportingUserID = ?) > 0 AS reportedByUser
                FROM post_comments c
                JOIN users u ON c.userID = u.userID
                LEFT JOIN verifyHP v ON c.userID = v.userID
                WHERE c.postID = ?
                ORDER BY c.createdAt ASC;
            `;
            const [comments] = await dbPool.query(query, [currentUserID, currentUserID, postId]);
            const formattedComments = comments.map(c => ({
                ...c, 
                likedByUser: !!c.likedByUser,
                reportedByUser: !!c.reportedByUser,
                commenterIsHpVerified: !!c.commenterIsHpVerified
            }));
            res.status(200).json(formattedComments);
        } catch (error) {
            console.error("Error fetching comments:", error);
            res.status(500).json({ message: "Error fetching comments." });
        }
    });

    // POST /api/posts/:postId/comment - Add a new comment to a post
    router.post('/:postId/comment', async (req, res) => {
        const { postId } = req.params;
        const { commentText } = req.body;
        const commenterId = req.user.userId;
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            
            const [posts] = await connection.query('SELECT userID FROM posts WHERE id = ?', [postId]);
            const [commenter] = await connection.query('SELECT first_name FROM users WHERE userID = ?', [commenterId]);
            
            const postAuthorId = posts[0]?.userID;
            const commenterName = commenter[0]?.first_name || 'Someone';

            await connection.query('INSERT INTO post_comments (postID, userID, commentText, createdAt) VALUES (?, ?, ?, ?)', [postId, commenterId, commentText.trim(), new Date()]);
            await connection.query('UPDATE posts SET commentCount = (SELECT COUNT(*) FROM post_comments WHERE postID = ?) WHERE id = ?', [postId, postId]);
            
            if (postAuthorId && postAuthorId !== commenterId) {
                const notificationMessage = `${commenterName} commented on your post.`;
                await createNotification(connection, postAuthorId, notificationMessage, 'info');
            }
            
            await connection.commit();
            res.status(201).json({ success: true, message: "Comment added successfully." });
        } catch (error) {
            await connection.rollback();
            console.error("Error adding comment:", error);
            res.status(500).json({ message: "Failed to add comment." });
        } finally {
            connection.release();
        }
    });
    
    // POST /api/posts/comments/:commentId/like - Like a comment
    router.post('/comments/:commentId/like', async (req, res) => {
        const { commentId } = req.params;
        const userId = req.user.userId;
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('INSERT IGNORE INTO comment_likes (userID, commentID) VALUES (?, ?)', [userId, commentId]);
            await connection.query('UPDATE post_comments SET likeCount = (SELECT COUNT(*) FROM comment_likes WHERE commentID = ?) WHERE id = ?', [commentId, commentId]);
            await connection.commit();
            res.status(200).json({ success: true, message: 'Comment liked.' });
        } catch (error) {
            await connection.rollback();
            console.error("Error liking comment:", error);
            res.status(500).json({ message: "Failed to like comment." });
        } finally {
            connection.release();
        }
    });

    // DELETE /api/posts/comments/:commentId/like - Unlike a comment
    router.delete('/comments/:commentId/like', async (req, res) => {
        const { commentId } = req.params;
        const userId = req.user.userId;
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('DELETE FROM comment_likes WHERE userID = ? AND commentID = ?', [userId, commentId]);
            await connection.query('UPDATE post_comments SET likeCount = GREATEST(0, (SELECT COUNT(*) FROM comment_likes WHERE commentID = ?)) WHERE id = ?', [commentId, commentId]);
            await connection.commit();
            res.status(200).json({ success: true, message: 'Comment unliked.' });
        } catch (error) {
            await connection.rollback();
            console.error("Error unliking comment:", error);
            res.status(500).json({ message: "Failed to unlike comment." });
        } finally {
            connection.release();
        }
    });

    // POST /api/posts/comments/:commentId/report - Report a comment
    router.post('/comments/:commentId/report', async (req, res) => {
        const { commentId } = req.params;
        const reportingUserId = req.user.userId;
        try {
            await dbPool.query('INSERT IGNORE INTO comment_reports (commentID, reportingUserID) VALUES (?, ?)', [commentId, reportingUserId]);
            res.status(200).json({ success: true, message: 'Thank you, this comment has been reported for review.' });
        } catch (error) {
            console.error(`Error reporting comment ${commentId} by user ${reportingUserId}:`, error);
            res.status(500).json({ message: "Failed to report comment." });
        }
    });

    // DELETE /api/posts/comments/:commentId/report - Un-report a comment
    router.delete('/comments/:commentId/report', async (req, res) => {
        const { commentId } = req.params;
        const reportingUserId = req.user.userId;
        try {
            await dbPool.query(
                'DELETE FROM comment_reports WHERE commentID = ? AND reportingUserID = ?',
                [commentId, reportingUserId]
            );
            res.status(200).json({ success: true, message: 'Your report has been retracted.' });
        } catch (error) {
            console.error(`Error un-reporting comment ${commentId} by user ${reportingUserId}:`, error);
            res.status(500).json({ message: "An error occurred while retracting the report." });
        }
    });

    router.delete('/comments/:commentId', async (req, res) => {
        const { commentId } = req.params;
        const userId = req.user.userId;
        const connection = await dbPool.getConnection();
        
        try {
            await connection.beginTransaction();

            const [comments] = await connection.query('SELECT userID, postID FROM post_comments WHERE id = ?', [commentId]);
            if (comments.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: 'Comment not found.' });
            }

            const comment = comments[0];
            const postId = comment.postID;

            if (comment.userID !== userId) {
                await connection.rollback();
                connection.release();
                return res.status(403).json({ message: 'Forbidden: You are not the owner of this comment.' });
            }
            
            //Delete the comment.
            await connection.query('DELETE FROM post_comments WHERE id = ?', [commentId]);
            
            //  Reliably decrement the count in the `posts` table by 1.
            await connection.query(
                'UPDATE posts SET commentCount = GREATEST(0, commentCount - 1) WHERE id = ?', 
                [postId]
            );
            
            await connection.commit();
            res.status(200).json({ success: true, message: 'Comment deleted successfully.' });

        } catch (error) {
            await connection.rollback();
            console.error("Error deleting comment:", error);
            res.status(500).json({ message: "Failed to delete comment." });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    });

    return router;
}

module.exports = createPostsRouter;