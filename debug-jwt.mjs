// Enhanced JWT Debug Tool - run with: node debug-jwt.js
import { jwtVerify } from 'jose';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Common secrets that might have been used (no hardcoded secrets)
const commonSecrets = [
  process.env.NEXTAUTH_SECRET,
  'fallback-secret-key', // Only fallback for development
  // Add other common development secrets if needed
].filter(Boolean).map(secret => new TextEncoder().encode(secret));

// Decode JWT payload without verification (just to see the data)
function decodeJWTPayload(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64'));
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64'));
    
    console.log('\n=== JWT TOKEN ANALYSIS (UNVERIFIED) ===');
    console.log('Header:', JSON.stringify(decodedHeader, null, 2));
    console.log('\nPayload:', JSON.stringify(decodedPayload, null, 2));
    
    // Token analysis
    console.log('\n=== TOKEN ANALYSIS ===');
    console.log('User ID:', decodedPayload.id || decodedPayload.sub || 'N/A');
    console.log('Username:', decodedPayload.username || decodedPayload.name || 'N/A');
    console.log('Email:', decodedPayload.email || 'N/A');
    console.log('Data Source:', decodedPayload.dataSource || 'N/A');
    
    if (decodedPayload.iat) {
      console.log('Issued At:', new Date(decodedPayload.iat * 1000).toISOString());
    }
    if (decodedPayload.exp) {
      const expDate = new Date(decodedPayload.exp * 1000);
      const isExpired = Date.now() > decodedPayload.exp * 1000;
      console.log('Expires At:', expDate.toISOString());
      console.log('Is Expired:', isExpired);
    }
    if (decodedPayload.createdAt) {
      console.log('Session Created:', new Date(decodedPayload.createdAt).toISOString());
    }
    
    return decodedPayload;
  } catch (error) {
    console.error('Failed to decode JWT payload:', error.message);
    return null;
  }
}

// Try to verify JWT with multiple secrets
async function verifyJWTWithSecrets(token) {
  console.log('\n=== ATTEMPTING VERIFICATION ===');
  console.log(`Trying ${commonSecrets.length} different secrets...\n`);
  
  for (let i = 0; i < commonSecrets.length; i++) {
    const secret = commonSecrets[i];
    const secretName = [
      process.env.NEXTAUTH_SECRET && 'NEXTAUTH_SECRET',
      'fallback-secret-key'
    ].filter(Boolean)[i] || `Secret ${i + 1}`;
    
    try {
      console.log(`Trying secret: ${secretName}...`);
      const { payload } = await jwtVerify(token, secret);
      console.log(`\n✅ SUCCESS! Token verified with secret: ${secretName}`);
      console.log('\n=== VERIFIED PAYLOAD ===');
      console.log(JSON.stringify(payload, null, 2));
      return { success: true, payload, secretUsed: secretName };
    } catch (error) {
      console.log(`❌ Failed with ${secretName}: ${error.message}`);
    }
  }
  
  console.log('\n❌ All verification attempts failed.');
  return { success: false };
}

// Main function
async function debugJWT(token) {
  console.log('=== JWT DEBUG TOOL ===\n');
  console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
  
  // First, decode without verification to see the data
  const payload = decodeJWTPayload(token);
  
  if (payload) {
    // Then try to verify with different secrets
    await verifyJWTWithSecrets(token);
    
    // Suggest next steps
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Set the correct NEXTAUTH_SECRET environment variable');
    console.log('2. If this is a production token, get the secret from your deployment');
    console.log('3. If this is a test token, try creating a new one with your current environment');
    
    if (payload.dataSource === 'spotify') {
      console.log('\n=== SPOTIFY SESSION INFO ===');
      console.log('This appears to be a Spotify-authenticated session.');
      if (payload.tokens?.accessToken) {
        const tokenPreview = payload.tokens.accessToken.substring(0, 20) + '...';
        console.log('Spotify Access Token:', tokenPreview);
        if (payload.tokens.expiresAt) {
          const isExpired = Date.now() > payload.tokens.expiresAt;
          console.log('Spotify Token Expired:', isExpired);
        }
      }
    }
  }
}

// Check if a token was passed as argument
const token = process.argv[2];
if (token) {
  debugJWT(token);
} else {
  console.log('\n=== JWT DEBUG TOOL ===');
  console.log('Usage: node debug-jwt.js <jwt_token>');
  console.log('\nThis tool will:');
  console.log('- Decode the JWT payload without verification');
  console.log('- Try multiple secrets to verify the token');
  console.log('- Provide detailed analysis and next steps');
  console.log('\nExample:');
  console.log('node debug-jwt.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
}
