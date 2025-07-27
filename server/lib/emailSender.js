const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // This is pre-configured for Gmail
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = async (to, subject, textBody) => {
    const mailOptions = {
        from: `"GlucoBites" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text: textBody,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email successfully sent to ${to}`);
    } catch (error) {
        console.error(`Nodemailer error sending email to ${to}:`, error);
        throw new Error('Server failed to send email.');
    }
};

module.exports = { sendEmail };