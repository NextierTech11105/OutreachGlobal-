const https = require('https');

// Test different endpoints
const tests = [
  { name: 'Root API', path: '/' },
  { name: 'GraphQL', path: '/graphql' },
  { name: 'Setup Admin', path: '/setup-admin' },
];

function testEndpoint(test) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'monkfish-app-mb7h3.ondigitalocean.app',
      port: 443,
      path: test.path,
      method: 'GET',
      headers: {
        'User-Agent': 'NodeTest'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        console.log(`\n${test.name} (${test.path}):`);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Response: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`\n${test.name} (${test.path}):`);
      console.log(`  Error: ${e.message}`);
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing API endpoints...\n');
  for (const test of tests) {
    await testEndpoint(test);
  }
  console.log('\n---\n');

  // Try GraphQL POST
  console.log('Testing GraphQL POST request...');
  const data = JSON.stringify({ query: '{__typename}' });
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

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Response: ${body}`);
    });
  });

  req.on('error', (e) => {
    console.log(`Error: ${e.message}`);
  });

  req.write(data);
  req.end();
}

runTests();
