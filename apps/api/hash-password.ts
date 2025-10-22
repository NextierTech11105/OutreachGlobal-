import * as argon2 from 'argon2';

async function hashPassword(password: string) {
  const hash = await argon2.hash(password);
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\n=== SQL Query to update database ===');
  console.log(`UPDATE users SET password = '${hash}' WHERE email = 'tb@outreachglobal.io';`);
  console.log('====================================\n');
}

hashPassword('Tradingview#1');
