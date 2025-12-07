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

  // ===== Business Sectors by SIC Code =====
  "datalake/business/ny/sectors/": "Business data organized by industry sector",

  // Professional Services (SIC 81xx, 87xx)
  "datalake/business/ny/sectors/professional-services/": "Law firms, accounting, consulting",
  "datalake/business/ny/sectors/professional-services/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/professional-services/legal-services/": "Attorneys & law firms (SIC 8111)",
  "datalake/business/ny/sectors/professional-services/accounting/": "CPAs, bookkeeping (SIC 8721)",
  "datalake/business/ny/sectors/professional-services/consulting/": "Management consultants (SIC 8742)",
  "datalake/business/ny/sectors/professional-services/engineering/": "Engineering services (SIC 8711)",
  "datalake/business/ny/sectors/professional-services/architects/": "Architectural firms (SIC 8712)",

  // Healthcare & Medical (SIC 80xx)
  "datalake/business/ny/sectors/healthcare-medical/": "Doctors, clinics, medical services",
  "datalake/business/ny/sectors/healthcare-medical/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/healthcare-medical/physicians/": "Doctors offices (SIC 8011)",
  "datalake/business/ny/sectors/healthcare-medical/dentists/": "Dental offices (SIC 8021)",
  "datalake/business/ny/sectors/healthcare-medical/chiropractors/": "Chiropractic offices (SIC 8041)",
  "datalake/business/ny/sectors/healthcare-medical/nursing-homes/": "Skilled nursing facilities (SIC 8051)",
  "datalake/business/ny/sectors/healthcare-medical/home-health/": "Home health agencies (SIC 8082)",
  "datalake/business/ny/sectors/healthcare-medical/medical-labs/": "Labs and diagnostics (SIC 8071)",

  // Restaurants & Food Service (SIC 58xx)
  "datalake/business/ny/sectors/restaurants-food/": "Restaurants, cafes, catering",
  "datalake/business/ny/sectors/restaurants-food/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/restaurants-food/restaurants/": "Full-service restaurants (SIC 5812)",
  "datalake/business/ny/sectors/restaurants-food/pizzerias/": "Pizza shops (SIC 5812)",
  "datalake/business/ny/sectors/restaurants-food/fast-food/": "Fast food chains (SIC 5812)",
  "datalake/business/ny/sectors/restaurants-food/bars-taverns/": "Bars and drinking places (SIC 5813)",
  "datalake/business/ny/sectors/restaurants-food/catering/": "Caterers (SIC 5812)",
  "datalake/business/ny/sectors/restaurants-food/bakeries/": "Bakeries (SIC 5461)",
  "datalake/business/ny/sectors/restaurants-food/delis/": "Delis and sandwich shops (SIC 5812)",

  // Retail Stores (SIC 52xx-59xx)
  "datalake/business/ny/sectors/retail-stores/": "Retail shops and stores",
  "datalake/business/ny/sectors/retail-stores/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/retail-stores/grocery/": "Grocery stores (SIC 5411)",
  "datalake/business/ny/sectors/retail-stores/convenience/": "Convenience stores (SIC 5411)",
  "datalake/business/ny/sectors/retail-stores/clothing/": "Clothing stores (SIC 56xx)",
  "datalake/business/ny/sectors/retail-stores/hardware/": "Hardware stores (SIC 5251)",
  "datalake/business/ny/sectors/retail-stores/furniture/": "Furniture stores (SIC 5712)",
  "datalake/business/ny/sectors/retail-stores/electronics/": "Electronics stores (SIC 5731)",
  "datalake/business/ny/sectors/retail-stores/pharmacies/": "Drug stores & pharmacies (SIC 5912)",

  // Manufacturing (SIC 20xx-39xx)
  "datalake/business/ny/sectors/manufacturing/": "Factories and production",
  "datalake/business/ny/sectors/manufacturing/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/manufacturing/food-processing/": "Food manufacturing (SIC 20xx)",
  "datalake/business/ny/sectors/manufacturing/textiles/": "Textile mills (SIC 22xx)",
  "datalake/business/ny/sectors/manufacturing/printing/": "Printing & publishing (SIC 27xx)",
  "datalake/business/ny/sectors/manufacturing/chemicals/": "Chemical products (SIC 28xx)",
  "datalake/business/ny/sectors/manufacturing/plastics/": "Plastics & rubber (SIC 30xx)",
  "datalake/business/ny/sectors/manufacturing/metals/": "Metal fabrication (SIC 33xx-34xx)",
  "datalake/business/ny/sectors/manufacturing/machinery/": "Industrial machinery (SIC 35xx)",
  "datalake/business/ny/sectors/manufacturing/electronics/": "Electronic equipment (SIC 36xx)",
  "datalake/business/ny/sectors/manufacturing/cement-concrete/": "Cement & concrete (SIC 3241, 3272)",

  // Transportation & Logistics (SIC 40xx-47xx)
  "datalake/business/ny/sectors/transportation-logistics/": "Trucking, shipping, logistics",
  "datalake/business/ny/sectors/transportation-logistics/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/transportation-logistics/trucking/": "Trucking companies (SIC 4212-4214)",
  "datalake/business/ny/sectors/transportation-logistics/moving/": "Moving companies (SIC 4212-4214)",
  "datalake/business/ny/sectors/transportation-logistics/warehousing/": "Warehouses & storage (SIC 4225)",
  "datalake/business/ny/sectors/transportation-logistics/freight/": "Freight forwarding (SIC 4731)",
  "datalake/business/ny/sectors/transportation-logistics/courier/": "Courier services (SIC 4215)",
  "datalake/business/ny/sectors/transportation-logistics/taxis-limo/": "Taxi & limo services (SIC 4121)",

  // Hotels & Hospitality (SIC 70xx)
  "datalake/business/ny/sectors/hotels-hospitality/": "Hotels, motels, lodging",
  "datalake/business/ny/sectors/hotels-hospitality/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/hotels-hospitality/hotels/": "Hotels (SIC 7011)",
  "datalake/business/ny/sectors/hotels-hospitality/motels/": "Motels (SIC 7011)",
  "datalake/business/ny/sectors/hotels-hospitality/bed-breakfast/": "B&Bs (SIC 7011)",
  "datalake/business/ny/sectors/hotels-hospitality/event-venues/": "Event halls & venues (SIC 7941)",

  // Education & Training (SIC 82xx)
  "datalake/business/ny/sectors/education-training/": "Schools, training centers",
  "datalake/business/ny/sectors/education-training/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/education-training/private-schools/": "Private K-12 schools (SIC 8211)",
  "datalake/business/ny/sectors/education-training/colleges/": "Colleges & universities (SIC 8221)",
  "datalake/business/ny/sectors/education-training/vocational/": "Vocational schools (SIC 8249)",
  "datalake/business/ny/sectors/education-training/tutoring/": "Tutoring services (SIC 8299)",
  "datalake/business/ny/sectors/education-training/daycare/": "Child daycare (SIC 8351)",

  // Automotive (SIC 55xx, 75xx)
  "datalake/business/ny/sectors/automotive/": "Car dealers, repair shops, parts",
  "datalake/business/ny/sectors/automotive/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/automotive/dealers-new/": "New car dealers (SIC 5511)",
  "datalake/business/ny/sectors/automotive/dealers-used/": "Used car dealers (SIC 5521)",
  "datalake/business/ny/sectors/automotive/repair-shops/": "Auto repair (SIC 7538)",
  "datalake/business/ny/sectors/automotive/body-shops/": "Body shops (SIC 7532)",
  "datalake/business/ny/sectors/automotive/parts-stores/": "Auto parts stores (SIC 5531)",
  "datalake/business/ny/sectors/automotive/tire-shops/": "Tire dealers (SIC 5531)",
  "datalake/business/ny/sectors/automotive/car-wash/": "Car washes (SIC 7542)",

  // Financial Services (SIC 60xx-67xx)
  "datalake/business/ny/sectors/financial-services/": "Banks, insurance, investments",
  "datalake/business/ny/sectors/financial-services/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/financial-services/banks/": "Banks (SIC 6021-6022)",
  "datalake/business/ny/sectors/financial-services/credit-unions/": "Credit unions (SIC 6061)",
  "datalake/business/ny/sectors/financial-services/mortgage-brokers/": "Mortgage companies (SIC 6162)",
  "datalake/business/ny/sectors/financial-services/insurance-agents/": "Insurance agents (SIC 6411)",
  "datalake/business/ny/sectors/financial-services/investment-advisors/": "Investment advisors (SIC 6282)",
  "datalake/business/ny/sectors/financial-services/tax-preparers/": "Tax prep services (SIC 7291)",

  // Real Estate (SIC 65xx)
  "datalake/business/ny/sectors/real-estate/": "Brokers, agents, property management",
  "datalake/business/ny/sectors/real-estate/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/real-estate/agents-brokers/": "RE agents & brokers (SIC 6531)",
  "datalake/business/ny/sectors/real-estate/property-mgmt/": "Property managers (SIC 6531)",
  "datalake/business/ny/sectors/real-estate/developers/": "Land developers (SIC 6552)",
  "datalake/business/ny/sectors/real-estate/appraisers/": "Appraisers (SIC 6531)",
  "datalake/business/ny/sectors/real-estate/title-companies/": "Title & escrow (SIC 6361)",

  // Construction & Contractors (SIC 15xx-17xx)
  "datalake/business/ny/sectors/construction-contractors/": "Builders, contractors, trades",
  "datalake/business/ny/sectors/construction-contractors/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/construction-contractors/general-contractors/": "GCs residential (SIC 1521)",
  "datalake/business/ny/sectors/construction-contractors/commercial-builders/": "Commercial construction (SIC 1541)",
  "datalake/business/ny/sectors/construction-contractors/plumbers/": "Plumbing contractors (SIC 1711)",
  "datalake/business/ny/sectors/construction-contractors/electricians/": "Electrical contractors (SIC 1731)",
  "datalake/business/ny/sectors/construction-contractors/hvac/": "HVAC contractors (SIC 1711)",
  "datalake/business/ny/sectors/construction-contractors/roofers/": "Roofing contractors (SIC 1761)",
  "datalake/business/ny/sectors/construction-contractors/painters/": "Painting contractors (SIC 1721)",
  "datalake/business/ny/sectors/construction-contractors/carpenters/": "Carpentry contractors (SIC 1751)",
  "datalake/business/ny/sectors/construction-contractors/masonry/": "Masonry & concrete (SIC 1741)",
  "datalake/business/ny/sectors/construction-contractors/landscaping/": "Landscaping services (SIC 0782)",

  // Personal Services (SIC 72xx)
  "datalake/business/ny/sectors/personal-services/": "Personal care and services",
  "datalake/business/ny/sectors/personal-services/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/personal-services/salons/": "Hair salons (SIC 7231)",
  "datalake/business/ny/sectors/personal-services/barbershops/": "Barber shops (SIC 7241)",
  "datalake/business/ny/sectors/personal-services/spas/": "Day spas (SIC 7299)",
  "datalake/business/ny/sectors/personal-services/dry-cleaners/": "Dry cleaners (SIC 7216)",
  "datalake/business/ny/sectors/personal-services/laundromats/": "Laundromats (SIC 7215)",
  "datalake/business/ny/sectors/personal-services/funeral-homes/": "Funeral services (SIC 7261)",

  // Business Services (SIC 73xx)
  "datalake/business/ny/sectors/business-services/": "B2B service providers",
  "datalake/business/ny/sectors/business-services/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/business-services/advertising/": "Ad agencies (SIC 7311)",
  "datalake/business/ny/sectors/business-services/staffing/": "Staffing agencies (SIC 7361)",
  "datalake/business/ny/sectors/business-services/janitorial/": "Cleaning services (SIC 7349)",
  "datalake/business/ny/sectors/business-services/security/": "Security services (SIC 7381-7382)",
  "datalake/business/ny/sectors/business-services/it-services/": "Computer services (SIC 7371-7379)",
  "datalake/business/ny/sectors/business-services/printing/": "Commercial printing (SIC 2752)",

  // Recreation & Entertainment (SIC 79xx)
  "datalake/business/ny/sectors/recreation-entertainment/": "Entertainment venues and services",
  "datalake/business/ny/sectors/recreation-entertainment/raw/": "Raw CSV uploads",
  "datalake/business/ny/sectors/recreation-entertainment/gyms/": "Fitness centers (SIC 7991)",
  "datalake/business/ny/sectors/recreation-entertainment/golf-courses/": "Golf courses (SIC 7992)",
  "datalake/business/ny/sectors/recreation-entertainment/bowling/": "Bowling alleys (SIC 7933)",
  "datalake/business/ny/sectors/recreation-entertainment/theaters/": "Movie theaters (SIC 7832)",
  "datalake/business/ny/sectors/recreation-entertainment/amusement/": "Amusement parks (SIC 7996)",

  // ===== Real Estate API Saved Searches =====
  "datalake/realestate/": "RealEstateAPI.com saved searches and property data",
  "datalake/realestate/searches/": "Saved search results with property IDs",
  "datalake/realestate/searches/active/": "Active saved searches for campaigns",
  "datalake/realestate/searches/archived/": "Archived/completed search campaigns",
  "datalake/realestate/properties/": "Property detail cache",
  "datalake/realestate/properties/pending-outreach/": "Properties pending outreach campaign",
  "datalake/realestate/properties/in-campaign/": "Properties currently in SMS/Email campaign",
  "datalake/realestate/properties/contacted/": "Properties already contacted",
  "datalake/realestate/properties/responded/": "Properties that responded (leads)",
  "datalake/realestate/comps/": "Comparable sales data",
  "datalake/realestate/valuations/": "Property valuations generated",
  "datalake/realestate/reports/": "Shareable valuation reports",

  // Property Campaign Tracking
  "datalake/realestate/campaigns/": "Property outreach campaigns",
  "datalake/realestate/campaigns/sms/": "SMS campaign batches",
  "datalake/realestate/campaigns/email/": "Email campaign batches",
  "datalake/realestate/campaigns/completed/": "Completed campaign results",

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
