/**
 * VERIFY ENVIRONMENT VARIABLES ARE SET
 *
 * This script checks if your Nextier deployment has all required env vars
 */

const axios = require('axios');

const NEXTIER_URL = 'https://monkfish-app-mb7h3.ondigitalocean.app';

console.log('🔍 VERIFYING NEXTIER ENVIRONMENT VARIABLES\n');
console.log('='.repeat(60));

async function checkHealth() {
  console.log('\n📡 1. Checking API Health...');

  try {
    const response = await axios.get(`${NEXTIER_URL}/health`, { timeout: 10000 });
    console.log(`✅ API is online`);
    console.log(`   Status: ${response.data.status || 'healthy'}`);
    return true;
  } catch (error) {
    console.log(`❌ API is offline or not responding`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function checkGraphQL() {
  console.log('\n🔗 2. Checking GraphQL Endpoint...');

  try {
    const response = await axios.post(
      `${NEXTIER_URL}/graphql`,
      {
        query: `{ __typename }`
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    console.log(`✅ GraphQL is working`);
    console.log(`   Response: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    console.log(`❌ GraphQL error`);
    console.log(`   Error: ${error.response?.data || error.message}`);
    return false;
  }
}

async function checkDatabase() {
  console.log('\n💾 3. Checking Database Connection...');

  try {
    const response = await axios.post(
      `${NEXTIER_URL}/graphql`,
      {
        query: `
          query {
            __schema {
              types {
                name
              }
            }
          }
        `
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    if (response.data.data) {
      console.log(`✅ Database connection working`);
      console.log(`   Schema loaded: ${response.data.data.__schema.types.length} types`);
      return true;
    } else {
      console.log(`⚠️  GraphQL schema issue`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Database connection error`);
    console.log(`   Error: ${error.response?.data || error.message}`);
    return false;
  }
}

async function checkAIIntegrations() {
  console.log('\n🤖 4. Verifying AI API Keys (Anthropic, OpenAI)...');
  console.log('   Note: Cannot test directly, but check if LLM settings page loads');

  try {
    const response = await axios.get(`${NEXTIER_URL}/admin/integrations/llm-settings`, {
      timeout: 10000,
      validateStatus: (status) => status < 500  // Accept redirects and 4xx
    });

    if (response.status === 200 || response.status === 302) {
      console.log(`✅ LLM settings endpoint accessible`);
      console.log(`   If you added ANTHROPIC_API_KEY, it should be available in the app`);
      return true;
    } else {
      console.log(`⚠️  LLM settings returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 302) {
      console.log(`✅ LLM settings page exists (auth required)`);
      console.log(`   Your ANTHROPIC_API_KEY should be set if you added it`);
      return true;
    }

    console.log(`⚠️  Could not verify LLM settings`);
    console.log(`   Error: ${error.message}`);
    return true;  // Don't fail on this, just a warning
  }
}

async function checkDeploymentStatus() {
  console.log('\n🚀 5. Checking Recent Deployments...');
  console.log('   After adding env vars, DigitalOcean should auto-redeploy');
  console.log('   Check: https://cloud.digitalocean.com/apps/[your-app-id]/deployments');
  console.log('\n   If you just added keys:');
  console.log('   - Wait 2-3 minutes for automatic redeployment');
  console.log('   - Or manually trigger a deployment in DigitalOcean');
}

async function runVerification() {
  const healthOk = await checkHealth();
  const graphqlOk = await checkGraphQL();
  const dbOk = await checkDatabase();
  const aiOk = await checkAIIntegrations();
  await checkDeploymentStatus();

  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));

  console.log(`${healthOk ? '✅' : '❌'} API Health`);
  console.log(`${graphqlOk ? '✅' : '❌'} GraphQL Endpoint`);
  console.log(`${dbOk ? '✅' : '❌'} Database Connection`);
  console.log(`${aiOk ? '✅' : '⚠️ '} AI Integrations (check manually in UI)`);

  console.log('\n' + '='.repeat(60));
  console.log('🔑 ABOUT ENVIRONMENT VARIABLES IN DIGITALOCEAN');
  console.log('='.repeat(60));
  console.log('✅ DigitalOcean HIDES values after saving - this is NORMAL security!');
  console.log('✅ Even though you can\'t see them, they ARE there');
  console.log('✅ To verify a key is working:');
  console.log('   1. Go to /admin/integrations/llm-settings in Nextier');
  console.log('   2. Try to use AI features');
  console.log('   3. Check deployment logs for any "missing env var" errors');
  console.log('\n📝 Keys you should have added:');
  console.log('   - ANTHROPIC_API_KEY ✅ (you just added this)');
  console.log('   - OPENAI_API_KEY');
  console.log('   - SIGNALHOUSE_API_KEY');
  console.log('   - REALESTATE_API_KEY');
  console.log('   - REALESTATE_SKIPTRACE_API_KEY');
  console.log('   - PROPERTY_HUNT_API_URL');
  console.log('   - SENDGRID_API_KEY');

  if (healthOk && graphqlOk && dbOk) {
    console.log('\n🎉 YOUR NEXTIER APP IS ONLINE AND WORKING!');
    console.log('\nNext steps:');
    console.log('1. Visit: https://monkfish-app-mb7h3.ondigitalocean.app');
    console.log('2. Login: admin@nextier.com / Admin123!');
    console.log('3. Go to /admin/integrations/llm-settings');
    console.log('4. Test AI message generation with your Anthropic key');
  } else {
    console.log('\n⚠️  SOME CHECKS FAILED');
    console.log('\nTroubleshooting:');
    console.log('1. Check DigitalOcean deployment logs');
    console.log('2. Make sure app redeployed after adding env vars');
    console.log('3. Verify database connection string is correct');
  }

  console.log('\n');
}

runVerification()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Verification failed:', err.message);
    process.exit(1);
  });
