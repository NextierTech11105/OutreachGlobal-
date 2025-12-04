#!/usr/bin/env ts-node
/**
 * Property Monitor Cron Job
 *
 * Monitors saved property searches for event signals that affect campaign prioritization:
 * - ADVANCE signals: Increase priority (pre-foreclosure, value drop, vacant, etc.)
 * - SUPPRESS signals: Decrease priority (sold, owner changed, listed on MLS, etc.)
 *
 * Usage:
 *   npx ts-node scripts/monitor-properties.ts
 *
 * Schedule with cron:
 *   0 6 * * * cd /app && npx ts-node scripts/monitor-properties.ts >> /var/log/property-monitor.log 2>&1
 *
 * Environment variables:
 *   - DO_SPACES_KEY: DigitalOcean Spaces access key
 *   - DO_SPACES_SECRET: DigitalOcean Spaces secret key
 *   - REALESTATE_API_KEY: RealEstateAPI key
 *   - NEXTIER_API_URL: Base URL for Nextier API (default: https://monkfish-app-mb7h3.ondigitalocean.app)
 */

import { S3Client, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";

// Configuration
const SPACES_ENDPOINT = "https://nyc3.digitaloceanspaces.com";
const SPACES_BUCKET = "nextier";
const SPACES_REGION = "nyc3";
const NEXTIER_API_URL = process.env.NEXTIER_API_URL || "https://monkfish-app-mb7h3.ondigitalocean.app";
const BATCH_SIZE = 250; // RealEstateAPI batch limit

// Initialize S3 client for DO Spaces
const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
});

interface SavedSearch {
  metadata: {
    id: string;
    name: string;
    searchParams: Record<string, unknown>;
    totalCount: number;
    savedCount: number;
    createdAt: string;
    trackedFields: string[];
    lastChecked?: string;
  };
  properties: Array<{
    id: string;
    [key: string]: unknown;
  }>;
}

interface MonitorResult {
  searchId: string;
  searchName: string;
  checked: number;
  advanceCount: number;
  suppressCount: number;
  signals: Array<{
    propertyId: string;
    signalType: string;
    signalReason: string;
    field: string;
    priority: number;
  }>;
}

async function listSavedSearches(): Promise<string[]> {
  try {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: "searches/",
      })
    );

    return (response.Contents || [])
      .filter((obj) => obj.Key?.endsWith(".json"))
      .map((obj) => obj.Key!)
      .sort((a, b) => b.localeCompare(a)); // Newest first
  } catch (error) {
    console.error("Failed to list saved searches:", error);
    return [];
  }
}

async function getSearchData(key: string): Promise<SavedSearch | null> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: key,
      })
    );

    const bodyContents = await response.Body?.transformToString();
    if (!bodyContents) return null;

    return JSON.parse(bodyContents);
  } catch (error) {
    console.error(`Failed to get search data for ${key}:`, error);
    return null;
  }
}

async function checkPropertiesForChanges(
  propertyIds: string[],
  previousData: Record<string, Record<string, unknown>>
): Promise<{ advanceIds: string[]; suppressIds: string[]; signals: unknown[] }> {
  try {
    const response = await fetch(`${NEXTIER_API_URL}/api/property-search/monitor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propertyIds,
        previousData,
      }),
    });

    const data = await response.json();
    return {
      advanceIds: data.actions?.increasePriority || [],
      suppressIds: data.actions?.decreasePriority || [],
      signals: data.signals || [],
    };
  } catch (error) {
    console.error("Failed to check properties:", error);
    return { advanceIds: [], suppressIds: [], signals: [] };
  }
}

async function saveMonitorResults(searchKey: string, results: MonitorResult): Promise<void> {
  const resultsKey = searchKey.replace(".json", `-monitor-${Date.now()}.json`);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: SPACES_BUCKET,
        Key: resultsKey,
        Body: JSON.stringify(results, null, 2),
        ContentType: "application/json",
      })
    );
    console.log(`Saved monitor results to ${resultsKey}`);
  } catch (error) {
    console.error("Failed to save monitor results:", error);
  }
}

async function updateCampaignPriorities(
  advanceIds: string[],
  suppressIds: string[]
): Promise<void> {
  if (advanceIds.length === 0 && suppressIds.length === 0) return;

  console.log(`Updating campaign priorities: ${advanceIds.length} ADVANCE, ${suppressIds.length} SUPPRESS`);

  // This would call the campaign API to update lead priorities
  // For now, just log the IDs
  if (advanceIds.length > 0) {
    console.log(`ADVANCE (increase priority): ${advanceIds.slice(0, 10).join(", ")}${advanceIds.length > 10 ? "..." : ""}`);
  }
  if (suppressIds.length > 0) {
    console.log(`SUPPRESS (decrease priority): ${suppressIds.slice(0, 10).join(", ")}${suppressIds.length > 10 ? "..." : ""}`);
  }

  // TODO: Implement actual campaign priority updates via GraphQL
  // await fetch(`${NEXTIER_API_URL}/graphql`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     query: `mutation UpdateLeadPriorities($advanceIds: [String!]!, $suppressIds: [String!]!) { ... }`
  //   })
  // });
}

async function monitorSearch(searchKey: string): Promise<MonitorResult | null> {
  console.log(`\n📊 Monitoring: ${searchKey}`);

  const searchData = await getSearchData(searchKey);
  if (!searchData) {
    console.log("  ❌ Failed to load search data");
    return null;
  }

  const { metadata, properties } = searchData;
  console.log(`  📦 ${properties.length} properties to check`);

  // Build previous data map
  const previousData: Record<string, Record<string, unknown>> = {};
  const propertyIds: string[] = [];

  for (const prop of properties) {
    if (prop.id) {
      propertyIds.push(prop.id);
      previousData[prop.id] = prop;
    }
  }

  // Process in batches
  const allAdvanceIds: string[] = [];
  const allSuppressIds: string[] = [];
  const allSignals: unknown[] = [];

  for (let i = 0; i < propertyIds.length; i += BATCH_SIZE) {
    const batchIds = propertyIds.slice(i, i + BATCH_SIZE);
    const batchPreviousData: Record<string, Record<string, unknown>> = {};
    for (const id of batchIds) {
      batchPreviousData[id] = previousData[id];
    }

    console.log(`  🔍 Checking batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(propertyIds.length / BATCH_SIZE)}...`);

    const { advanceIds, suppressIds, signals } = await checkPropertiesForChanges(batchIds, batchPreviousData);
    allAdvanceIds.push(...advanceIds);
    allSuppressIds.push(...suppressIds);
    allSignals.push(...signals);

    // Rate limit between batches
    if (i + BATCH_SIZE < propertyIds.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const result: MonitorResult = {
    searchId: metadata.id,
    searchName: metadata.name,
    checked: propertyIds.length,
    advanceCount: allAdvanceIds.length,
    suppressCount: allSuppressIds.length,
    signals: allSignals as MonitorResult["signals"],
  };

  console.log(`  ✅ Complete: ${allAdvanceIds.length} ADVANCE, ${allSuppressIds.length} SUPPRESS`);

  // Update campaign priorities
  await updateCampaignPriorities(allAdvanceIds, allSuppressIds);

  // Save results
  await saveMonitorResults(searchKey, result);

  return result;
}

async function main() {
  console.log("🏠 Property Monitor Starting...");
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔗 API: ${NEXTIER_API_URL}`);
  console.log(`📦 Bucket: ${SPACES_BUCKET}`);

  if (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
    console.error("❌ DO_SPACES_KEY and DO_SPACES_SECRET are required");
    process.exit(1);
  }

  // Get all saved searches
  const searchKeys = await listSavedSearches();
  console.log(`\n📋 Found ${searchKeys.length} saved searches`);

  if (searchKeys.length === 0) {
    console.log("No saved searches to monitor. Exiting.");
    process.exit(0);
  }

  // Monitor each search
  const results: MonitorResult[] = [];

  for (const key of searchKeys) {
    const result = await monitorSearch(key);
    if (result) {
      results.push(result);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 MONITORING SUMMARY");
  console.log("=".repeat(50));
  console.log(`Searches monitored: ${results.length}`);
  console.log(`Total properties checked: ${results.reduce((sum, r) => sum + r.checked, 0)}`);
  console.log(`Total ADVANCE signals: ${results.reduce((sum, r) => sum + r.advanceCount, 0)}`);
  console.log(`Total SUPPRESS signals: ${results.reduce((sum, r) => sum + r.suppressCount, 0)}`);
  console.log("=".repeat(50));

  console.log("\n✅ Property Monitor Complete");
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
