// Simple script to run migrations against production database
const { execSync } = require('child_process');

// Set the production database URL
process.env.DATABASE_URL = 'postgresql://dev-db-410147:AVNS_riGK2NxJWIPxiBuLRSG@app-98cd0402-e1d4-48ef-9adf-173580806a89-do-user-18831337-0.g.db.ondigitalocean.com:25060/dev-db-410147?sslmode=require';

console.log('Running database migrations...');

try {
  execSync('cd apps/api && npx drizzle-kit push', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('\n✅ SUCCESS! Database tables created.');
  console.log('\nNow run: node create-user.js');
} catch (error) {
  console.error('Failed:', error.message);
  process.exit(1);
}
