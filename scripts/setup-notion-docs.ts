/**
 * NOTION DOCUMENTATION HUB SETUP
 * Created: 2025-01-22
 * Purpose: Centralize all scattered documentation into Notion workspace
 */

import * as fs from 'fs';
import * as path from 'path';

interface NotionPage {
  title: string;
  content: string;
  parentId?: string;
  icon?: string;
  database?: boolean;
}

interface NotionDatabase {
  title: string;
  properties: Record<string, any>;
  icon?: string;
}

// Documentation files to migrate to Notion
const DOCS_TO_MIGRATE = [
  'MCP-IMPLEMENTATION-MASTER-PLAN.md',
  'sendgrid-integration-guide.md',
  'provision-client.md',
  'secure-digitalocean.md',
  'postgres-optimization.md',
  'notion-documentation-hub.md',
  'README.md',
];

// Notion workspace structure
const NOTION_STRUCTURE = {
  workspace: {
    title: 'Nextier Global - SaaS Operations Hub',
    icon: '🚀',
  },
  sections: [
    {
      title: '📚 Documentation',
      icon: '📚',
      pages: [
        { title: 'Master Implementation Plan', source: 'MCP-IMPLEMENTATION-MASTER-PLAN.md' },
        { title: 'SendGrid Integration', source: 'sendgrid-integration-guide.md' },
        { title: 'Client Provisioning', source: 'provision-client.md' },
        { title: 'Security Configuration', source: 'secure-digitalocean.md' },
        { title: 'Database Optimization', source: 'postgres-optimization.md' },
      ],
    },
    {
      title: '👥 Client Management',
      icon: '👥',
      database: true,
      properties: {
        Name: { type: 'title' },
        Domain: { type: 'url' },
        Plan: {
          type: 'select',
          options: ['Starter', 'Pro', 'Enterprise'],
        },
        Status: {
          type: 'select',
          options: ['Active', 'Pending', 'Suspended', 'Cancelled'],
        },
        'Monthly Revenue': { type: 'number', format: 'dollar' },
        'Provisioned Date': { type: 'date' },
        'App ID': { type: 'text' },
        'Database ID': { type: 'text' },
        'Admin Email': { type: 'email' },
        'Last Updated': { type: 'last_edited_time' },
      },
    },
    {
      title: '📧 Campaign Templates',
      icon: '📧',
      database: true,
      properties: {
        Name: { type: 'title' },
        'Template Type': {
          type: 'select',
          options: ['Email', 'SMS', 'Voice', 'Multi-channel'],
        },
        Industry: {
          type: 'select',
          options: ['Real Estate', 'General', 'Custom'],
        },
        'Use Case': {
          type: 'multi_select',
          options: ['Lead Gen', 'Nurture', 'Reactivation', 'Event Promo'],
        },
        'Success Rate': { type: 'number', format: 'percent' },
        'Times Used': { type: 'number' },
        'Template Content': { type: 'text' },
        'Created By': { type: 'text' },
        'Last Updated': { type: 'last_edited_time' },
      },
    },
    {
      title: '🏠 Property Intelligence Playbooks',
      icon: '🏠',
      database: true,
      properties: {
        Name: { type: 'title' },
        'Property Type': {
          type: 'select',
          options: ['Single Family', 'Multi-family', 'Commercial', 'Land'],
        },
        'Distress Signal': {
          type: 'multi_select',
          options: [
            'Pre-Foreclosure',
            'High Equity',
            'Vacant',
            'Absentee Owner',
            'Estate/Trust',
            'Tax Lien',
            'Code Violation',
            'Divorce',
            'Probate',
          ],
        },
        'Target Score': { type: 'number' },
        'AI SDR Prompt': { type: 'text' },
        'Campaign Strategy': { type: 'text' },
        'Success Rate': { type: 'number', format: 'percent' },
        'Last Updated': { type: 'last_edited_time' },
      },
    },
    {
      title: '🔧 Infrastructure',
      icon: '🔧',
      database: true,
      properties: {
        Name: { type: 'title' },
        Type: {
          type: 'select',
          options: ['Database', 'App', 'Redis', 'CDN', 'Other'],
        },
        Client: { type: 'text' },
        Status: {
          type: 'select',
          options: ['Online', 'Offline', 'Degraded', 'Maintenance'],
        },
        Region: { type: 'text' },
        Size: { type: 'text' },
        'Monthly Cost': { type: 'number', format: 'dollar' },
        'Resource ID': { type: 'text' },
        'Created Date': { type: 'date' },
        'Last Updated': { type: 'last_edited_time' },
      },
    },
    {
      title: '🐛 Issues & Bugs',
      icon: '🐛',
      database: true,
      properties: {
        Title: { type: 'title' },
        Status: {
          type: 'select',
          options: ['Open', 'In Progress', 'Fixed', 'Closed', 'Wont Fix'],
        },
        Priority: {
          type: 'select',
          options: ['Critical', 'High', 'Medium', 'Low'],
        },
        'Affected Client': { type: 'text' },
        'Assigned To': { type: 'text' },
        'Created Date': { type: 'date' },
        'Resolved Date': { type: 'date' },
        Description: { type: 'text' },
        'Last Updated': { type: 'last_edited_time' },
      },
    },
    {
      title: '📊 API Reference',
      icon: '📊',
      database: true,
      properties: {
        Endpoint: { type: 'title' },
        Method: {
          type: 'select',
          options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        },
        Category: {
          type: 'select',
          options: ['Leads', 'Campaigns', 'Messages', 'Teams', 'Users', 'Properties'],
        },
        'Auth Required': { type: 'checkbox' },
        'Rate Limited': { type: 'checkbox' },
        Description: { type: 'text' },
        'Request Example': { type: 'text' },
        'Response Example': { type: 'text' },
        'Last Updated': { type: 'last_edited_time' },
      },
    },
  ],
};

/**
 * Generate Notion setup commands
 */
function generateNotionCommands() {
  console.log('');
  console.log('==================================================');
  console.log('🚀 NOTION DOCUMENTATION HUB SETUP COMMANDS');
  console.log('==================================================');
  console.log('');
  console.log('Copy these commands to Claude Desktop (with Notion MCP active)');
  console.log('');

  // Create workspace
  console.log('STEP 1: CREATE WORKSPACE');
  console.log('========================');
  console.log('');
  console.log('Ask Claude Desktop:');
  console.log('');
  console.log('```');
  console.log(`Create a new Notion workspace titled "${NOTION_STRUCTURE.workspace.title}"`);
  console.log('with the following structure:');
  console.log('');

  // Create sections and databases
  NOTION_STRUCTURE.sections.forEach((section, idx) => {
    console.log(`${idx + 1}. ${section.title}`);

    if (section.database) {
      console.log(`   Type: Database`);
      console.log(`   Properties:`);
      const db = section as any;
      if (db.properties) {
        Object.entries(db.properties).forEach(([propName, propConfig]: [string, any]) => {
          console.log(`   - ${propName}: ${propConfig.type}`);
        });
      }
    } else {
      console.log(`   Type: Page collection`);
      if ((section as any).pages) {
        (section as any).pages.forEach((page: any) => {
          console.log(`   - ${page.title}`);
        });
      }
    }
    console.log('');
  });

  console.log('```');
  console.log('');

  // Import documentation files
  console.log('STEP 2: IMPORT DOCUMENTATION FILES');
  console.log('===================================');
  console.log('');
  console.log('For each markdown file, ask Claude Desktop:');
  console.log('');

  DOCS_TO_MIGRATE.forEach((docFile) => {
    console.log(`Import ${docFile} into Notion:`);
    console.log('```');
    console.log(`Read the file at: ${path.join(process.cwd(), docFile)}`);
    console.log(`Create a new Notion page titled "${docFile.replace('.md', '')}"`);
    console.log(`In the "📚 Documentation" section`);
    console.log('```');
    console.log('');
  });

  // Sample data for databases
  console.log('STEP 3: ADD SAMPLE DATA');
  console.log('========================');
  console.log('');

  console.log('CLIENT MANAGEMENT - Sample Entry:');
  console.log('```');
  console.log('Create a new entry in the "Client Management" database:');
  console.log('- Name: Hasaas Real Estate');
  console.log('- Domain: https://hasaas.app');
  console.log('- Plan: Pro');
  console.log('- Status: Active');
  console.log('- Monthly Revenue: $299');
  console.log('- Provisioned Date: Today');
  console.log('- Admin Email: admin@hasaas.app');
  console.log('```');
  console.log('');

  console.log('CAMPAIGN TEMPLATES - Sample Entry:');
  console.log('```');
  console.log('Create a new entry in the "Campaign Templates" database:');
  console.log('- Name: Pre-Foreclosure Outreach');
  console.log('- Template Type: Multi-channel');
  console.log('- Industry: Real Estate');
  console.log('- Use Case: Lead Gen');
  console.log('- Success Rate: 23%');
  console.log('- Template Content: (see campaign-templates/pre-foreclosure.md)');
  console.log('```');
  console.log('');

  console.log('PROPERTY PLAYBOOKS - Sample Entry:');
  console.log('```');
  console.log('Create a new entry in the "Property Intelligence Playbooks" database:');
  console.log('- Name: High Equity Single Family');
  console.log('- Property Type: Single Family');
  console.log('- Distress Signal: High Equity, Absentee Owner');
  console.log('- Target Score: 70+');
  console.log('- AI SDR Prompt: (see playbooks/high-equity-sf.md)');
  console.log('- Success Rate: 18%');
  console.log('```');
  console.log('');

  // Automation
  console.log('STEP 4: SET UP AUTOMATION');
  console.log('==========================');
  console.log('');
  console.log('Ask Claude Desktop to set up these automations:');
  console.log('');
  console.log('1. Auto-update "Last Updated" when any page changes');
  console.log('2. Send Slack notification when new client is added');
  console.log('3. Weekly digest of infrastructure costs');
  console.log('4. Alert when any client status changes to "Suspended" or "Cancelled"');
  console.log('');

  // Integration
  console.log('STEP 5: INTEGRATE WITH CODEBASE');
  console.log('=================================');
  console.log('');
  console.log('Add Notion integration to your codebase:');
  console.log('');
  console.log('1. Install Notion SDK:');
  console.log('   npm install @notionhq/client');
  console.log('');
  console.log('2. Create Notion integration at: https://www.notion.so/my-integrations');
  console.log('');
  console.log('3. Add environment variable:');
  console.log('   NOTION_API_KEY=secret_xxxxxxxxxxxx');
  console.log('');
  console.log('4. Use in your app:');
  console.log('   ```typescript');
  console.log("   import { Client } from '@notionhq/client';");
  console.log('   ');
  console.log('   const notion = new Client({ auth: process.env.NOTION_API_KEY });');
  console.log('   ');
  console.log('   // Log new client provisioning');
  console.log('   await notion.pages.create({');
  console.log("     parent: { database_id: 'client-management-db-id' },");
  console.log('     properties: {');
  console.log('       Name: { title: [{ text: { content: clientName } }] },');
  console.log('       Domain: { url: clientDomain },');
  console.log('       Plan: { select: { name: planTier } },');
  console.log("       Status: { select: { name: 'Active' } },");
  console.log('       // ... other properties');
  console.log('     },');
  console.log('   });');
  console.log('   ```');
  console.log('');

  console.log('==================================================');
  console.log('✅ NOTION SETUP COMPLETE');
  console.log('==================================================');
  console.log('');
  console.log('After setup, you will have:');
  console.log('1. Centralized documentation hub');
  console.log('2. Client management database');
  console.log('3. Campaign template library');
  console.log('4. Property intelligence playbooks');
  console.log('5. Infrastructure tracking');
  console.log('6. Issue tracking system');
  console.log('7. API reference documentation');
  console.log('');
  console.log('Benefits:');
  console.log('- No more scattered markdown files');
  console.log('- Real-time collaboration');
  console.log('- Automated client onboarding documentation');
  console.log('- Template sharing across team');
  console.log('- Infrastructure cost tracking');
  console.log('');
}

/**
 * Create local documentation index
 */
function createLocalIndex() {
  const indexContent = `# Nextier Documentation Index

This index provides quick links to all documentation resources.

## 📚 Core Documentation

${DOCS_TO_MIGRATE.map(
  (doc) => `- [${doc.replace('.md', '')}](./${doc})`
).join('\n')}

## 🔗 External Resources

- [Notion Workspace](https://notion.so) - Main documentation hub
- [DigitalOcean Dashboard](https://cloud.digitalocean.com) - Infrastructure
- [SendGrid Dashboard](https://app.sendgrid.com) - Email platform
- [GitHub Repository](https://github.com/your-org/nextier) - Source code

## 🚀 Quick Start Guides

### For New Team Members
1. Read the [Master Implementation Plan](./MCP-IMPLEMENTATION-MASTER-PLAN.md)
2. Review [Security Configuration](./secure-digitalocean.md)
3. Understand [Client Provisioning](./provision-client.md)

### For Client Provisioning
1. Follow [Client Provisioning Guide](./provision-client.md)
2. Use automated script: \`./scripts/provision-client.sh\`
3. Document in Notion Client Management database

### For SendGrid Setup
1. Read [SendGrid Integration Guide](./sendgrid-integration-guide.md)
2. Run setup script: \`ts-node setup-sendgrid.ts\`
3. Test email sending

### For Database Optimization
1. Review [Postgres Optimization Guide](./postgres-optimization.md)
2. Run migration: \`psql -f migrations/001_performance_indexes.sql\`
3. Monitor query performance

## 📞 Support

- Technical Issues: Create issue in GitHub
- Infrastructure Issues: Contact DevOps team
- Client Issues: Update Notion Client Management DB

---

Last Updated: ${new Date().toISOString().split('T')[0]}
`;

  fs.writeFileSync('DOCUMENTATION-INDEX.md', indexContent);
  console.log('');
  console.log('✅ Created DOCUMENTATION-INDEX.md');
  console.log('');
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 NEXTIER NOTION DOCUMENTATION SETUP');
  console.log('=====================================');
  console.log('');

  // Generate Notion commands
  generateNotionCommands();

  // Create local index
  createLocalIndex();

  console.log('');
  console.log('Next steps:');
  console.log('1. Copy the commands above to Claude Desktop');
  console.log('2. Create the Notion workspace structure');
  console.log('3. Import all documentation files');
  console.log('4. Set up automations');
  console.log('5. Integrate with your codebase');
  console.log('');
}

main();
