const https = require('https');

const data = JSON.stringify({
  query: `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        token
        user {
          id
          email
          name
        }
      }
    }
  `,
  variables: {
    input: {
      email: "admin@nextier.com",
      password: "Admin123!"
    }
  }
});

const options = {
  hostname: 'monkfish-app-mb7h3.ondigitalocean.app',
  port: 443,
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing login with admin@nextier.com...\n');

const req = https.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(body);

      if (response.errors) {
        console.log('❌ LOGIN FAILED');
        console.log('Error:', response.errors[0].message);
        console.log('\nFull error:', JSON.stringify(response.errors, null, 2));
      } else if (response.data && response.data.login) {
        console.log('✅ LOGIN SUCCESSFUL!');
        console.log('\nUser:', response.data.login.user);
        console.log('\nToken received:', response.data.login.token.substring(0, 50) + '...');
      } else {
        console.log('Unexpected response:', body);
      }
    } catch (e) {
      console.log('Failed to parse response:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(data);
req.end();
