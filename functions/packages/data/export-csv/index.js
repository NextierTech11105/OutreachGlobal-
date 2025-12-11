/**
 * DO Function: export-csv
 * Export enriched leads to CSV for download
 *
 * Input: { leads: [...], format: 'csv'|'xlsx', includeFields: [...] }
 * Output: { downloadUrl, expiresAt }
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: 'nyc3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

const BUCKET = process.env.DO_SPACES_BUCKET;

// Default export fields
const DEFAULT_FIELDS = [
  'id', 'firstName', 'lastName', 'email', 'phone', 'title',
  'company', 'address', 'city', 'state', 'zip',
  'industry', 'employees', 'revenue',
  'isDecisionMaker', 'estimatedValue', 'equityAmount',
  'enrichmentSources', 'enrichedAt'
];

function convertToCSV(data, fields) {
  const headers = fields.join(',');
  const rows = data.map(item => {
    return fields.map(field => {
      let value = item[field];
      // Handle nested objects
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      // Escape quotes and wrap in quotes if contains comma or quote
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });
  return [headers, ...rows].join('\n');
}

async function main(args) {
  const { leads, format = 'csv', includeFields, filename } = args;

  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return {
      statusCode: 400,
      body: { error: 'Missing or empty leads array' },
    };
  }

  try {
    const fields = includeFields || DEFAULT_FIELDS;
    const timestamp = Date.now();
    const exportFilename = filename || `export-${timestamp}`;

    // Generate CSV content
    const csvContent = convertToCSV(leads, fields);

    // Upload to DO Spaces
    const key = `exports/${exportFilename}.csv`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: csvContent,
      ContentType: 'text/csv',
      ContentDisposition: `attachment; filename="${exportFilename}.csv"`,
    }));

    // Generate signed download URL (expires in 1 hour)
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 3600 }
    );

    return {
      statusCode: 200,
      body: {
        downloadUrl,
        key,
        filename: `${exportFilename}.csv`,
        recordCount: leads.length,
        fieldCount: fields.length,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
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
