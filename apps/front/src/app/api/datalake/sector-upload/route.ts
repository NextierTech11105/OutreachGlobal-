/**
 * Sector Upload API
 * Upload CSV lists directly to B2B sector folders in the datalake
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// DO Spaces configuration
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

// B2B Sector definitions with SIC code mappings
export const B2B_SECTORS = {
  "professional-services": {
    name: "Professional Services",
    description: "Law firms, accounting, consulting, engineering",
    sicPrefix: ["81", "87"],
    subsectors: {
      "legal-services": { name: "Legal Services", sicCodes: ["8111"] },
      "accounting": { name: "Accounting & CPA", sicCodes: ["8721"] },
      "consulting": { name: "Management Consulting", sicCodes: ["8742"] },
      "engineering": { name: "Engineering Services", sicCodes: ["8711"] },
      "architects": { name: "Architectural Firms", sicCodes: ["8712"] },
    },
  },
  "healthcare-medical": {
    name: "Healthcare & Medical",
    description: "Doctors, clinics, medical services",
    sicPrefix: ["80"],
    subsectors: {
      "physicians": { name: "Physicians", sicCodes: ["8011"] },
      "dentists": { name: "Dentists", sicCodes: ["8021"] },
      "chiropractors": { name: "Chiropractors", sicCodes: ["8041"] },
      "nursing-homes": { name: "Nursing Homes", sicCodes: ["8051"] },
      "home-health": { name: "Home Health", sicCodes: ["8082"] },
      "medical-labs": { name: "Medical Labs", sicCodes: ["8071"] },
    },
  },
  "restaurants-food": {
    name: "Restaurants & Food Service",
    description: "Restaurants, cafes, catering, bars",
    sicPrefix: ["58"],
    subsectors: {
      "restaurants": { name: "Full-Service Restaurants", sicCodes: ["5812"] },
      "pizzerias": { name: "Pizzerias", sicCodes: ["5812"] },
      "fast-food": { name: "Fast Food", sicCodes: ["5812"] },
      "bars-taverns": { name: "Bars & Taverns", sicCodes: ["5813"] },
      "catering": { name: "Caterers", sicCodes: ["5812"] },
      "bakeries": { name: "Bakeries", sicCodes: ["5461"] },
      "delis": { name: "Delis", sicCodes: ["5812"] },
    },
  },
  "retail-stores": {
    name: "Retail Stores",
    description: "Shops and retail establishments",
    sicPrefix: ["52", "53", "54", "55", "56", "57", "59"],
    subsectors: {
      "grocery": { name: "Grocery Stores", sicCodes: ["5411"] },
      "convenience": { name: "Convenience Stores", sicCodes: ["5411"] },
      "clothing": { name: "Clothing Stores", sicCodes: ["5611", "5621", "5651"] },
      "hardware": { name: "Hardware Stores", sicCodes: ["5251"] },
      "furniture": { name: "Furniture Stores", sicCodes: ["5712"] },
      "electronics": { name: "Electronics", sicCodes: ["5731"] },
      "pharmacies": { name: "Pharmacies", sicCodes: ["5912"] },
    },
  },
  "manufacturing": {
    name: "Manufacturing",
    description: "Factories and production facilities",
    sicPrefix: ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39"],
    subsectors: {
      "food-processing": { name: "Food Processing", sicCodes: ["2011", "2013", "2015", "2020"] },
      "textiles": { name: "Textiles", sicCodes: ["2211", "2221", "2231"] },
      "printing": { name: "Printing", sicCodes: ["2711", "2721", "2752"] },
      "chemicals": { name: "Chemicals", sicCodes: ["2812", "2819", "2821"] },
      "plastics": { name: "Plastics", sicCodes: ["3081", "3082", "3083"] },
      "metals": { name: "Metal Fabrication", sicCodes: ["3312", "3317", "3441"] },
      "machinery": { name: "Machinery", sicCodes: ["3531", "3532", "3533"] },
      "electronics": { name: "Electronics Mfg", sicCodes: ["3661", "3672", "3674"] },
      "cement-concrete": { name: "Cement & Concrete", sicCodes: ["3241", "3272", "3273"] },
    },
  },
  "transportation-logistics": {
    name: "Transportation & Logistics",
    description: "Trucking, shipping, warehousing",
    sicPrefix: ["40", "41", "42", "43", "44", "45", "46", "47"],
    subsectors: {
      "trucking": { name: "Trucking", sicCodes: ["4212", "4213", "4214"] },
      "moving": { name: "Moving Companies", sicCodes: ["4212", "4214"] },
      "warehousing": { name: "Warehousing", sicCodes: ["4225", "4226"] },
      "freight": { name: "Freight Forwarding", sicCodes: ["4731"] },
      "courier": { name: "Courier Services", sicCodes: ["4215"] },
      "taxis-limo": { name: "Taxi & Limo", sicCodes: ["4121"] },
    },
  },
  "hotels-hospitality": {
    name: "Hotels & Hospitality",
    description: "Hotels, motels, lodging",
    sicPrefix: ["70"],
    subsectors: {
      "hotels": { name: "Hotels", sicCodes: ["7011"] },
      "motels": { name: "Motels", sicCodes: ["7011"] },
      "bed-breakfast": { name: "B&Bs", sicCodes: ["7011"] },
      "event-venues": { name: "Event Venues", sicCodes: ["7941"] },
    },
  },
  "education-training": {
    name: "Education & Training",
    description: "Schools, training centers",
    sicPrefix: ["82", "83"],
    subsectors: {
      "private-schools": { name: "Private Schools", sicCodes: ["8211"] },
      "colleges": { name: "Colleges", sicCodes: ["8221"] },
      "vocational": { name: "Vocational Schools", sicCodes: ["8249"] },
      "tutoring": { name: "Tutoring", sicCodes: ["8299"] },
      "daycare": { name: "Daycare", sicCodes: ["8351"] },
    },
  },
  "automotive": {
    name: "Automotive",
    description: "Car dealers, repair, parts",
    sicPrefix: ["55", "75"],
    subsectors: {
      "dealers-new": { name: "New Car Dealers", sicCodes: ["5511"] },
      "dealers-used": { name: "Used Car Dealers", sicCodes: ["5521"] },
      "repair-shops": { name: "Auto Repair", sicCodes: ["7538"] },
      "body-shops": { name: "Body Shops", sicCodes: ["7532"] },
      "parts-stores": { name: "Parts Stores", sicCodes: ["5531"] },
      "tire-shops": { name: "Tire Shops", sicCodes: ["5531"] },
      "car-wash": { name: "Car Washes", sicCodes: ["7542"] },
    },
  },
  "financial-services": {
    name: "Financial Services",
    description: "Banks, insurance, investments",
    sicPrefix: ["60", "61", "62", "63", "64", "65", "66", "67"],
    subsectors: {
      "banks": { name: "Banks", sicCodes: ["6021", "6022"] },
      "credit-unions": { name: "Credit Unions", sicCodes: ["6061"] },
      "mortgage-brokers": { name: "Mortgage Brokers", sicCodes: ["6162"] },
      "insurance-agents": { name: "Insurance Agents", sicCodes: ["6411"] },
      "investment-advisors": { name: "Investment Advisors", sicCodes: ["6282"] },
      "tax-preparers": { name: "Tax Preparers", sicCodes: ["7291"] },
    },
  },
  "real-estate": {
    name: "Real Estate",
    description: "Brokers, agents, property management",
    sicPrefix: ["65"],
    subsectors: {
      "agents-brokers": { name: "Agents & Brokers", sicCodes: ["6531"] },
      "property-mgmt": { name: "Property Management", sicCodes: ["6531"] },
      "developers": { name: "Developers", sicCodes: ["6552"] },
      "appraisers": { name: "Appraisers", sicCodes: ["6531"] },
      "title-companies": { name: "Title Companies", sicCodes: ["6361"] },
    },
  },
  "construction-contractors": {
    name: "Construction & Contractors",
    description: "Builders, contractors, trades",
    sicPrefix: ["15", "16", "17"],
    subsectors: {
      "general-contractors": { name: "General Contractors", sicCodes: ["1521", "1522"] },
      "commercial-builders": { name: "Commercial Builders", sicCodes: ["1541", "1542"] },
      "plumbers": { name: "Plumbers", sicCodes: ["1711"] },
      "electricians": { name: "Electricians", sicCodes: ["1731"] },
      "hvac": { name: "HVAC", sicCodes: ["1711"] },
      "roofers": { name: "Roofers", sicCodes: ["1761"] },
      "painters": { name: "Painters", sicCodes: ["1721"] },
      "carpenters": { name: "Carpenters", sicCodes: ["1751"] },
      "masonry": { name: "Masonry", sicCodes: ["1741"] },
      "landscaping": { name: "Landscaping", sicCodes: ["0782"] },
    },
  },
  "personal-services": {
    name: "Personal Services",
    description: "Personal care and services",
    sicPrefix: ["72"],
    subsectors: {
      "salons": { name: "Hair Salons", sicCodes: ["7231"] },
      "barbershops": { name: "Barber Shops", sicCodes: ["7241"] },
      "spas": { name: "Day Spas", sicCodes: ["7299"] },
      "dry-cleaners": { name: "Dry Cleaners", sicCodes: ["7216"] },
      "laundromats": { name: "Laundromats", sicCodes: ["7215"] },
      "funeral-homes": { name: "Funeral Homes", sicCodes: ["7261"] },
    },
  },
  "business-services": {
    name: "Business Services",
    description: "B2B service providers",
    sicPrefix: ["73"],
    subsectors: {
      "advertising": { name: "Advertising", sicCodes: ["7311"] },
      "staffing": { name: "Staffing Agencies", sicCodes: ["7361"] },
      "janitorial": { name: "Janitorial", sicCodes: ["7349"] },
      "security": { name: "Security Services", sicCodes: ["7381", "7382"] },
      "it-services": { name: "IT Services", sicCodes: ["7371", "7372", "7373", "7374", "7375", "7376", "7377", "7378", "7379"] },
      "printing": { name: "Commercial Printing", sicCodes: ["2752"] },
    },
  },
  "recreation-entertainment": {
    name: "Recreation & Entertainment",
    description: "Entertainment venues and services",
    sicPrefix: ["79"],
    subsectors: {
      "gyms": { name: "Gyms & Fitness", sicCodes: ["7991"] },
      "golf-courses": { name: "Golf Courses", sicCodes: ["7992"] },
      "bowling": { name: "Bowling Alleys", sicCodes: ["7933"] },
      "theaters": { name: "Movie Theaters", sicCodes: ["7832"] },
      "amusement": { name: "Amusement Parks", sicCodes: ["7996"] },
    },
  },
};

// Build storage path from sector/subsector
function getStoragePath(sector: string, subsector?: string): string {
  const basePath = `datalake/business/ny/sectors/${sector}/`;
  if (subsector) {
    return `${basePath}${subsector}/`;
  }
  return `${basePath}raw/`;
}

// POST - Upload CSV to sector
export async function POST(request: NextRequest) {
  try {
    if (!SPACES_KEY || !SPACES_SECRET) {
      return NextResponse.json({
        error: "DigitalOcean Spaces credentials not configured",
      }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sector = formData.get("sector") as string | null;
    const subsector = formData.get("subsector") as string | null;
    const notes = formData.get("notes") as string | null;
    const recordCount = formData.get("recordCount") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!sector) {
      return NextResponse.json({
        error: "sector is required",
        availableSectors: Object.keys(B2B_SECTORS),
      }, { status: 400 });
    }

    // Validate sector
    const sectorDef = B2B_SECTORS[sector as keyof typeof B2B_SECTORS];
    if (!sectorDef) {
      return NextResponse.json({
        error: `Invalid sector: ${sector}`,
        availableSectors: Object.keys(B2B_SECTORS),
      }, { status: 400 });
    }

    // Validate subsector if provided
    if (subsector && !sectorDef.subsectors[subsector as keyof typeof sectorDef.subsectors]) {
      return NextResponse.json({
        error: `Invalid subsector: ${subsector} for sector: ${sector}`,
        availableSubsectors: Object.keys(sectorDef.subsectors),
      }, { status: 400 });
    }

    const storagePath = getStoragePath(sector, subsector || undefined);

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${storagePath}${timestamp}_${sanitizedName}`;

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Spaces
    await s3Client.send(new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "text/csv",
      Metadata: {
        "x-amz-meta-sector": sector,
        "x-amz-meta-subsector": subsector || "",
        "x-amz-meta-original-filename": file.name,
        "x-amz-meta-uploaded-at": new Date().toISOString(),
      },
    }));

    // Save metadata file
    const metadata = {
      sector,
      subsector: subsector || null,
      sectorName: sectorDef.name,
      subsectorName: subsector ? sectorDef.subsectors[subsector as keyof typeof sectorDef.subsectors]?.name : null,
      originalFilename: file.name,
      uploadedAt: new Date().toISOString(),
      fileSize: buffer.length,
      recordCount: recordCount ? parseInt(recordCount) : undefined,
      notes: notes || undefined,
      storagePath,
    };

    await s3Client.send(new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: `${key}.meta.json`,
      Body: JSON.stringify(metadata, null, 2),
      ContentType: "application/json",
    }));

    return NextResponse.json({
      success: true,
      message: `Uploaded ${file.name} to ${sectorDef.name}${subsector ? ` / ${sectorDef.subsectors[subsector as keyof typeof sectorDef.subsectors]?.name}` : ""}`,
      details: {
        key,
        bucket: SPACES_BUCKET,
        sector: sectorDef.name,
        subsector: subsector ? sectorDef.subsectors[subsector as keyof typeof sectorDef.subsectors]?.name : null,
        storagePath,
        fileSize: buffer.length,
        fileSizeFormatted: formatBytes(buffer.length),
      },
    });
  } catch (error) {
    console.error("[Sector Upload] Error:", error);
    return NextResponse.json({
      error: "Upload failed",
      details: String(error),
    }, { status: 500 });
  }
}

// GET - List available sectors and their contents
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get("sector");
  const subsector = searchParams.get("subsector");

  // If sector specified, list files in that sector
  if (sector) {
    const sectorDef = B2B_SECTORS[sector as keyof typeof B2B_SECTORS];
    if (!sectorDef) {
      return NextResponse.json({
        error: `Invalid sector: ${sector}`,
        availableSectors: Object.keys(B2B_SECTORS),
      }, { status: 400 });
    }

    const storagePath = getStoragePath(sector, subsector || undefined);

    try {
      const response = await s3Client.send(new ListObjectsV2Command({
        Bucket: SPACES_BUCKET,
        Prefix: storagePath,
      }));

      const files = (response.Contents || [])
        .filter(obj => obj.Key?.endsWith(".csv"))
        .map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          sizeFormatted: formatBytes(obj.Size || 0),
        }));

      return NextResponse.json({
        success: true,
        sector: sectorDef.name,
        subsector: subsector ? sectorDef.subsectors[subsector as keyof typeof sectorDef.subsectors]?.name : null,
        storagePath,
        fileCount: files.length,
        files,
        availableSubsectors: Object.entries(sectorDef.subsectors).map(([id, sub]) => ({
          id,
          name: sub.name,
          sicCodes: sub.sicCodes,
        })),
      });
    } catch (error) {
      return NextResponse.json({
        error: "Failed to list files",
        details: String(error),
      }, { status: 500 });
    }
  }

  // Otherwise, return all sectors and their structure
  const sectors = Object.entries(B2B_SECTORS).map(([id, sector]) => ({
    id,
    name: sector.name,
    description: sector.description,
    sicPrefix: sector.sicPrefix,
    storagePath: getStoragePath(id),
    subsectors: Object.entries(sector.subsectors).map(([subId, sub]) => ({
      id: subId,
      name: sub.name,
      sicCodes: sub.sicCodes,
      storagePath: getStoragePath(id, subId),
    })),
  }));

  return NextResponse.json({
    success: true,
    message: "Upload CSV files to B2B sector folders",
    endpoint: "POST /api/datalake/sector-upload",
    requiredFields: {
      file: "CSV file (multipart/form-data)",
      sector: "Sector ID (e.g., 'restaurants-food', 'construction-contractors')",
    },
    optionalFields: {
      subsector: "Subsector ID (e.g., 'pizzerias', 'plumbers')",
      notes: "Description of this upload",
      recordCount: "Number of records in file",
    },
    totalSectors: sectors.length,
    sectors,
    configured: {
      hasCredentials: !!(SPACES_KEY && SPACES_SECRET),
      bucket: SPACES_BUCKET,
      endpoint: SPACES_ENDPOINT,
    },
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
