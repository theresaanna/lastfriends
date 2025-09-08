// test-encryption.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { encryptToken, decryptToken } from './lib/auth/encryption.js';

async function testEncryption() {
  try {
    console.log('Testing encryption...');
    console.log('AUTH_ENCRYPTION_KEY length:', process.env.AUTH_ENCRYPTION_KEY?.length);

    if (!process.env.AUTH_ENCRYPTION_KEY) {
      console.error('❌ AUTH_ENCRYPTION_KEY not found in .env.local');
      return;
    }

    const testToken = 'test-spotify-token-12345';
    console.log('Original token:', testToken);

    const encrypted = await encryptToken(testToken);
    console.log('Encrypted token:', encrypted);

    const decrypted = await decryptToken(encrypted);
    console.log('Decrypted token:', decrypted);

    console.log('✅ Match:', testToken === decrypted);
  } catch (error) {
    console.error('❌ Encryption test failed:', error);
  }
}

testEncryption();