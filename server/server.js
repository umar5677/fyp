require('dotenv').config();
const crypto = require('crypto');
const { sendEmail } = require('./lib/emailSender.js');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken'); 
const authenticateToken = require('./lib/authMiddleware.js');
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const { startScheduledReports } = require('./lib/reportScheduler.js');

// Routers
const createAdminRouter = require('./api/adminRoutes.js');
const createVerifyEmailChangeRouter = require('./api/verifyEmailChange.js');
const createPasswordResetRouter = require('./api/passwordReset.js');
const createVerifyEmailRouter = require('./api/verifyEmail.js');
const createRegisterRouter = require('./api/register.js');
const createReviewsRouter = require('./api/reviews.js');
const loginApi = require('./api/login.js');
const createGenerateReportRoute = require('./api/generateReport.js');
const createUserSettingsRoutes = require('./api/userSettings.js');
const createProvidersRouter = require('./api/providers.js');
const createOcrRouter = require('./api/ocr.js');
const createPredictionsRouter = require('./api/predictions.js');
const createQnaRouter = require('./api/qna.js');
const createProviderRouter = require('./api/provider.js');
const createAiRouter = require('./api/aiFoodScan.js');
const createNotificationsRouter = require('./api/notifications.js');
const createRemindersRouter = require('./api/reminders.js');
const createPostsRouter = require('./api/posts.js');
const createExerciseRouter = require('./api/exercise.js');
const createBarcodeRouter = require('./api/barcodeScan.js'); 
const createLogsRouter = require('./api/logs.js');

const app = express();
const corsOptions = {
    origin: [
        'https://glucobites.org',
        'https://www.glucobites.org',
        'http://localhost:3000',
        'http://localhost:5173',
    ]
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

const dbPool = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, waitForConnections: true, connectionLimit: 10, queueLimit: 0 });

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_PROFILE_PIC_BUCKET, 
        metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
        key: (req, file, cb) => {
            const userId = req.user.userId;
            const fullPath = `profile-pictures/${userId}/profile`;
            cb(null, fullPath);
        }
    })
});


// --- ADMIN & PUBLIC ROUTES ---
// These routes do NOT require JWT authentication
app.use('/admin', createAdminRouter(dbPool));
app.use('/api/profile/verify-email-change', createVerifyEmailChangeRouter(dbPool));
app.use('/api/verify-email', createVerifyEmailRouter(dbPool));
app.use('/api/register', createRegisterRouter(dbPool));
app.use('/api/login', loginApi.createLoginRouter(dbPool));
app.use('/api/password-reset', createPasswordResetRouter(dbPool));
app.use('/api/exercise', createExerciseRouter(dbPool));
app.use('/api/reviews', createReviewsRouter(dbPool)); 

app.post('/api/token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).json({ message: 'Refresh Token is required.' });

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Refresh Token is not valid.' });
        
        const payload = { 
            userId: user.userId, 
            isProvider: user.isProvider
        };

        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.json({ accessToken });
    });
});


// --- PROTECTED ROUTES ---
// THE FIX: Apply the authenticateToken middleware HERE. 
// Any route defined below this line will be protected.
app.use('/api', authenticateToken);


// MOUNT FULLY-PROTECTED ROUTERS
app.use('/api/user-settings', createUserSettingsRoutes(dbPool));
app.post('/api/generate-report', createGenerateReportRoute(dbPool)); // Should this be GET? POST is fine.
app.use('/api/providers', createProvidersRouter(dbPool));
app.use('/api/ocr', createOcrRouter(dbPool));
app.use('/api/predictions', createPredictionsRouter(dbPool));
app.use('/api/qna', createQnaRouter(dbPool));
app.use('/api/provider', createProviderRouter(dbPool));
app.use('/api/ai', createAiRouter(dbPool));
app.use('/api/notifications', createNotificationsRouter(dbPool));
app.use('/api/reminders', createRemindersRouter(dbPool));
app.use('/api/posts', createPostsRouter(dbPool));
app.use('/api/barcode', createBarcodeRouter(dbPool));
app.use('/api/logs', createLogsRouter(dbPool));

// MOUNT OTHER PROTECTED ROUTES DIRECTLY
app.post('/api/upload/profile-picture', upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    const imageUrl = req.file.location;
    try {
        await dbPool.query('UPDATE users SET pfpUrl = ? WHERE userID = ?', [imageUrl, req.user.userId]);
        res.status(200).json({ success: true, imageUrl });
    } catch (error) {
        res.status(500).json({ success: false, message: 'File uploaded, but failed to save link.' });
    }
});


app.put('/api/profile-setup', async (req, res) => {
    const userId = req.user.userId;
    const { dob, weight, height, diabetesType, gender, isInsulin } = req.body;
    
    if (dob === undefined || weight === undefined || height === undefined || gender === null || diabetesType === null || isInsulin === undefined) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        let calorieGoal = 2000;
        const age = new Date().getFullYear() - new Date(dob).getFullYear();

        if (gender === 'Male' && weight > 0 && height > 0 && age > 0) {
            const bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
            calorieGoal = Math.round(bmr * 1.375);
        } else if (gender === 'Female' && weight > 0 && height > 0 && age > 0) {
            const bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
            calorieGoal = Math.round(bmr * 1.375);
        }

        await dbPool.query(
            `UPDATE users SET dob = ?, weight = ?, height = ?, diabetes = ?, gender = ?, isInsulin = ?, calorieGoal = ?, hasProfileSetup = 1 WHERE userID = ?`,
            [dob, weight, height, diabetesType, gender, isInsulin, calorieGoal, userId]
        );
        
        res.status(200).json({ success: true, message: 'Profile setup complete!' });

    } catch (error) {
        console.error('Profile setup error:', error);
        res.status(500).json({ message: 'Error updating profile.' });
    }
});

app.post('/api/profile/change-password', async (req, res) => {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Your new password must be at least 8 characters long.' });
    }
    try {
        const [users] = await dbPool.query('SELECT password FROM users WHERE userID = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const user = users[0];
        const isMatch = await loginApi.comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }
        const newHashedPassword = await loginApi.hashPassword(newPassword);
        await dbPool.query('UPDATE users SET password = ? WHERE userID = ?', [newHashedPassword, userId]);
        res.status(200).json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Error changing password.' });
    }
});

app.get('/api/profile', async (req, res) => {
    const userId = req.user.userId;
    try {
        const [users] = await dbPool.query(
            `SELECT u.userID, u.email, u.first_name, u.last_name, u.dob, u.weight, 
                    u.height, u.gender, u.diabetes, u.isInsulin, u.pfpUrl, 
                    u.hasProfileSetup, u.setProvider AS isProvider, u.calorieGoal,
                    COALESCE(v.isVerified, 0) AS isHpVerified
             FROM users u
             LEFT JOIN verifyHP v ON u.userID = v.userID
             WHERE u.userID = ?`, 
            [userId]
        );
        
        if (users.length === 0) return res.status(404).json({ message: 'User not found.' });
        
        const user = {
            ...users[0],
            isHpVerified: !!users[0].isHpVerified
        };

        res.json({ user: user });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Error fetching profile.' });
    }
});


app.put('/api/profile', async (req, res) => {
    const userId = req.user.userId;
    const updates = req.body;
    const newEmail = updates.email ? updates.email.trim() : undefined;
    try {
        const [users] = await dbPool.query('SELECT email FROM users WHERE userID = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found.' });
        
        const currentUserEmail = users[0].email;
        if (newEmail && newEmail !== currentUserEmail) {
            const [existingEmail] = await dbPool.query('SELECT userID FROM users WHERE email = ?', [newEmail]);
            if (existingEmail.length > 0) return res.status(409).json({ message: 'This email address is already in use.' });
            
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 60 * 60 * 1000);
            await dbPool.query( 'UPDATE users SET new_email_pending = ?, email_change_token = ?, email_change_token_expires = ? WHERE userID = ?', [newEmail, token, expires, userId] );
            const verificationLink = `https://glucobites.org/verify-email-change?token=${token}`;
            const emailSubject = 'Please Verify Your New GlucoBites Email Address';
            const emailText = `Hello,\n\nYou requested to change the email address for your GlucoBites account. Please click the link below to confirm this change:\n\n${verificationLink}\n\nThis link will expire in one hour. If you did not request this change, please ignore this email.\n\nThanks,\nThe GlucoBites Team`;
            await sendEmail(newEmail, emailSubject, emailText);
            delete updates.email;
        }

        let queryFields = [];
        let queryParams = [];
        const allowedFields = ['first_name', 'last_name', 'dob', 'height', 'weight', 'gender', 'diabetes', 'isInsulin', 'calorieGoal'];
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key) && updates[key] !== undefined) {
                queryFields.push(`${key} = ?`);
                queryParams.push(updates[key]);
            }
        });

        if (queryFields.length > 0) {
            const queryString = `UPDATE users SET ${queryFields.join(', ')} WHERE userID = ?`;
            queryParams.push(userId);
            await dbPool.query(queryString, queryParams);
        }

        if (newEmail && newEmail !== currentUserEmail) {
            res.status(200).json({ message: "Verification required. Please check your new email address to complete the change." });
        } else {
            res.status(200).json({ message: "Profile updated successfully." });
        }
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Error updating profile." });
    }
});

app.delete('/api/profile', async (req, res) => {
    const userId = req.user.userId;
    try {
        await dbPool.query('DELETE FROM reviews WHERE userID = ?', [userId]);
        await dbPool.query('DELETE FROM reportLogs WHERE userID = ?', [userId]);
        await dbPool.query('DELETE FROM user_thresholds WHERE userID = ?', [userId]);
        await dbPool.query('DELETE FROM dataLogs WHERE userID = ?', [userId]);
        await dbPool.query('DELETE FROM users WHERE userID = ?', [userId]);
        res.status(200).json({ message: "Account deleted successfully." });
    } catch (error) {
        console.error("Account deletion error:", error);
        res.status(500).json({ message: "Error deleting account." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startScheduledReports();
});