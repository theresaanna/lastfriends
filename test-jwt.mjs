#!/usr/bin/env node
// Test JWT creation and verification with current environment
import { SignJWT, jwtVerify } from 'jose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret-key');

async function testJWT() {
  console.log('=== JWT CREATION AND VERIFICATION TEST ===\n');
  
  // Check if we have a proper secret
  console.log('Using secret:', process.env.NEXTAUTH_SECRET ? 'NEXTAUTH_SECRET (from environment)' : 'fallback-secret-key');
  
  try {
    // Create a test JWT token with similar data to your original
    const testPayload = {
      id: 'test-user-id-123',
      dataSource: 'spotify',
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
      spotifyId: 'testspotifyid',
      country: 'US',
      tokens: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour from now
        scope: 'test-scope'
      },
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };
    
    console.log('\n1. Creating JWT token...');
    
    // Create JWT
    const token = await new SignJWT(testPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
    
    console.log('✅ JWT created successfully');
    console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
    
    console.log('\n2. Verifying JWT token...');
    
    // Verify JWT
    const { payload } = await jwtVerify(token, secret);
    
    console.log('✅ JWT verified successfully');
    console.log('Verified payload:', JSON.stringify(payload, null, 2));
    
    console.log('\n3. Testing with debug tool...');
    console.log('You can now test this token with the debug tool:');
    console.log(`NEXTAUTH_SECRET="${process.env.NEXTAUTH_SECRET}" node debug-jwt.js "${token}"`);
    
    return { success: true, token };
    
  } catch (error) {
    console.error('❌ JWT test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
testJWT();
