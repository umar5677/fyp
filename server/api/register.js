// /home/ec2-user/fyp/server/api/register.js

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');

// Re-use the hashPassword function from your login API
const { hashPassword } = require('./login.js');

function createRegisterRouter(dbPool) {
    const router = express.Router();

    const s3Client = new S3Client({
        region: process.env.AWS_REGION
    });
    const S3_BUCKET_NAME = 'glucobites-hp-documents';

    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    });

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    router.post('/', upload.single('certificate'), async (req, res) => {
        const connection = await dbPool.getConnection();
        try {
            const { email, password, firstName, lastName, userType, healthcareType } = req.body;
            const certificateFile = req.file;

            if (!email || !password || !firstName || !lastName || !userType) {
                return res.status(400).json({ message: 'All required fields must be provided.' });
            }
            if (userType === 'Healthcare Provider') {
                if (!healthcareType) return res.status(400).json({ message: 'Healthcare provider type is required.' });
                if (!certificateFile) return res.status(400).json({ message: 'A certification document is required.' });
            }

            const hashedPassword = await hashPassword(password);
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const setPremium = (userType === 'Premium') ? 1 : 0;
            const setProvider = (userType === 'Healthcare Provider') ? 1 : 0;
            
            const premiumExpire = (userType === 'Premium')
                ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                : null;
            
            await connection.beginTransaction();
            
            let documentUrl = null;
            if (setProvider === 1 && certificateFile) {
                const safeFolderName = `${firstName}-${lastName}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); 
                const uniqueFileName = `${crypto.randomBytes(16).toString('hex')}-${certificateFile.originalname}`;
                const s3DocumentKey = `${safeFolderName}/${uniqueFileName}`;
                
                const s3Command = new PutObjectCommand({ 
                    Bucket: S3_BUCKET_NAME, 
                    Key: s3DocumentKey, 
                    Body: certificateFile.buffer, 
                    ContentType: certificateFile.mimetype 
                });
                await s3Client.send(s3Command);
                
                documentUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3DocumentKey}`;
            }
            
            const userSql = `
                INSERT INTO users (email, password, first_name, last_name, verification_token, token_expires_at, setPremium, premiumExpire, setProvider) 
                VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP() + INTERVAL 1 HOUR, ?, ?, ?)
            `;
            const userValues = [email, hashedPassword, firstName, lastName, verificationToken, setPremium, premiumExpire, setProvider];
            const [userResult] = await connection.query(userSql, userValues);
            const newUserId = userResult.insertId;
            
            if (setProvider === 1) {
                const hpSql = `INSERT INTO verifyHP (userID, provType, document) VALUES (?, ?, ?)`;
                await connection.query(hpSql, [newUserId, healthcareType, documentUrl]);
            }
            
            await connection.commit();
            
            const verificationLink = `https://glucobites.org/verify-email?token=${verificationToken}`; // This link should point to your website's verification page
            const mailOptions = {
                from: `"GlucoBites" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Welcome to GlucoBites! Please Verify Your Email',
                html: `... your email HTML here ...`, // Paste your existing email HTML
            };
            await transporter.sendMail(mailOptions);
            
            res.status(201).json({ message: 'User registered successfully! Please check your email for a verification link.' });

        } catch (error) {
            await connection.rollback();
            console.error('Registration error:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Email address is already registered.' });
            }
            res.status(500).json({ message: 'Server error during registration.' });
        } finally {
            if (connection) connection.release();
        }
    });

    return router;
}

module.exports = createRegisterRouter;