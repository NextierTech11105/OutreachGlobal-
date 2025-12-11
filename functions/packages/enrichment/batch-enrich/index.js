/**
 * DO Function: batch-enrich
 * Batch lead enrichment - processes up to 100 leads per invocation
 *
 * Input: { leads: [...], options: { apolloEnabled, propertyEnabled, concurrency } }
 * Output: { results: [...], stats: { total, enriched, failed } }
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY;

// DO Spaces client
const s3 = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: 'nyc3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

async function enrichSingleLead(lead, options) {
  const result = { ...lead, enrichedAt: new Date().toISOString() };
  const sources = [];

  // Apollo enrichment
  if (options.apolloEnabled && APOLLO_API_KEY) {
    try {
      const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': APOLLO_API_KEY,
        },
        body: JSON.stringify({
          q_organization_name: lead.company,
          person_titles: ['owner', 'ceo', 'founder', 'president', 'director', 'manager'],
          per_page: 3,
        }),
      });

      const data = await res.json();
      if (data.people?.[0]) {
        const person = data.people[0];
        result.apollo = {
          firstName: person.first_name,
          lastName: person.last_name,
          email: person.email,
          phone: person.phone_numbers?.[0]?.sanitized_number,
          title: person.title,
          linkedinUrl: person.linkedin_url,
        };
        result.firstName = person.first_name || lead.firstName;
        result.lastName = person.last_name || lead.lastName;
        result.email = person.email || lead.email;
        result.phone = person.phone_numbers?.[0]?.sanitized_number || lead.phone;
        result.isDecisionMaker = true;
        sources.push('apollo');
      }
    } catch (e) {
      result.apolloError = e.message;
    }
  }

  // Property enrichment
  if (options.propertyEnabled && REALESTATE_API_KEY && lead.address) {
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
        result.property = {
          estimatedValue: data.data.valuation?.estimatedValue,
          equityAmount: data.data.mortgage?.equityAmount,
          ownerName: data.data.owner?.names?.[0],
          propertyType: data.data.propertyInfo?.propertyType,
        };
        sources.push('property');
      }
    } catch (e) {
      result.propertyError = e.message;
    }
  }

  result.enrichmentSources = sources;
  return result;
}

async function main(args) {
  const { leads, options = {}, jobId, bucketId } = args;

  if (!leads || !Array.isArray(leads)) {
    return {
      statusCode: 400,
      body: { error: 'Missing or invalid leads array' },
    };
  }

  const enrichOptions = {
    apolloEnabled: options.apolloEnabled !== false,
    propertyEnabled: options.propertyEnabled !== false,
    concurrency: Math.min(options.concurrency || 5, 10),
  };

  const stats = {
    total: leads.length,
    enriched: 0,
    withApollo: 0,
    withProperty: 0,
    failed: 0,
  };

  const results = [];
  const batchSize = enrichOptions.concurrency;

  // Process in batches to respect rate limits
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(lead => enrichSingleLead(lead, enrichOptions).catch(e => ({
        ...lead,
        error: e.message,
      })))
    );

    for (const result of batchResults) {
      results.push(result);
      if (result.enrichmentSources?.length > 0) {
        stats.enriched++;
        if (result.enrichmentSources.includes('apollo')) stats.withApollo++;
        if (result.enrichmentSources.includes('property')) stats.withProperty++;
      } else if (result.error) {
        stats.failed++;
      }
    }

    // Rate limit delay between batches
    if (i + batchSize < leads.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Save results to DO Spaces if bucketId provided
  if (bucketId && process.env.DO_SPACES_BUCKET) {
    const key = `enriched/${bucketId}/${jobId || Date.now()}.json`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
      Body: JSON.stringify({ results, stats, completedAt: new Date().toISOString() }),
      ContentType: 'application/json',
    }));
    stats.savedTo = key;
  }

  return {
    statusCode: 200,
    body: {
      results,
      stats,
      completedAt: new Date().toISOString(),
    },
  };
}

exports.main = main;
