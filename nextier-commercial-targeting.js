/**
 * NEXTIER - BLUE COLLAR BUSINESS OWNER TARGETING
 *
 * Strategy: Find successful blue-collar business owners who own commercial real estate
 *
 * Target Profile:
 * - Blue collar industries (construction, HVAC, plumbing, electrical, etc.)
 * - $1M - $50M annual revenue
 * - Own commercial property (warehouse, office, shop)
 * - Prime for business services, financing, expansion consulting
 */

const axios = require('axios');

// ===== CONFIGURATION =====
const REALESTATE_API_KEY = 'NEXTIER-2906-74a1-8684-d2f63f473b7b';
const REALESTATE_SKIPTRACE_KEY = 'ELITEHOMEOWNERADVISORSSKIPPRODUCTION-8aae-7b54-9463-5db02217ffa5';
const PROPERTY_HUNT_API = 'https://property-hunt-api-yahrg.ondigitalocean.app';
const NEXTIER_TEAM_ID = 'admin-team';

// Blue Collar Industries Target List
const TARGET_INDUSTRIES = {
  'Construction': {
    keywords: ['construction', 'builder', 'contractor', 'remodeling', 'renovation'],
    property_types: ['Warehouse', 'Office', 'Mixed Use'],
    revenue_range: [1000000, 50000000]
  },
  'HVAC': {
    keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'ventilation'],
    property_types: ['Warehouse', 'Office', 'Service Shop'],
    revenue_range: [1000000, 25000000]
  },
  'Plumbing': {
    keywords: ['plumbing', 'plumber', 'pipe', 'drain'],
    property_types: ['Warehouse', 'Office', 'Service Shop'],
    revenue_range: [1000000, 20000000]
  },
  'Electrical': {
    keywords: ['electrical', 'electrician', 'electric'],
    property_types: ['Warehouse', 'Office', 'Service Shop'],
    revenue_range: [1000000, 30000000]
  },
  'Landscaping': {
    keywords: ['landscaping', 'lawn', 'landscape', 'lawn care', 'tree service'],
    property_types: ['Warehouse', 'Storage Yard', 'Office'],
    revenue_range: [1000000, 15000000]
  },
  'Roofing': {
    keywords: ['roofing', 'roofer', 'roof'],
    property_types: ['Warehouse', 'Office'],
    revenue_range: [1000000, 20000000]
  },
  'Automotive': {
    keywords: ['auto', 'automotive', 'mechanic', 'repair', 'collision'],
    property_types: ['Garage', 'Warehouse', 'Service Station'],
    revenue_range: [1000000, 30000000]
  },
  'Manufacturing': {
    keywords: ['manufacturing', 'fabrication', 'factory', 'assembly'],
    property_types: ['Warehouse', 'Industrial', 'Factory'],
    revenue_range: [2000000, 50000000]
  }
};

// Commercial Property Use Codes (from RealEstateAPI)
const COMMERCIAL_PROPERTY_CODES = [
  126,  // AUTO REPAIR, GARAGE
  130,  // COMMERCIAL BUILDING, WAREHOUSE
  135,  // COMMERCIAL (GENERAL)
  136,  // COMMERCIAL OFFICE (GENERAL)
  195,  // ASSEMBLY (LIGHT INDUSTRIAL)
  210,  // HEAVY INDUSTRIAL (GENERAL)
  215,  // LIGHT INDUSTRIAL
  220,  // MANUFACTURING (LIGHT)
  229,  // MINI-WAREHOUSE, STORAGE
  238,  // WAREHOUSE, STORAGE
  // Add more based on industry
];

// ===== STEP 1: SEARCH COMMERCIAL PROPERTIES =====
async function searchCommercialProperties(industry, location) {
  try {
    console.log(`\n🏭 Searching commercial properties for ${industry}...`);
    console.log(`   Location: ${location.city}, ${location.state}`);

    const response = await axios.post(
      'https://api.realestateapi.com/v2/PropertySearch',
      {
        state: location.state,
        city: location.city,
        property_type: 'OTHER',  // Commercial properties
        property_use_code: COMMERCIAL_PROPERTY_CODES,

        // Corporate owned = likely business owner
        corporate_owned: true,

        // Look for owner-occupied commercial
        owner_occupied: true,

        // Value range (indicates established business)
        value_min: 200000,
        value_max: 5000000,

        size: 100
      },
      {
        headers: {
          'x-api-key': REALESTATE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const properties = response.data.data || [];
    console.log(`   Found ${properties.length} commercial properties`);

    return properties;
  } catch (error) {
    console.error(`❌ Error searching properties:`, error.response?.data || error.message);
    return [];
  }
}

// ===== STEP 2: IDENTIFY BUSINESS OWNERS =====
function filterByIndustry(properties, industryKeywords) {
  console.log(`\n🔍 Filtering for industry keywords: ${industryKeywords.join(', ')}`);

  const matches = properties.filter(prop => {
    const ownerName = `${prop.owner1FirstName || ''} ${prop.owner1LastName || ''}`.toLowerCase();
    const propertyUse = (prop.propertyUse || '').toLowerCase();

    return industryKeywords.some(keyword =>
      ownerName.includes(keyword) || propertyUse.includes(keyword)
    );
  });

  console.log(`   Matched ${matches.length} properties`);
  return matches;
}

// ===== STEP 3: ENRICH WITH SKIP TRACE =====
async function enrichBusinessOwner(property) {
  try {
    const mailAddress = property.mailAddress || property.address;

    // Skip trace to get phone/email
    const skipResponse = await axios.post(
      'https://api.realestateapi.com/v1/SkipTrace',
      {
        mail_address: mailAddress.street || mailAddress.address,
        mail_city: mailAddress.city,
        mail_state: mailAddress.state,
        mail_zip: mailAddress.zip,
        first_name: property.owner1FirstName,
        last_name: property.owner1LastName
      },
      {
        headers: {
          'x-api-key': REALESTATE_SKIPTRACE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const skipData = skipResponse.data;

    return {
      // Business Owner Info
      ownerName: `${property.owner1FirstName || ''} ${property.owner1LastName || ''}`.trim(),
      ownerFirstName: property.owner1FirstName,
      ownerLastName: property.owner1LastName,
      ownerAge: skipData.age,

      // Contact Info
      phones: skipData.phones || [],
      emails: skipData.emails || [],

      // Commercial Property Info
      propertyAddress: property.address?.address,
      propertyCity: property.address?.city,
      propertyState: property.address?.state,
      propertyZip: property.address?.zip,
      propertyType: property.propertyUse,
      propertyValue: property.estimatedValue || property.value,

      // Business Indicators
      corporateOwned: property.corporateOwned,
      ownerOccupied: property.ownerOccupied,
      yearsOwned: property.yearsOwned,

      // For scoring/qualification
      propertyId: property.id || property.propertyId
    };
  } catch (error) {
    console.error(`⚠️  Skip trace failed for ${property.address?.address}`);
    return null;
  }
}

async function enrichProperties(properties) {
  console.log(`\n📞 Enriching ${properties.length} business owners with contact info...`);

  const enriched = [];
  let successCount = 0;

  for (let i = 0; i < properties.length; i += 5) {
    const batch = properties.slice(i, i + 5);

    const results = await Promise.allSettled(
      batch.map(prop => enrichBusinessOwner(prop))
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        enriched.push(result.value);
        successCount++;
      }
    });

    console.log(`   Processed ${Math.min(i + 5, properties.length)}/${properties.length}`);

    // Rate limit
    if (i + 5 < properties.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`✅ Successfully enriched ${successCount}/${properties.length} business owners`);
  return enriched;
}

// ===== STEP 4: SCORE & QUALIFY LEADS =====
function scoreBusinessOwners(enrichedOwners) {
  console.log(`\n⭐ Scoring business owner leads...`);

  const scored = enrichedOwners.map(owner => {
    let score = 0;

    // Has contact info
    if (owner.phones.length > 0) score += 25;
    if (owner.emails.length > 0) score += 25;

    // Owner occupied = active business
    if (owner.ownerOccupied) score += 20;

    // Years of ownership = established
    if (owner.yearsOwned >= 5) score += 15;
    if (owner.yearsOwned >= 10) score += 10;

    // Property value indicates business size
    if (owner.propertyValue >= 500000) score += 10;
    if (owner.propertyValue >= 1000000) score += 10;

    return {
      ...owner,
      leadScore: score,
      tier: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
    };
  });

  // Sort by score
  scored.sort((a, b) => b.leadScore - a.leadScore);

  const tierCounts = {
    A: scored.filter(l => l.tier === 'A').length,
    B: scored.filter(l => l.tier === 'B').length,
    C: scored.filter(l => l.tier === 'C').length,
    D: scored.filter(l => l.tier === 'D').length
  };

  console.log(`\n📊 Lead Distribution:`);
  console.log(`   Tier A (80+): ${tierCounts.A} leads`);
  console.log(`   Tier B (60-79): ${tierCounts.B} leads`);
  console.log(`   Tier C (40-59): ${tierCounts.C} leads`);
  console.log(`   Tier D (<40): ${tierCounts.D} leads`);

  return scored;
}

// ===== STEP 5: IMPORT TO NEXTIER =====
async function importToNextier(leads) {
  try {
    console.log(`\n📤 Importing ${leads.length} blue-collar business owners to Nextier...`);

    const response = await axios.post(
      `${PROPERTY_HUNT_API}/api/import-business-leads`,
      {
        teamId: NEXTIER_TEAM_ID,
        leads: leads.map(lead => ({
          // Business Owner
          ownerName: lead.ownerName,
          ownerFirstName: lead.ownerFirstName,
          ownerLastName: lead.ownerLastName,

          // Contact
          phone: lead.phones[0] || null,
          email: lead.emails[0] || null,

          // Commercial Property
          propertyAddress: lead.propertyAddress,
          city: lead.propertyCity,
          state: lead.propertyState,
          zipCode: lead.propertyZip,
          propertyType: lead.propertyType,
          propertyValue: lead.propertyValue,

          // Qualification
          leadScore: lead.leadScore,
          tier: lead.tier,

          // Metadata
          metadata: {
            allPhones: lead.phones,
            allEmails: lead.emails,
            yearsOwned: lead.yearsOwned,
            ownerAge: lead.ownerAge,
            corporateOwned: lead.corporateOwned,
            ownerOccupied: lead.ownerOccupied,
            source: 'Commercial Property Search'
          }
        }))
      }
    );

    console.log(`✅ Successfully imported ${leads.length} business owner leads!`);
    return response.data;
  } catch (error) {
    console.error('❌ Import Error:', error.response?.data || error.message);
    throw error;
  }
}

// ===== MAIN WORKFLOW =====
async function runCommercialTargeting() {
  console.log('🎯 NEXTIER - BLUE COLLAR BUSINESS OWNER TARGETING\n');
  console.log('='.repeat(60));
  console.log(`Time: ${new Date().toLocaleString()}\n`);

  const allLeads = [];

  // Target locations (add your markets)
  const locations = [
    { city: 'Miami', state: 'FL' },
    { city: 'Fort Lauderdale', state: 'FL' },
    { city: 'Tampa', state: 'FL' },
    // Add more cities
  ];

  // Process each industry
  for (const [industryName, config] of Object.entries(TARGET_INDUSTRIES)) {
    console.log('\n' + '='.repeat(60));
    console.log(`TARGETING: ${industryName.toUpperCase()}`);
    console.log('='.repeat(60));

    for (const location of locations) {
      // Search commercial properties
      const properties = await searchCommercialProperties(industryName, location);

      if (properties.length === 0) continue;

      // Filter by industry
      const industryMatches = filterByIndustry(properties, config.keywords);

      if (industryMatches.length === 0) continue;

      // Enrich with contact info
      const enriched = await enrichProperties(industryMatches);

      // Filter to those with contact info
      const withContact = enriched.filter(e => e.phones.length > 0 || e.emails.length > 0);

      allLeads.push(...withContact);
    }
  }

  // Score all leads
  const scored = scoreBusinessOwners(allLeads);

  // Import to Nextier (Tier A & B only for now)
  const topTier = scored.filter(lead => lead.tier === 'A' || lead.tier === 'B');

  if (topTier.length > 0) {
    await importToNextier(topTier);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMMERCIAL TARGETING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Business Owners Found: ${scored.length}`);
    console.log(`Imported (Tier A & B): ${topTier.length}`);
    console.log(`With Phone: ${topTier.filter(l => l.phones.length > 0).length}`);
    console.log(`With Email: ${topTier.filter(l => l.emails.length > 0).length}`);
    console.log(`Avg Property Value: $${Math.round(topTier.reduce((sum, l) => sum + (l.propertyValue || 0), 0) / topTier.length).toLocaleString()}`);
    console.log(`\n🎯 Next Step: Launch B2B campaigns in Nextier!`);
    console.log(`   Visit: https://monkfish-app-mb7h3.ondigitalocean.app/t/${NEXTIER_TEAM_ID}/campaigns`);
  } else {
    console.log('\nℹ️  No high-tier business owner leads found.');
  }

  console.log('\n✅ COMMERCIAL TARGETING COMPLETE!\n');
}

// Run it
runCommercialTargeting()
  .then(() => {
    console.log('✅ Success!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Targeting Failed:', err.message);
    process.exit(1);
  });
