const argon2 = require('argon2');

async function hashPassword() {
  const hash = await argon2.hash('Admin123!');
  console.log(hash);
}

hashPassword();
