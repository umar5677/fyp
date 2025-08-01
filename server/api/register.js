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
                html: `
              <div style="background-color: #f8f9fa; padding: 40px; font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                  <div style="background-color: #00BBFF; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Welcome to GlucoBites!</h1>
                  </div>
                  <div style="padding: 30px;">
                    <h2 style="font-size: 20px; color: #333;">Hi ${firstName},</h2>
                    <p style="color: #555; line-height: 1.6;">
                      Thank you for registering. We're excited to have you on board.
                      To complete your setup and secure your account, please verify your email address by clicking the button below.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${verificationLink}" 
                         style="background-color: #00BBFF; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                        Verify My Email
                      </a>
                    </div>
                    <p style="color: #555; line-height: 1.6;">
                      This verification link is valid for one hour.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">
                      If you did not create this account, you can safely ignore this email.
                      <br/>
                      © 2025 GlucoBites. All rights reserved.
                    </p>
                  </div>
                </div>
              </div>
            `,
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