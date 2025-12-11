/**
 * DO Function: csv-processor
 * Process large CSV files from DO Spaces
 *
 * Input: { bucketKey, options: { normalize, dedupe, filterDecisionMakers } }
 * Output: { processed: count, outputKey, stats }
 */

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const s3 = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: 'nyc3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

const BUCKET = process.env.DO_SPACES_BUCKET;

// Decision maker title patterns
const DECISION_MAKER_TITLES = [
  'owner', 'ceo', 'chief executive', 'president', 'founder', 'co-founder',
  'partner', 'principal', 'director', 'vp', 'vice president', 'manager',
  'head of', 'general manager', 'managing director', 'chairman'
];

function isDecisionMaker(title) {
  if (!title) return false;
  const lowerTitle = title.toLowerCase();
  return DECISION_MAKER_TITLES.some(t => lowerTitle.includes(t));
}

function normalizeRecord(record) {
  // Normalize field names (handle various CSV formats)
  const normalized = {};

  // Common field mappings
  const fieldMaps = {
    company: ['company', 'company_name', 'business_name', 'organization', 'companyname'],
    firstName: ['first_name', 'firstname', 'first', 'fname', 'contact_first'],
    lastName: ['last_name', 'lastname', 'last', 'lname', 'contact_last'],
    email: ['email', 'email_address', 'e_mail', 'contact_email'],
    phone: ['phone', 'phone_number', 'telephone', 'tel', 'mobile', 'contact_phone'],
    title: ['title', 'job_title', 'position', 'role'],
    address: ['address', 'street', 'street_address', 'address1', 'physical_address'],
    city: ['city', 'town'],
    state: ['state', 'province', 'region', 'st'],
    zip: ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code'],
    industry: ['industry', 'sic_description', 'naics_description', 'sector'],
    employees: ['employees', 'employee_count', 'num_employees', 'size'],
    revenue: ['revenue', 'annual_revenue', 'sales'],
  };

  for (const [targetField, sourceFields] of Object.entries(fieldMaps)) {
    for (const sourceField of sourceFields) {
      const key = Object.keys(record).find(k => k.toLowerCase() === sourceField);
      if (key && record[key]) {
        normalized[targetField] = String(record[key]).trim();
        break;
      }
    }
  }

  // Generate ID if not present
  normalized.id = record.id || `csv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Mark decision makers
  normalized.isDecisionMaker = isDecisionMaker(normalized.title);

  return normalized;
}

async function main(args) {
  const { bucketKey, options = {} } = args;

  if (!bucketKey) {
    return {
      statusCode: 400,
      body: { error: 'Missing bucketKey' },
    };
  }

  try {
    // Fetch CSV from DO Spaces
    const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: bucketKey });
    const response = await s3.send(getCmd);
    const csvContent = await response.Body.transformToString();

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const stats = {
      totalRecords: records.length,
      normalized: 0,
      decisionMakers: 0,
      duplicatesRemoved: 0,
      outputRecords: 0,
    };

    // Normalize records
    let processed = records.map(record => {
      const normalized = normalizeRecord(record);
      stats.normalized++;
      if (normalized.isDecisionMaker) stats.decisionMakers++;
      return normalized;
    });

    // Filter to decision makers only if requested
    if (options.filterDecisionMakers) {
      processed = processed.filter(r => r.isDecisionMaker);
    }

    // Dedupe by email/company combo
    if (options.dedupe) {
      const seen = new Set();
      const beforeCount = processed.length;
      processed = processed.filter(r => {
        const key = `${r.email || ''}-${r.company || ''}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      stats.duplicatesRemoved = beforeCount - processed.length;
    }

    stats.outputRecords = processed.length;

    // Save processed CSV back to Spaces
    const outputKey = bucketKey.replace('.csv', '-processed.csv');
    const outputCsv = stringify(processed, { header: true });

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: outputKey,
      Body: outputCsv,
      ContentType: 'text/csv',
    }));

    // Also save as JSON for faster access
    const jsonKey = bucketKey.replace('.csv', '-processed.json');
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: jsonKey,
      Body: JSON.stringify({ records: processed, stats, processedAt: new Date().toISOString() }),
      ContentType: 'application/json',
    }));

    return {
      statusCode: 200,
      body: {
        stats,
        outputKey,
        jsonKey,
        processedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: { error: error.message },
    };
  }
}

exports.main = main;
