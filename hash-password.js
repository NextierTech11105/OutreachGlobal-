const crypto = require('crypto');

// Simple password hash for testing
// Password: Admin123!
const password = 'Admin123!';

// Generate a simple hash (for testing only - not production secure)
const hash = crypto.createHash('sha256').update(password).digest('hex');

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nFor SQL:');
console.log(`'${hash}'`);
