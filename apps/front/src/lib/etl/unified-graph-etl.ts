/**
 * NEXTIER UNIFIED GRAPH ETL
 *
 * Transforms bucket data into a unified property graph for entity resolution
 *
 * GRAPH STRUCTURE:
 * - Nodes: property, business, contact, phone, email, address, owner
 * - Edges: owns, works_at, located_at, has_phone, has_email, contacted_by, occupies
 *
 * DATA SOURCES:
 * - CSV uploads (USBizData, etc.)
 * - Property searches (RealEstateAPI)
 * - Skip trace results
 * - Apollo enrichment
 */

import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import {
  writeNode,
  writeEdge,
  writeNodesBatch,
  writeEdgesBatch,
  NodeType,
  EdgeType,
  GraphWriteResult,
} from "./graph-writers";
import {
  normalizePhone,
  normalizeEmail,
  normalizeAddress,
  normalizeName,
  normalizeCompanyName,
  normalizeSIC,
  normalizeZip,
  normalizeState,
} from "./normalizers";

// ============================================================================
// TYPES
// ============================================================================

interface BucketRecord {
  id?: string;
  // Company/Business fields
  companyName?: string;
  company?: string;
  businessName?: string;
  // Contact fields
  contactName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  // Phone fields
  phone?: string;
  mobile?: string;
  telephone?: string;
  phones?: string[];
  enrichedPhones?: string[];
  // Email fields
  email?: string;
  emails?: string[];
  enrichedEmails?: string[];
  // Address fields
  address?: string;
  address1?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  zipCode?: string;
  // Business metadata
  sicCode?: string;
  sic?: string;
  industry?: string;
  employees?: string | number;
  revenue?: string | number;
  website?: string;
  // Property fields (from RealEstateAPI)
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
  estimatedValue?: number;
  lastSaleAmount?: number;
  // Owner info (from skip trace)
  ownerName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  mailingAddress?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
  // Enrichment flags
  enriched?: boolean;
  apolloData?: Record<string, unknown>;
  skipTraceData?: Record<string, unknown>;
}

interface Bucket {
  id: string;
  name: string;
  source: string;
  properties?: BucketRecord[];
  metadata?: {
    stats?: {
      total: number;
      withPhone: number;
      withEmail: number;
      withAddress: number;
    };
    tags?: string[];
  };
}

interface ETLResult {
  bucketId: string;
  bucketName: string;
  recordsProcessed: number;
  nodesCreated: number;
  nodesUpdated: number;
  edgesCreated: number;
  errors: string[];
  duration: number;
}

// ============================================================================
// S3 CLIENT
// ============================================================================

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com",
    region: process.env.DO_SPACES_REGION || "nyc3",
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY || "",
      secretAccessKey: process.env.DO_SPACES_SECRET || "",
    },
    forcePathStyle: false,
  });
}

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || "nextier";

// ============================================================================
// BUCKET LOADING
// ============================================================================

/**
 * Load a bucket from DO Spaces
 */
async function loadBucket(bucketId: string): Promise<Bucket | null> {
  const client = getS3Client();
  const key = `buckets/${bucketId}/index.json`;

  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));
    const body = await response.Body?.transformToString();
    return body ? JSON.parse(body) : null;
  } catch {
    return null;
  }
}

/**
 * List all bucket IDs
 */
async function listBucketIds(): Promise<string[]> {
  const client = getS3Client();
  const response = await client.send(new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: "buckets/",
    Delimiter: "/",
  }));

  return (response.CommonPrefixes || [])
    .map(p => p.Prefix?.replace("buckets/", "").replace("/", "") || "")
    .filter(Boolean);
}

// ============================================================================
// RECORD EXTRACTION
// ============================================================================

/**
 * Extract company name from record
 */
function extractCompanyName(record: BucketRecord): string | null {
  const name = record.companyName || record.company || record.businessName;
  return name ? normalizeCompanyName(name) : null;
}

/**
 * Extract contact name from record
 */
function extractContactName(record: BucketRecord): { first: string; last: string; full: string } | null {
  if (record.firstName && record.lastName) {
    return {
      first: normalizeName(record.firstName),
      last: normalizeName(record.lastName),
      full: normalizeName(`${record.firstName} ${record.lastName}`),
    };
  }
  if (record.fullName || record.contactName) {
    const name = record.fullName || record.contactName || "";
    const parts = name.split(/\s+/);
    return {
      first: normalizeName(parts[0] || ""),
      last: normalizeName(parts.slice(1).join(" ") || ""),
      full: normalizeName(name),
    };
  }
  return null;
}

/**
 * Extract all phones from record
 */
function extractPhones(record: BucketRecord): string[] {
  const phones: string[] = [];

  if (record.phone) phones.push(normalizePhone(record.phone));
  if (record.mobile) phones.push(normalizePhone(record.mobile));
  if (record.telephone) phones.push(normalizePhone(record.telephone));
  if (record.phones) phones.push(...record.phones.map(normalizePhone));
  if (record.enrichedPhones) phones.push(...record.enrichedPhones.map(normalizePhone));

  return [...new Set(phones.filter(p => p.length >= 10))];
}

/**
 * Extract all emails from record
 */
function extractEmails(record: BucketRecord): string[] {
  const emails: string[] = [];

  if (record.email) emails.push(normalizeEmail(record.email));
  if (record.emails) emails.push(...record.emails.map(normalizeEmail));
  if (record.enrichedEmails) emails.push(...record.enrichedEmails.map(normalizeEmail));

  return [...new Set(emails.filter(e => e.includes("@")))];
}

/**
 * Extract address from record
 */
function extractAddress(record: BucketRecord): {
  street: string;
  city: string;
  state: string;
  zip: string;
  normalized: string;
} | null {
  const street = record.address || record.address1 || record.street;
  const city = record.city;
  const state = normalizeState(record.state);
  const zip = normalizeZip(record.zip || record.zipCode);

  if (!street || !city || !state) return null;

  return {
    street: normalizeAddress(street),
    city: city.toUpperCase().trim(),
    state,
    zip,
    normalized: `${normalizeAddress(street)}|${city.toUpperCase().trim()}|${state}|${zip}`,
  };
}

/**
 * Extract owner info from record (skip trace data)
 */
function extractOwner(record: BucketRecord): {
  name: string;
  mailingAddress?: string;
} | null {
  const ownerName = record.ownerName ||
    (record.ownerFirstName && record.ownerLastName
      ? `${record.ownerFirstName} ${record.ownerLastName}`
      : null);

  if (!ownerName) return null;

  const mailingAddr = record.mailingAddress
    ? `${normalizeAddress(record.mailingAddress)}|${(record.mailingCity || "").toUpperCase()}|${normalizeState(record.mailingState)}|${normalizeZip(record.mailingZip)}`
    : undefined;

  return {
    name: normalizeName(ownerName),
    mailingAddress: mailingAddr,
  };
}

// ============================================================================
// MAIN ETL PROCESS
// ============================================================================

/**
 * Process a single record into the graph
 */
async function processRecord(
  record: BucketRecord,
  bucketId: string,
  recordIndex: number
): Promise<{
  nodes: { type: NodeType; id: string }[];
  edges: { type: EdgeType; source: string; target: string }[];
  errors: string[];
}> {
  const nodes: { type: NodeType; id: string }[] = [];
  const edges: { type: EdgeType; source: string; target: string }[] = [];
  const errors: string[] = [];

  const recordId = record.id || `${bucketId}-${recordIndex}`;

  try {
    // 1. Extract and create BUSINESS node
    const companyName = extractCompanyName(record);
    let businessNodeId: string | null = null;

    if (companyName) {
      const sicCode = normalizeSIC(record.sicCode || record.sic);
      const { nodeId } = await writeNode("business", companyName, {
        name: companyName,
        originalName: record.companyName || record.company || record.businessName,
        sicCode,
        industry: record.industry,
        employees: record.employees,
        revenue: record.revenue,
        website: record.website,
        sourceRecordId: recordId,
      }, bucketId, 0.9);

      businessNodeId = nodeId;
      nodes.push({ type: "business", id: nodeId });
    }

    // 2. Extract and create CONTACT node
    const contactName = extractContactName(record);
    let contactNodeId: string | null = null;

    if (contactName) {
      const contactKey = `${contactName.full}|${companyName || ""}`;
      const { nodeId } = await writeNode("contact", contactKey, {
        firstName: contactName.first,
        lastName: contactName.last,
        fullName: contactName.full,
        title: record.title,
        company: companyName,
        sourceRecordId: recordId,
      }, bucketId, 0.85);

      contactNodeId = nodeId;
      nodes.push({ type: "contact", id: nodeId });

      // Link contact to business
      if (businessNodeId) {
        await writeEdge("works_at", contactNodeId, businessNodeId, 1.0, { title: record.title });
        edges.push({ type: "works_at", source: contactNodeId, target: businessNodeId });
      }
    }

    // 3. Extract and create PHONE nodes
    const phones = extractPhones(record);
    for (const phone of phones) {
      const { nodeId: phoneNodeId } = await writeNode("phone", phone, {
        number: phone,
        formatted: phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3"),
      }, bucketId, 0.95);

      nodes.push({ type: "phone", id: phoneNodeId });

      // Link phone to contact or business
      if (contactNodeId) {
        await writeEdge("has_phone", contactNodeId, phoneNodeId);
        edges.push({ type: "has_phone", source: contactNodeId, target: phoneNodeId });
      } else if (businessNodeId) {
        await writeEdge("has_phone", businessNodeId, phoneNodeId);
        edges.push({ type: "has_phone", source: businessNodeId, target: phoneNodeId });
      }
    }

    // 4. Extract and create EMAIL nodes
    const emails = extractEmails(record);
    for (const email of emails) {
      const { nodeId: emailNodeId } = await writeNode("email", email, {
        address: email,
        domain: email.split("@")[1],
      }, bucketId, 0.95);

      nodes.push({ type: "email", id: emailNodeId });

      // Link email to contact or business
      if (contactNodeId) {
        await writeEdge("has_email", contactNodeId, emailNodeId);
        edges.push({ type: "has_email", source: contactNodeId, target: emailNodeId });
      } else if (businessNodeId) {
        await writeEdge("has_email", businessNodeId, emailNodeId);
        edges.push({ type: "has_email", source: businessNodeId, target: emailNodeId });
      }
    }

    // 5. Extract and create ADDRESS node
    const address = extractAddress(record);
    let addressNodeId: string | null = null;

    if (address) {
      const { nodeId } = await writeNode("address", address.normalized, {
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
        full: `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
      }, bucketId, 0.9);

      addressNodeId = nodeId;
      nodes.push({ type: "address", id: nodeId });

      // Link address to business
      if (businessNodeId) {
        await writeEdge("located_at", businessNodeId, addressNodeId);
        edges.push({ type: "located_at", source: businessNodeId, target: addressNodeId });
      }
    }

    // 6. Extract and create PROPERTY node (if has property data)
    if (record.propertyType || record.estimatedValue || record.sqft) {
      const propertyKey = address?.normalized || `prop-${recordId}`;
      const { nodeId: propertyNodeId } = await writeNode("property", propertyKey, {
        type: record.propertyType,
        bedrooms: record.bedrooms,
        bathrooms: record.bathrooms,
        sqft: record.sqft,
        yearBuilt: record.yearBuilt,
        estimatedValue: record.estimatedValue,
        lastSaleAmount: record.lastSaleAmount,
        addressId: addressNodeId,
        sourceRecordId: recordId,
      }, bucketId, 0.85);

      nodes.push({ type: "property", id: propertyNodeId });

      // Link property to address
      if (addressNodeId) {
        await writeEdge("located_at", propertyNodeId, addressNodeId);
        edges.push({ type: "located_at", source: propertyNodeId, target: addressNodeId });
      }

      // If business exists, link as occupies
      if (businessNodeId) {
        await writeEdge("occupies", businessNodeId, propertyNodeId);
        edges.push({ type: "occupies", source: businessNodeId, target: propertyNodeId });
      }
    }

    // 7. Extract and create OWNER node (from skip trace)
    const owner = extractOwner(record);
    if (owner) {
      const { nodeId: ownerNodeId } = await writeNode("owner", owner.name, {
        name: owner.name,
        mailingAddress: owner.mailingAddress,
        sourceRecordId: recordId,
      }, bucketId, 0.8);

      nodes.push({ type: "owner", id: ownerNodeId });

      // Link owner to property
      if (addressNodeId) {
        // Find or create property for this address
        const { nodeId: propertyNodeId } = await writeNode("property", address?.normalized || `prop-${recordId}`, {
          addressId: addressNodeId,
          sourceRecordId: recordId,
        }, bucketId, 0.7);

        await writeEdge("owns", ownerNodeId, propertyNodeId);
        edges.push({ type: "owns", source: ownerNodeId, target: propertyNodeId });
      }
    }

  } catch (error) {
    errors.push(`Record ${recordIndex}: ${error}`);
  }

  return { nodes, edges, errors };
}

/**
 * Process an entire bucket
 */
export async function processBucket(bucketId: string): Promise<ETLResult> {
  const startTime = Date.now();
  const result: ETLResult = {
    bucketId,
    bucketName: "",
    recordsProcessed: 0,
    nodesCreated: 0,
    nodesUpdated: 0,
    edgesCreated: 0,
    errors: [],
    duration: 0,
  };

  // Load bucket
  const bucket = await loadBucket(bucketId);
  if (!bucket) {
    result.errors.push(`Bucket ${bucketId} not found`);
    result.duration = Date.now() - startTime;
    return result;
  }

  result.bucketName = bucket.name;
  const records = bucket.properties || [];

  console.log(`[ETL] Processing bucket: ${bucket.name} (${records.length} records)`);

  // Process records in batches
  const BATCH_SIZE = 50;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map((record, idx) => processRecord(record, bucketId, i + idx))
    );

    for (const r of batchResults) {
      result.recordsProcessed++;
      result.nodesCreated += r.nodes.filter(n => n.id).length;
      result.edgesCreated += r.edges.length;
      result.errors.push(...r.errors);
    }

    // Progress log every 100 records
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= records.length) {
      console.log(`[ETL] Processed ${Math.min(i + BATCH_SIZE, records.length)}/${records.length} records`);
    }
  }

  result.duration = Date.now() - startTime;
  console.log(`[ETL] Completed bucket: ${bucket.name} in ${result.duration}ms`);

  return result;
}

/**
 * Process all buckets
 */
export async function processAllBuckets(): Promise<ETLResult[]> {
  const bucketIds = await listBucketIds();
  console.log(`[ETL] Found ${bucketIds.length} buckets to process`);

  const results: ETLResult[] = [];
  for (const bucketId of bucketIds) {
    const result = await processBucket(bucketId);
    results.push(result);
  }

  // Summary
  const totalNodes = results.reduce((a, r) => a + r.nodesCreated, 0);
  const totalEdges = results.reduce((a, r) => a + r.edgesCreated, 0);
  const totalErrors = results.reduce((a, r) => a + r.errors.length, 0);
  const totalDuration = results.reduce((a, r) => a + r.duration, 0);

  console.log(`[ETL] ====== COMPLETE ======`);
  console.log(`[ETL] Buckets: ${results.length}`);
  console.log(`[ETL] Nodes created: ${totalNodes}`);
  console.log(`[ETL] Edges created: ${totalEdges}`);
  console.log(`[ETL] Errors: ${totalErrors}`);
  console.log(`[ETL] Duration: ${totalDuration}ms`);

  return results;
}

// ============================================================================
// INCREMENTAL ETL
// ============================================================================

/**
 * Process only new records since last ETL run
 */
export async function processIncrementalBucket(
  bucketId: string,
  lastProcessedIndex: number
): Promise<ETLResult & { lastIndex: number }> {
  const bucket = await loadBucket(bucketId);
  if (!bucket) {
    return {
      bucketId,
      bucketName: "",
      recordsProcessed: 0,
      nodesCreated: 0,
      nodesUpdated: 0,
      edgesCreated: 0,
      errors: [`Bucket ${bucketId} not found`],
      duration: 0,
      lastIndex: lastProcessedIndex,
    };
  }

  const records = bucket.properties || [];
  const newRecords = records.slice(lastProcessedIndex);

  if (newRecords.length === 0) {
    return {
      bucketId,
      bucketName: bucket.name,
      recordsProcessed: 0,
      nodesCreated: 0,
      nodesUpdated: 0,
      edgesCreated: 0,
      errors: [],
      duration: 0,
      lastIndex: records.length,
    };
  }

  console.log(`[ETL] Incremental: Processing ${newRecords.length} new records from ${bucket.name}`);

  const startTime = Date.now();
  let nodesCreated = 0;
  let edgesCreated = 0;
  const errors: string[] = [];

  for (let i = 0; i < newRecords.length; i++) {
    const r = await processRecord(newRecords[i], bucketId, lastProcessedIndex + i);
    nodesCreated += r.nodes.length;
    edgesCreated += r.edges.length;
    errors.push(...r.errors);
  }

  return {
    bucketId,
    bucketName: bucket.name,
    recordsProcessed: newRecords.length,
    nodesCreated,
    nodesUpdated: 0,
    edgesCreated,
    errors,
    duration: Date.now() - startTime,
    lastIndex: records.length,
  };
}

// ============================================================================
// API ENDPOINT HELPERS
// ============================================================================

/**
 * Queue a bucket for ETL processing
 */
export async function queueBucketForETL(bucketId: string): Promise<{ queued: boolean; message: string }> {
  // In a production system, this would push to a queue
  // For now, we process synchronously
  try {
    const result = await processBucket(bucketId);
    return {
      queued: true,
      message: `Processed ${result.recordsProcessed} records, created ${result.nodesCreated} nodes and ${result.edgesCreated} edges`,
    };
  } catch (error) {
    return {
      queued: false,
      message: `ETL failed: ${error}`,
    };
  }
}

/**
 * Get ETL status for a bucket
 */
export async function getETLStatus(bucketId: string): Promise<{
  processed: boolean;
  lastRun?: string;
  recordCount?: number;
}> {
  const bucket = await loadBucket(bucketId);
  if (!bucket) {
    return { processed: false };
  }

  return {
    processed: true,
    recordCount: bucket.properties?.length || 0,
  };
}
