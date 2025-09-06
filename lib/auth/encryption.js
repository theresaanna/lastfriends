// lib/auth/encryption.js - Modern Node.js crypto implementation
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getEncryptionKey() {
  const key = process.env.AUTH_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('AUTH_ENCRYPTION_KEY environment variable is required');
  }

  if (key.length !== 64) {
    throw new Error('AUTH_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }

  return Buffer.from(key, 'hex');
}

export async function encryptToken(token) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);

    // Use modern createCipheriv (not deprecated createCipher)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Token encryption failed:', error);
    throw new Error('Token encryption failed: ' + error.message);
  }
}

export async function decryptToken(encryptedToken) {
  try {
    const [ivHex, encrypted] = encryptedToken.split(':');

    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted token format');
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');

    // Use modern createDecipheriv (not deprecated createDecipher)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error);
    throw new Error('Token decryption failed: ' + error.message);
  }
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}