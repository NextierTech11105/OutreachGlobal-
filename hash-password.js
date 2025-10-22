const argon2 = require('argon2');

async function hashPassword(password) {
  const hash = await argon2.hash(password);
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL Query to update database:');
  console.log(`UPDATE users SET password = '${hash}' WHERE email = 'tb@outreachglobal.io';`);
}

hashPassword('Tradingview#1');
