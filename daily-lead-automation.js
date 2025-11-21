/**
 * DAILY AUTOMATED LEAD GENERATION WORKFLOW
 *
 * This script runs every morning and:
 * 1. Retrieves saved search updates (new properties)
 * 2. Skip traces each property to get phone/email
 * 3. Imports to Nextier as leads
 * 4. Ready for AI campaign launch
 *
 * Set this up as a cron job to run daily at 6 AM
 */

const axios = require('axios');

// ===== CONFIGURATION =====
const REALESTATE_API_KEY = 'NEXTIER-2906-74a1-8684-d2f63f473b7b';
const REALESTATE_SKIPTRACE_KEY = 'ELITEHOMEOWNERADVISORSSKIPPRODUCTION-8aae-7b54-9463-5db02217ffa5';
const PROPERTY_HUNT_API = 'https://property-hunt-api-yahrg.ondigitalocean.app';
const NEXTIER_TEAM_ID = 'admin-team-id'; // Replace with your actual team ID

// Your saved search IDs (create these first with create-saved-search.js)
const SAVED_SEARCHES = [
  'your-search-id-1', // Replace with actual search ID from create-saved-search.js
  'your-search-id-2', // Add more as needed
];

// ===== STEP 1: RETRIEVE SAVED SEARCH UPDATES =====
async function getDailyUpdates(searchId) {
  try {
    console.log(`📥 Retrieving updates for search: ${searchId}`);

    const response = await axios.post(
      'https://api.realestateapi.com/v1/PropertyPortfolio/SavedSearch',
      { search_id: searchId },
      {
        headers: {
          'x-api-key': REALESTATE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const summary = response.data.summary;
    console.log(`\n📊 Updates Summary:`);
    console.log(`   Added: ${summary.added} new properties`);
    console.log(`   Updated: ${summary.updated} price drops/changes`);
    console.log(`   Deleted: ${summary.deleted} no longer match`);

    return response.data.data || [];
  } catch (error) {
    console.error('❌ Error retrieving saved search:', error.response?.data || error.message);
    return [];
  }
}

// ===== STEP 2: SKIP TRACE PROPERTIES =====
async function skipTraceProperty(property) {
  try {
    const mailAddress = property.mailAddress || property.address;

    const response = await axios.post(
      'https://api.realestateapi.com/v1/SkipTrace',
      {
        mail_address: mailAddress.street || mailAddress.address,
        mail_city: mailAddress.city,
        mail_state: mailAddress.state,
        mail_zip: mailAddress.zip,
        first_name: property.owner1FirstName || property.owner_first_name,
        last_name: property.owner1LastName || property.owner_last_name
      },
      {
        headers: {
          'x-api-key': REALESTATE_SKIPTRACE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const skipData = response.data;

    return {
      propertyId: property.id || property.propertyId,
      address: property.address,
      owner: `${property.owner1FirstName} ${property.owner1LastName}`,
      phones: skipData.phones || [],
      emails: skipData.emails || [],
      age: skipData.age,
      estimatedValue: property.estimatedValue || property.value,
      equity: property.estimatedEquity || property.equity,
      equityPercent: property.equityPercent || property.equity_percent
    };
  } catch (error) {
    console.error(`⚠️  Skip trace failed for ${property.address?.address}:`, error.message);
    return null;
  }
}

async function bulkSkipTrace(properties) {
  console.log(`\n🔍 Skip tracing ${properties.length} properties...`);

  const skipTraced = [];
  let successCount = 0;
  let failCount = 0;

  // Process in batches of 10 to avoid rate limits
  for (let i = 0; i < properties.length; i += 10) {
    const batch = properties.slice(i, i + 10);

    const results = await Promise.allSettled(
      batch.map(prop => skipTraceProperty(prop))
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        skipTraced.push(result.value);
        successCount++;
      } else {
        failCount++;
      }
    });

    console.log(`   Processed ${Math.min(i + 10, properties.length)}/${properties.length}`);

    // Rate limit: wait 1 second between batches
    if (i + 10 < properties.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n✅ Skip Trace Complete:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Success Rate: ${((successCount / properties.length) * 100).toFixed(1)}%`);

  return skipTraced;
}

// ===== STEP 3: IMPORT TO NEXTIER =====
async function importToNextier(leads) {
  try {
    console.log(`\n📤 Importing ${leads.length} leads to Nextier...`);

    const response = await axios.post(
      `${PROPERTY_HUNT_API}/api/import-leads`,
      {
        teamId: NEXTIER_TEAM_ID,
        leads: leads.map(lead => ({
          propertyAddress: lead.address.address,
          city: lead.address.city,
          state: lead.address.state,
          zipCode: lead.address.zip,
          ownerName: lead.owner,
          ownerPhone: lead.phones[0] || null,
          ownerEmail: lead.emails[0] || null,
          propertyValue: lead.estimatedValue,
          equity: lead.equity,
          equityPercent: lead.equityPercent,
          metadata: {
            skipTracePhones: lead.phones,
            skipTraceEmails: lead.emails,
            age: lead.age,
            source: 'RealEstateAPI Saved Search'
          }
        }))
      }
    );

    console.log(`✅ Successfully imported ${leads.length} leads to Nextier!`);
    console.log(`   Team: ${NEXTIER_TEAM_ID}`);
    console.log(`   Ready for AI campaigns!\n`);

    return response.data;
  } catch (error) {
    console.error('❌ Error importing to Nextier:', error.response?.data || error.message);
    throw error;
  }
}

// ===== MAIN WORKFLOW =====
async function runDailyAutomation() {
  console.log('🚀 DAILY LEAD AUTOMATION STARTED\n');
  console.log(`Time: ${new Date().toLocaleString()}\n`);

  const allLeads = [];

  // Process each saved search
  for (const searchId of SAVED_SEARCHES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing Saved Search: ${searchId}`);
    console.log('='.repeat(60));

    // Get new properties
    const properties = await getDailyUpdates(searchId);

    if (properties.length === 0) {
      console.log('ℹ️  No new properties found for this search.');
      continue;
    }

    // Skip trace them
    const skipTraced = await bulkSkipTrace(properties);

    // Filter to only those with contact info
    const withContact = skipTraced.filter(lead =>
      lead.phones.length > 0 || lead.emails.length > 0
    );

    console.log(`\n📞 Contact Info Found: ${withContact.length}/${skipTraced.length}`);

    allLeads.push(...withContact);
  }

  // Import all leads to Nextier
  if (allLeads.length > 0) {
    await importToNextier(allLeads);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DAILY AUTOMATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total New Leads: ${allLeads.length}`);
    console.log(`With Phone: ${allLeads.filter(l => l.phones.length > 0).length}`);
    console.log(`With Email: ${allLeads.filter(l => l.emails.length > 0).length}`);
    console.log(`Average Equity: $${Math.round(allLeads.reduce((sum, l) => sum + (l.equity || 0), 0) / allLeads.length).toLocaleString()}`);
    console.log(`\n🎯 Next Step: Launch AI campaigns in Nextier!`);
    console.log(`   Visit: https://monkfish-app-mb7h3.ondigitalocean.app/t/${NEXTIER_TEAM_ID}/campaigns`);
  } else {
    console.log('\nℹ️  No new leads with contact info today.');
  }

  console.log('\n✅ DAILY AUTOMATION COMPLETE!\n');
}

// Run it
runDailyAutomation()
  .then(() => {
    console.log('✅ Success!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Automation Failed:', err.message);
    process.exit(1);
  });
