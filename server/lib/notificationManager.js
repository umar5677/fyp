
const createNotification = async (dbPool, targetUserId, message, type = 'info') => {
    // Basic validation to ensure all required arguments are provided.
    if (!dbPool || !targetUserId || !message) {
        console.error('createNotification failed: Missing required parameters (dbPool, targetUserId, message).');
        return; 
    }

    try {
        const query = 'INSERT INTO notifications (userID, message, type, timestamp) VALUES (?, ?, ?, NOW())';
        await dbPool.query(query, [targetUserId, message, type]);
        console.log(`Successfully created notification for userID: ${targetUserId}`);
    } catch (error) {
        console.error(`Database error while creating notification for userID ${targetUserId}:`, error);
    }
};

module.exports = { createNotification };