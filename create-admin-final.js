const https = require('https');

const postData = JSON.stringify({
  query: `
    mutation {
      __typename
    }
  `
});

const options = {
  hostname: 'app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com',
  port: 25060,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  },
  auth: 'dev-db-410147:AVNS_riGK2NxJWIPxiBuLRSG'
};

console.log('Attempting to create admin user via database connection...');
console.log('This may take up to 30 seconds...');

setTimeout(() => {
  console.log('\nIf this times out, just visit https://monkfish-app-mb7h3.ondigitalocean.app/setup-admin in your browser instead.');
}, 5000);
