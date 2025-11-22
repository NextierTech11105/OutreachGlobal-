/**
 * SendGrid MCP Integration Setup Script
 *
 * This script uses the SendGrid MCP to:
 * 1. Validate API key
 * 2. Set up verified sender identity
 * 3. Create email templates for campaigns
 * 4. Configure webhook endpoints
 * 5. Set up suppression groups
 */

import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

async function main() {
  console.log('\n🚀 NEXTIER - SendGrid MCP Integration Setup\n');
  console.log('This script will configure SendGrid for your email campaigns.\n');

  // Step 1: Get SendGrid API Key
  console.log('📧 Step 1: SendGrid API Key');
  console.log('Get your API key from: https://app.sendgrid.com/settings/api_keys\n');

  const apiKey = await ask('Enter your SendGrid API Key: ');

  if (!apiKey) {
    console.error('❌ API key is required!');
    process.exit(1);
  }

  // Step 2: Verified Sender Details
  console.log('\n✉️  Step 2: Verified Sender Identity');
  console.log('This is the "From" email address for all campaigns.\n');

  const fromEmail = await ask('From Email Address (e.g., noreply@yourdomain.com): ');
  const fromName = await ask('From Name (e.g., Nextier Global): ');

  // Step 3: Team/Database Details
  console.log('\n🏢 Step 3: Database Configuration');
  const databaseUrl = await ask('PostgreSQL Database URL: ');
  const teamId = await ask('Team ID (or press Enter to update all teams): ');

  rl.close();

  console.log('\n⚙️  Configuring SendGrid...\n');

  // Instructions for MCP usage
  console.log('===================================================');
  console.log('MCP INTEGRATION STEPS');
  console.log('===================================================\n');

  console.log('1. VALIDATE API KEY');
  console.log('   Use SendGrid MCP to test the API key:\n');
  console.log('   ```');
  console.log(`   sendgrid.validateApiKey({ apiKey: "${apiKey}" })`);
  console.log('   ```\n');

  console.log('2. CREATE VERIFIED SENDER');
  console.log('   SendGrid requires sender verification:\n');
  console.log('   ```');
  console.log('   sendgrid.createVerifiedSender({');
  console.log(`     fromEmail: "${fromEmail}",`);
  console.log(`     fromName: "${fromName}",`);
  console.log(`     apiKey: "${apiKey}"`);
  console.log('   })');
  console.log('   ```');
  console.log('   → Check your email and click the verification link!\n');

  console.log('3. CREATE EMAIL TEMPLATES');
  console.log('   Set up dynamic templates for campaigns:\n');
  console.log('   Template 1: Campaign Email');
  console.log('   ```');
  console.log('   sendgrid.createTemplate({');
  console.log('     name: "Nextier Campaign Email",');
  console.log('     generation: "dynamic",');
  console.log(`     apiKey: "${apiKey}"`);
  console.log('   })');
  console.log('   ```\n');

  console.log('4. SET UP SUPPRESSION GROUPS');
  console.log('   Create unsubscribe groups:\n');
  console.log('   ```');
  console.log('   sendgrid.createSuppressionGroup({');
  console.log('     name: "Campaign Unsubscribes",');
  console.log('     description: "Opt out of marketing campaigns",');
  console.log(`     apiKey: "${apiKey}"`);
  console.log('   })');
  console.log('   ```\n');

  console.log('5. CONFIGURE WEBHOOK');
  console.log('   Set up event tracking (opens, clicks, bounces):\n');
  console.log('   ```');
  console.log('   sendgrid.createWebhook({');
  console.log('     url: "https://your-domain.com/webhooks/sendgrid",');
  console.log('     enabled: true,');
  console.log('     events: [');
  console.log('       "processed", "delivered", "open", "click",');
  console.log('       "bounce", "dropped", "spam_report", "unsubscribe"');
  console.log('     ],');
  console.log(`     apiKey: "${apiKey}"`);
  console.log('   })');
  console.log('   ```\n');

  console.log('6. UPDATE DATABASE');
  console.log('   Store SendGrid settings in your database:\n');
  console.log('   ```sql');
  if (teamId) {
    console.log(`   UPDATE team_settings`);
    console.log(`   SET sendgrid_api_key = '${apiKey}',`);
    console.log(`       sendgrid_from_email = '${fromEmail}',`);
    console.log(`       sendgrid_from_name = '${fromName}'`);
    console.log(`   WHERE team_id = '${teamId}';`);
  } else {
    console.log(`   UPDATE team_settings`);
    console.log(`   SET sendgrid_api_key = '${apiKey}',`);
    console.log(`       sendgrid_from_email = '${fromEmail}',`);
    console.log(`       sendgrid_from_name = '${fromName}';`);
  }
  console.log('   ```\n');

  console.log('7. TEST EMAIL SEND');
  console.log('   Send a test email via MCP:\n');
  console.log('   ```');
  console.log('   sendgrid.sendEmail({');
  console.log('     to: "your-test@email.com",');
  console.log(`     from: "${fromEmail}",`);
  console.log('     subject: "Nextier Test Email",');
  console.log('     html: "<h1>Success!</h1><p>Your SendGrid integration works!</p>",');
  console.log(`     apiKey: "${apiKey}"`);
  console.log('   })');
  console.log('   ```\n');

  console.log('===================================================');
  console.log('NEXT STEPS');
  console.log('===================================================\n');

  console.log('1. Use Claude Desktop (with SendGrid MCP) to run the commands above');
  console.log('2. Verify sender email in your inbox');
  console.log('3. Update your .env file:');
  console.log(`   MAIL_HOST="smtp.sendgrid.net"`);
  console.log(`   MAIL_PORT=587`);
  console.log(`   MAIL_USER="apikey"`);
  console.log(`   MAIL_PASSWORD="${apiKey}"`);
  console.log(`   MAIL_FROM_ADDRESS="${fromEmail}"`);
  console.log(`   MAIL_FROM_NAME="${fromName}"`);
  console.log('4. Restart your API server');
  console.log('5. Test campaign email sending from the UI\n');

  console.log('✅ Setup configuration generated!\n');
  console.log('Save this output and use Claude Desktop MCP to execute the commands.\n');
}

main().catch(console.error);
