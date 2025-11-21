const https = require('https');

const mutation = `
mutation Login {
  login(input: {email: "admin@nextier.com", password: "Admin123!"}) {
    token
    user {
      id
      email
      name
      role
    }
  }
}
`;

const data = JSON.stringify({
  query: mutation
});

const options = {
  hostname: 'monkfish-app-mb7h3.ondigitalocean.app',
  port: 443,
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Attempting login...\n');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let body = '';
  res.on('data', (d) => {
    body += d;
  });

  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const json = JSON.parse(body);
      console.log(JSON.stringify(json, null, 2));

      if (json.errors) {
        console.log('\n❌ LOGIN FAILED');
        console.log('Error:', json.errors[0].message);
      } else if (json.data && json.data.login) {
        console.log('\n✅ LOGIN SUCCESSFUL!');
        console.log('User:', json.data.login.user);
      }
    } catch (e) {
      console.log(body);
    }
  });
});

req.on('error', (e) => {
  console.error('Request failed:', e);
});

req.write(data);
req.end();
