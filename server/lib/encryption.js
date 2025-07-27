const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

// The key must be a 32-byte buffer.
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

// The Initialization Vector (IV) must be 16 bytes for this algorithm.
const IV_LENGTH = 16;

function encrypt(text) {
    // If the input is null or empty, return it as is.
    if (text == null) return null;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedData) {
    // If the input is null or empty, return it as is.
    if (encryptedData == null) return null;
    
    try {
        const parts = encryptedData.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedContent = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        decipher.setAuthTag(authTag); // Verifies the authenticity of the data

        let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error("Decryption failed for a message:", error.message);
        // If decryption fails (e.g., key change, corrupted data),
        return '[Message cannot be decrypted]';
    }
}

module.exports = { encrypt, decrypt };