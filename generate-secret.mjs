#!/usr/bin/env node
// Generate a secure secret for NEXTAUTH_SECRET
import crypto from 'crypto';

console.log('=== NEXTAUTH_SECRET GENERATOR ===\n');

// Generate a secure 32-byte secret
const secret = crypto.randomBytes(32).toString('base64');

console.log('Generated NEXTAUTH_SECRET:');
console.log(secret);
console.log('\nTo use this secret, add it to your environment:');
console.log(`export NEXTAUTH_SECRET="${secret}"`);
console.log('\nOr add it to your .env.local file:');
console.log(`NEXTAUTH_SECRET=${secret}`);
console.log('\n⚠️  Note: This will generate a NEW secret. Any existing JWT tokens');
console.log('will need to be recreated with the new secret.');
