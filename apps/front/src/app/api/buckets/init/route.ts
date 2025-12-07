import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// DigitalOcean Spaces configuration
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET = process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET = process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

// All bucket folders we need
const BUCKET_STRUCTURE = {
  // ===== DATALAKE - USBizData Uploads =====
  "datalake/": "Master data lake storage for USBizData lists",

  // NY Residential - 15.8M records
  "datalake/residential/": "Residential consumer data by state",
  "datalake/residential/ny/": "NY residential database (15.8M records)",
  "datalake/residential/ny/raw/": "Raw CSV uploads",
  "datalake/residential/ny/processed/": "Processed/indexed data",
  "datalake/residential/ny/partitions/": "Partitioned by county/zip",

  // NY Cell Phones - 5.1M records
  "datalake/phones/": "Cell phone databases by state",
  "datalake/phones/ny/": "NY cell phone database (5.1M records)",
  "datalake/phones/ny/raw/": "Raw CSV uploads",
  "datalake/phones/ny/processed/": "Processed/indexed data",

  // NY Opt-in Emails - 7.3M records
  "datalake/emails/": "Opt-in email databases by state",
  "datalake/emails/ny/": "NY opt-in email database (7.3M records)",
  "datalake/emails/ny/raw/": "Raw CSV uploads",
  "datalake/emails/ny/processed/": "Processed/indexed data",

  // NY Business - 5.5M records
  "datalake/business/": "Business databases by state",
  "datalake/business/ny/": "NY business database (5.5M records)",
  "datalake/business/ny/raw/": "Raw CSV uploads",
  "datalake/business/ny/processed/": "Processed/indexed data",
  "datalake/business/ny/partnerships/": "Partnership candidate data",

  // Business Sectors by SIC Code
  "datalake/business/ny/sectors/": "Business data organized by industry sector",
  "datalake/business/ny/sectors/professional-services/": "Law firms, accounting, consulting (SIC 81xx, 87xx)",
  "datalake/business/ny/sectors/healthcare-medical/": "Doctors, clinics, medical services (SIC 80xx)",
  "datalake/business/ny/sectors/restaurants-food/": "Restaurants, cafes, catering (SIC 58xx)",
  "datalake/business/ny/sectors/retail-stores/": "Retail shops and stores (SIC 52xx-59xx)",
  "datalake/business/ny/sectors/manufacturing/": "Factories and production (SIC 20xx-39xx)",
  "datalake/business/ny/sectors/transportation-logistics/": "Trucking, shipping, logistics (SIC 40xx-47xx)",
  "datalake/business/ny/sectors/hotels-hospitality/": "Hotels, motels, lodging (SIC 70xx)",
  "datalake/business/ny/sectors/education-training/": "Schools, training centers (SIC 82xx)",
  "datalake/business/ny/sectors/automotive/": "Car dealers, repair shops, parts (SIC 55xx, 75xx)",
  "datalake/business/ny/sectors/financial-services/": "Banks, insurance, investments (SIC 60xx-67xx)",
  "datalake/business/ny/sectors/real-estate/": "Brokers, agents, property management (SIC 65xx)",
  "datalake/business/ny/sectors/construction-contractors/": "Builders, contractors, trades (SIC 15xx-17xx)",

  // Real Estate API Saved Searches
  "datalake/realestate/": "RealEstateAPI.com saved searches",
  "datalake/realestate/searches/": "Saved search results",
  "datalake/realestate/properties/": "Property detail cache",
  "datalake/realestate/comps/": "Comparable sales data",

  // ===== BUCKETS - Lead Collections =====
  "buckets/": "Lead bucket collections (campaigns, filters)",

  // ===== Research & Valuation =====
  "research-library/": "Property valuation reports organized by folder",
  "research-library/reports/": "Individual saved valuation reports",
  "research-library/Active Deals/": "Active deals folder",
  "research-library/Research/": "Research folder",
  "research-library/Archived/": "Archived reports",

  // Valuation Queue (for email delivery)
  "valuation-queue/": "Queue for pending valuation email deliveries",
  "valuation-queue/pending/": "Pending items to process",
  "valuation-queue/processing/": "Currently being processed",
  "valuation-queue/completed/": "Successfully sent",
  "valuation-queue/failed/": "Failed deliveries for retry",

  // Skip Trace Results
  "skip-trace/": "Skip trace results storage",
  "skip-trace/results/": "Individual skip trace results",
  "skip-trace/bulk/": "Bulk skip trace jobs",

  // Lead Data
  "leads/": "Lead data storage",
  "leads/imports/": "CSV imports",
  "leads/exports/": "CSV exports",
  "leads/enriched/": "Enriched lead data",

  // Campaigns
  "campaigns/": "Campaign data",
  "campaigns/templates/": "Message templates",
  "campaigns/sms/": "SMS campaign data",
  "campaigns/email/": "Email campaign data",
  "campaigns/voice/": "Voice campaign data",

  // AI Analysis
  "ai-analysis/": "AI generated content",
  "ai-analysis/valuations/": "AI valuation analyses",
  "ai-analysis/responses/": "AI generated responses",

  // Inbound Messages
  "inbound/": "Inbound message storage",
  "inbound/sms/": "Inbound SMS messages",
  "inbound/email/": "Inbound emails",
  "inbound/voicemail/": "Voicemails",

  // Property Data Cache
  "property-cache/": "Cached property data",
  "property-cache/details/": "Property detail cache",
  "property-cache/comps/": "Comparable properties cache",
  "property-cache/images/": "Property images",

  // User Data
  "users/": "User-specific data",
  "users/preferences/": "User preferences",
  "users/exports/": "User exports",

  // System
  "system/": "System data",
  "system/logs/": "System logs",
  "system/backups/": "Backups",
  "system/config/": "Configuration",
};

// Create a folder marker in S3/Spaces
async function createFolder(folderPath: string, description: string) {
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: `${folderPath}.folder`,
      Body: JSON.stringify({
        created: new Date().toISOString(),
        description,
      }),
      ContentType: "application/json",
    }));
    return { path: folderPath, status: "created" };
  } catch (error) {
    console.error(`Failed to create folder ${folderPath}:`, error);
    return { path: folderPath, status: "error", error: String(error) };
  }
}

// Check if folder exists
async function folderExists(folderPath: string): Promise<boolean> {
  try {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      Prefix: folderPath,
      MaxKeys: 1,
    }));
    return (response.Contents?.length || 0) > 0;
  } catch {
    return false;
  }
}

// POST - Initialize all buckets
export async function POST() {
  try {
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json({
        error: "DigitalOcean Spaces credentials not configured",
        required: ["SPACES_KEY", "SPACES_SECRET", "SPACES_BUCKET"],
      }, { status: 503 });
    }

    const results: Array<{ path: string; status: string; error?: string }> = [];
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const [path, description] of Object.entries(BUCKET_STRUCTURE)) {
      const exists = await folderExists(path);

      if (exists) {
        results.push({ path, status: "exists" });
        skipped++;
      } else {
        const result = await createFolder(path, description);
        results.push(result);
        if (result.status === "created") created++;
        else errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bucket initialization complete`,
      stats: {
        total: Object.keys(BUCKET_STRUCTURE).length,
        created,
        skipped,
        errors,
      },
      bucket: SPACES_BUCKET,
      endpoint: SPACES_ENDPOINT,
      results,
    });
  } catch (error) {
    console.error("[Bucket Init] Error:", error);
    return NextResponse.json({
      error: "Bucket initialization failed",
      details: String(error),
    }, { status: 500 });
  }
}

// GET - List current bucket structure
export async function GET() {
  try {
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json({
        error: "DigitalOcean Spaces credentials not configured",
        structure: BUCKET_STRUCTURE,
      }, { status: 503 });
    }

    // List all top-level folders
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      Delimiter: "/",
    }));

    const existingFolders = response.CommonPrefixes?.map(p => p.Prefix) || [];

    return NextResponse.json({
      success: true,
      bucket: SPACES_BUCKET,
      endpoint: SPACES_ENDPOINT,
      existingFolders,
      requiredStructure: BUCKET_STRUCTURE,
      configured: {
        hasKey: !!SPACES_KEY,
        hasSecret: !!SPACES_SECRET,
        bucket: SPACES_BUCKET,
      },
    });
  } catch (error) {
    console.error("[Bucket List] Error:", error);
    return NextResponse.json({
      error: "Failed to list buckets",
      details: String(error),
      structure: BUCKET_STRUCTURE,
    }, { status: 500 });
  }
}
