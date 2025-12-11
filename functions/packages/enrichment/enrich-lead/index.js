/**
 * DO Function: enrich-lead
 * Single lead enrichment with Apollo + RealEstateAPI
 *
 * Input: { lead: { company, firstName, lastName, address, city, state } }
 * Output: { enriched: { ...lead, apollo: {...}, property: {...} } }
 */

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY;

async function enrichWithApollo(lead) {
  if (!APOLLO_API_KEY) return null;

  try {
    // Search for person at company
    const searchRes = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': APOLLO_API_KEY,
      },
      body: JSON.stringify({
        q_organization_name: lead.company,
        person_titles: lead.title ? [lead.title] : ['owner', 'ceo', 'founder', 'president', 'director'],
        per_page: 5,
      }),
    });

    const data = await searchRes.json();
    if (data.people && data.people.length > 0) {
      const person = data.people[0];
      return {
        firstName: person.first_name,
        lastName: person.last_name,
        email: person.email,
        phone: person.phone_numbers?.[0]?.sanitized_number,
        title: person.title,
        linkedinUrl: person.linkedin_url,
        companyName: person.organization?.name,
        companyDomain: person.organization?.primary_domain,
        companyIndustry: person.organization?.industry,
        companyEmployees: person.organization?.estimated_num_employees,
        companyRevenue: person.organization?.annual_revenue,
      };
    }
    return null;
  } catch (error) {
    console.error('Apollo enrichment error:', error);
    return null;
  }
}

async function enrichWithProperty(lead) {
  if (!REALESTATE_API_KEY || !lead.address) return null;

  try {
    const fullAddress = `${lead.address}, ${lead.city}, ${lead.state}`;
    const res = await fetch(
      `https://api.realestateapi.com/v2/PropertyDetail?address=${encodeURIComponent(fullAddress)}`,
      {
        headers: {
          'x-api-key': REALESTATE_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await res.json();
    if (data.data) {
      const prop = data.data;
      return {
        propertyId: prop.id,
        ownerName: prop.owner?.names?.[0],
        ownerMailingAddress: prop.owner?.mailingAddress?.full,
        estimatedValue: prop.valuation?.estimatedValue,
        equityAmount: prop.mortgage?.equityAmount,
        equityPercent: prop.mortgage?.equityPercent,
        propertyType: prop.propertyInfo?.propertyType,
        yearBuilt: prop.propertyInfo?.yearBuilt,
        bedrooms: prop.propertyInfo?.bedrooms,
        bathrooms: prop.propertyInfo?.bathrooms,
        squareFeet: prop.propertyInfo?.livingSquareFeet,
        lotSize: prop.propertyInfo?.lotSquareFeet,
        lastSaleDate: prop.sale?.saleDate,
        lastSalePrice: prop.sale?.salePrice,
      };
    }
    return null;
  } catch (error) {
    console.error('Property enrichment error:', error);
    return null;
  }
}

async function main(args) {
  const { lead } = args;

  if (!lead) {
    return {
      statusCode: 400,
      body: { error: 'Missing lead data' },
    };
  }

  try {
    // Run enrichments in parallel
    const [apolloData, propertyData] = await Promise.all([
      enrichWithApollo(lead),
      enrichWithProperty(lead),
    ]);

    const enriched = {
      ...lead,
      apollo: apolloData,
      property: propertyData,
      enrichedAt: new Date().toISOString(),
      enrichmentSources: [
        apolloData ? 'apollo' : null,
        propertyData ? 'realestate' : null,
      ].filter(Boolean),
    };

    // Merge contact info from Apollo if available
    if (apolloData) {
      enriched.firstName = apolloData.firstName || lead.firstName;
      enriched.lastName = apolloData.lastName || lead.lastName;
      enriched.email = apolloData.email || lead.email;
      enriched.phone = apolloData.phone || lead.phone;
      enriched.title = apolloData.title || lead.title;
      enriched.isDecisionMaker = true;
    }

    // Add property owner info if available
    if (propertyData) {
      enriched.propertyOwner = propertyData.ownerName;
      enriched.estimatedValue = propertyData.estimatedValue;
      enriched.equityAmount = propertyData.equityAmount;
    }

    return {
      statusCode: 200,
      body: { enriched },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: { error: error.message },
    };
  }
}

exports.main = main;
