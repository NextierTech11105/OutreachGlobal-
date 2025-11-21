/**
 * NEXTIER - B2B/COMMERCIAL LEAD AUTOMATION
 *
 * This script generates B2B leads from:
 * - LinkedIn profiles (sphinx-usdata-linkedin droplet)
 * - Business List API (app.outreachglobal.io)
 * - Company data enrichment
 *
 * For REAL ESTATE leads, use daily-lead-automation.js (HAAS system)
 */

const axios = require('axios');

// ===== CONFIGURATION =====
const BUSINESS_LIST_API = 'https://app.outreachglobal.io'; // Your droplet
const LINKEDIN_DATA_API = 'http://146.190.135.158'; // sphinx-usdata-linkedin droplet
const NEXTIER_API = 'https://monkfish-app-mb7h3.ondigitalocean.app';
const NEXTIER_TEAM_ID = 'admin-team'; // Your Nextier team ID

// B2B Search Criteria
const SEARCH_CRITERIA = {
  // Target Industries
  industries: [
    'Real Estate',
    'Construction',
    'Property Management',
    'Real Estate Investment',
    'Commercial Real Estate'
  ],

  // Job Titles to Target
  titles: [
    'CEO',
    'Founder',
    'Owner',
    'President',
    'VP',
    'Director',
    'Managing Partner',
    'Investment Manager'
  ],

  // Company Size
  employeeCount: {
    min: 10,
    max: 500
  },

  // Location
  locations: [
    'United States'
  ]
};

// ===== STEP 1: SEARCH BUSINESS LIST API =====
async function searchBusinesses() {
  try {
    console.log('🔍 Searching Business List API for B2B leads...\n');

    const response = await axios.post(
      `${BUSINESS_LIST_API}/api/search`,
      {
        industries: SEARCH_CRITERIA.industries,
        job_titles: SEARCH_CRITERIA.titles,
        employee_count_min: SEARCH_CRITERIA.employeeCount.min,
        employee_count_max: SEARCH_CRITERIA.employeeCount.max,
        locations: SEARCH_CRITERIA.locations,
        limit: 100
      }
    );

    const companies = response.data.results || response.data.companies || [];

    console.log(`✅ Found ${companies.length} companies`);
    console.log(`   Industries: ${SEARCH_CRITERIA.industries.join(', ')}`);
    console.log(`   Employee Range: ${SEARCH_CRITERIA.employeeCount.min}-${SEARCH_CRITERIA.employeeCount.max}`);

    return companies;
  } catch (error) {
    console.error('❌ Business List API Error:', error.response?.data || error.message);
    return [];
  }
}

// ===== STEP 2: ENRICH WITH LINKEDIN DATA =====
async function enrichWithLinkedIn(company) {
  try {
    const response = await axios.post(
      `${LINKEDIN_DATA_API}/api/enrich`,
      {
        company_name: company.name,
        domain: company.domain || company.website
      }
    );

    const linkedInData = response.data;

    return {
      ...company,
      linkedIn: {
        employees: linkedInData.employees || [],
        companyUrl: linkedInData.company_url,
        followerCount: linkedInData.follower_count,
        description: linkedInData.description
      }
    };
  } catch (error) {
    console.error(`⚠️  LinkedIn enrichment failed for ${company.name}`);
    return company;
  }
}

async function enrichCompanies(companies) {
  console.log(`\n🔗 Enriching ${companies.length} companies with LinkedIn data...\n`);

  const enriched = [];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const enrichedCompany = await enrichWithLinkedIn(company);
    enriched.push(enrichedCompany);

    console.log(`   Processed ${i + 1}/${companies.length}: ${company.name}`);

    // Rate limit: 1 request per second
    if (i + 1 < companies.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n✅ Enrichment Complete!`);
  return enriched;
}

// ===== STEP 3: EXTRACT DECISION MAKERS =====
function extractDecisionMakers(enrichedCompanies) {
  console.log(`\n👥 Extracting decision makers...`);

  const leads = [];

  enrichedCompanies.forEach(company => {
    // Get key decision makers from LinkedIn data
    const decisionMakers = (company.linkedIn?.employees || [])
      .filter(employee =>
        SEARCH_CRITERIA.titles.some(title =>
          employee.title?.toLowerCase().includes(title.toLowerCase())
        )
      );

    // If no LinkedIn data, create lead from company info
    if (decisionMakers.length === 0) {
      leads.push({
        companyName: company.name,
        industry: company.industry,
        employeeCount: company.employee_count,
        website: company.website || company.domain,
        phone: company.phone,
        address: company.address,
        city: company.city,
        state: company.state,
        country: company.country,
        contactName: null,
        contactTitle: null,
        contactEmail: null,
        contactPhone: null,
        linkedInUrl: company.linkedIn?.companyUrl,
        source: 'Business List API'
      });
    } else {
      // Create a lead for each decision maker
      decisionMakers.forEach(dm => {
        leads.push({
          companyName: company.name,
          industry: company.industry,
          employeeCount: company.employee_count,
          website: company.website || company.domain,
          phone: company.phone,
          address: company.address,
          city: company.city,
          state: company.state,
          country: company.country,
          contactName: dm.name || `${dm.first_name} ${dm.last_name}`,
          contactTitle: dm.title,
          contactEmail: dm.email,
          contactPhone: dm.phone,
          linkedInUrl: dm.linkedin_url,
          source: 'LinkedIn + Business List'
        });
      });
    }
  });

  console.log(`✅ Extracted ${leads.length} decision maker leads`);
  console.log(`   Companies: ${enrichedCompanies.length}`);
  console.log(`   Avg leads per company: ${(leads.length / enrichedCompanies.length).toFixed(1)}\n`);

  return leads;
}

// ===== STEP 4: IMPORT TO NEXTIER =====
async function importToNextier(leads) {
  try {
    console.log(`📤 Importing ${leads.length} B2B leads to Nextier...\n`);

    const response = await axios.post(
      `${NEXTIER_API}/graphql`,
      {
        query: `
          mutation CreateB2BLeads($input: [CreateLeadInput!]!) {
            createLeads(input: $input) {
              id
              companyName
              contactName
            }
          }
        `,
        variables: {
          input: leads.map(lead => ({
            teamId: NEXTIER_TEAM_ID,
            companyName: lead.companyName,
            industry: lead.industry,
            website: lead.website,
            phone: lead.phone,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            country: lead.country,
            contactName: lead.contactName,
            contactTitle: lead.contactTitle,
            contactEmail: lead.contactEmail,
            contactPhone: lead.contactPhone,
            metadata: {
              employeeCount: lead.employeeCount,
              linkedInUrl: lead.linkedInUrl,
              source: lead.source
            }
          }))
        }
      }
    );

    console.log(`✅ Successfully imported ${leads.length} B2B leads!`);
    console.log(`   Team: ${NEXTIER_TEAM_ID}`);
    console.log(`   Ready for AI outreach campaigns!\n`);

    return response.data;
  } catch (error) {
    console.error('❌ Nextier Import Error:', error.response?.data || error.message);

    // Fallback: Use Property Hunt API import endpoint
    console.log('\n⚠️  Trying fallback import method...');

    const fallbackResponse = await axios.post(
      `${BUSINESS_LIST_API}/api/export-to-nextier`,
      {
        teamId: NEXTIER_TEAM_ID,
        leads: leads
      }
    );

    console.log('✅ Imported via fallback method!');
    return fallbackResponse.data;
  }
}

// ===== MAIN WORKFLOW =====
async function runB2BAutomation() {
  console.log('🚀 NEXTIER B2B LEAD AUTOMATION\n');
  console.log('='.repeat(60));
  console.log(`Time: ${new Date().toLocaleString()}\n`);

  // Step 1: Search for companies
  const companies = await searchBusinesses();

  if (companies.length === 0) {
    console.log('ℹ️  No companies found matching criteria.');
    return;
  }

  // Step 2: Enrich with LinkedIn data
  const enrichedCompanies = await enrichCompanies(companies);

  // Step 3: Extract decision makers
  const leads = extractDecisionMakers(enrichedCompanies);

  // Filter to only those with contact info
  const withContact = leads.filter(lead =>
    lead.contactEmail || lead.contactPhone || lead.phone
  );

  console.log(`📞 Contact Info Available: ${withContact.length}/${leads.length}\n`);

  // Step 4: Import to Nextier
  if (withContact.length > 0) {
    await importToNextier(withContact);

    // Summary
    console.log('='.repeat(60));
    console.log('📊 B2B AUTOMATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Leads: ${withContact.length}`);
    console.log(`Industries: ${[...new Set(withContact.map(l => l.industry))].join(', ')}`);
    console.log(`With Email: ${withContact.filter(l => l.contactEmail).length}`);
    console.log(`With Phone: ${withContact.filter(l => l.contactPhone || l.phone).length}`);
    console.log(`With LinkedIn: ${withContact.filter(l => l.linkedInUrl).length}`);
    console.log(`\n🎯 Next Step: Launch AI campaigns in Nextier!`);
    console.log(`   Visit: ${NEXTIER_API}/t/${NEXTIER_TEAM_ID}/campaigns`);
  } else {
    console.log('ℹ️  No leads with contact info found.');
  }

  console.log('\n✅ B2B AUTOMATION COMPLETE!\n');
}

// Run it
runB2BAutomation()
  .then(() => {
    console.log('✅ Success!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Automation Failed:', err.message);
    process.exit(1);
  });
