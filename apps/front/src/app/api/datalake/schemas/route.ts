import { sf, sfd } from "@/lib/utils/safe-format";
import { NextResponse } from "next/server";

// ==========================================
// USBizData Schema Definitions
// All schemas for NY data lakes
// ==========================================

export const DATA_LAKE_SCHEMAS = {
  // NY Residential Database - 15.8M records
  ny_residential: {
    name: "New York Residential Database",
    source: "USBizData",
    totalRecords: 15801605,
    lastUpdate: "Q4 2025",
    description: "Complete NY residential data with demographics, property info, and wealth indicators",
    fields: [
      { name: "First Name", normalized: "firstName", type: "string", indexed: true },
      { name: "Middle Initial", normalized: "middleInitial", type: "string" },
      { name: "Last Name", normalized: "lastName", type: "string", indexed: true },
      { name: "Address", normalized: "address", type: "string", indexed: true },
      { name: "City", normalized: "city", type: "string", indexed: true },
      { name: "State", normalized: "state", type: "string" },
      { name: "Zip Code", normalized: "zipCode", type: "string", indexed: true },
      { name: "Zip Code + 4", normalized: "zip4", type: "string" },
      { name: "Delivery Point", normalized: "deliveryPoint", type: "string" },
      { name: "Carrier Route", normalized: "carrierRoute", type: "string" },
      { name: "County Number", normalized: "countyFips", type: "string" },
      { name: "County Name", normalized: "county", type: "string", indexed: true },
      { name: "Latitude", normalized: "lat", type: "number" },
      { name: "Longitude", normalized: "lng", type: "number" },
      { name: "First in Household", normalized: "headOfHousehold", type: "boolean" },
      { name: "Child Present", normalized: "hasChildren", type: "boolean" },
      { name: "MFDU", normalized: "isMultiFamily", type: "boolean" },
      { name: "Exact Age", normalized: "age", type: "number" },
      { name: "Estimated Age", normalized: "estimatedAge", type: "number" },
      { name: "Estimated Income", normalized: "estimatedIncome", type: "number" },
      { name: "Length of Residence", normalized: "yearsAtAddress", type: "number" },
      { name: "Address Type", normalized: "addressType", type: "string" },
      { name: "Dwelling Type", normalized: "dwellingType", type: "string" },
      { name: "Homeowner Type", normalized: "ownershipType", type: "string" },
      { name: "Property", normalized: "propertyType", type: "string" },
      { name: "Med Home Value", normalized: "medianHomeValue", type: "number" },
      { name: "Marital Status", normalized: "maritalStatus", type: "string" },
      { name: "Ethnic CD", normalized: "ethnicityCode", type: "string" },
      { name: "Title", normalized: "title", type: "string" },
      { name: "Median Yrs in School", normalized: "education", type: "number" },
      { name: "Gender", normalized: "gender", type: "string" },
      { name: "DPV Code", normalized: "dpvCode", type: "string" },
      { name: "Estimated Wealth", normalized: "estimatedWealth", type: "number" },
      { name: "Phone Number", normalized: "phone", type: "string", indexed: true },
      { name: "Time Zone", normalized: "timezone", type: "string" },
      { name: "Birth Date", normalized: "birthDate", type: "date" },
    ],
    storagePath: "datalake/residential/ny/",
    useCases: ["property outreach", "skip trace enrichment", "demographic targeting", "wealth screening"],
  },

  // NY Cell Phone Database - 5.1M records
  ny_cell_phone: {
    name: "New York Cell Phone Database",
    source: "USBizData",
    totalRecords: 5141785,
    lastUpdate: "Q4 2025",
    description: "NY cell phone numbers with owner info for SMS outreach",
    fields: [
      { name: "Cell Number", normalized: "cellPhone", type: "string", indexed: true },
      { name: "First Name", normalized: "firstName", type: "string", indexed: true },
      { name: "Last Name", normalized: "lastName", type: "string", indexed: true },
      { name: "Address", normalized: "address", type: "string", indexed: true },
      { name: "City", normalized: "city", type: "string" },
      { name: "State", normalized: "state", type: "string" },
      { name: "Zip Code", normalized: "zipCode", type: "string", indexed: true },
    ],
    storagePath: "datalake/phones/ny/",
    useCases: ["SMS campaigns", "phone verification", "skip trace matching"],
  },

  // NY Opt-in Email Database - 7.3M records
  ny_optin_email: {
    name: "New York Opt-In Email Database",
    source: "USBizData",
    totalRecords: 7297939,
    lastUpdate: "Q4 2025",
    description: "Consumer opt-in emails for email marketing campaigns",
    fields: [
      { name: "Email Address", normalized: "email", type: "string", indexed: true },
      { name: "First Name", normalized: "firstName", type: "string", indexed: true },
      { name: "Last Name", normalized: "lastName", type: "string", indexed: true },
      { name: "Street Address", normalized: "address", type: "string", indexed: true },
      { name: "City", normalized: "city", type: "string" },
      { name: "State", normalized: "state", type: "string" },
      { name: "Zip Code", normalized: "zipCode", type: "string", indexed: true },
      { name: "Phone Number", normalized: "phone", type: "string" },
      { name: "Opt-In IP", normalized: "optInIp", type: "string" },
    ],
    storagePath: "datalake/emails/ny/",
    useCases: ["email campaigns", "newsletter outreach", "valuation report delivery"],
  },

  // NY Business Database - 5.5M records
  ny_business: {
    name: "New York Business Database",
    source: "USBizData",
    totalRecords: 5514091,
    lastUpdate: "Q4 2025",
    description: "NY business contacts with company details, SIC codes, and revenue",
    fields: [
      { name: "Company Name", normalized: "companyName", type: "string", indexed: true },
      { name: "Contact Name", normalized: "contactName", type: "string", indexed: true },
      { name: "Email Address", normalized: "email", type: "string", indexed: true },
      { name: "Street Address", normalized: "address", type: "string", indexed: true },
      { name: "City", normalized: "city", type: "string" },
      { name: "State", normalized: "state", type: "string" },
      { name: "Zip Code", normalized: "zipCode", type: "string", indexed: true },
      { name: "County", normalized: "county", type: "string" },
      { name: "Area Code", normalized: "areaCode", type: "string" },
      { name: "Phone Number", normalized: "phone", type: "string", indexed: true },
      { name: "Website URL", normalized: "website", type: "string" },
      { name: "Number of Employees", normalized: "employeeCount", type: "number" },
      { name: "Annual Revenue", normalized: "annualRevenue", type: "number" },
      { name: "SIC Code", normalized: "sicCode", type: "string", indexed: true },
      { name: "SIC Description", normalized: "sicDescription", type: "string" },
    ],
    storagePath: "datalake/business/ny/",
    useCases: ["B2B outreach", "commercial property leads", "local business partnerships", "coupon partners"],
  },
};

// Local business partnership categories (for coupons/offers)
export const PARTNERSHIP_CATEGORIES = {
  home_services: {
    name: "Home Services",
    sicCodes: ["1711", "1721", "1731", "1751", "1761", "1771"], // Plumbing, HVAC, Electrical, etc.
    description: "Home improvement and maintenance services",
  },
  moving_storage: {
    name: "Moving & Storage",
    sicCodes: ["4212", "4213", "4214", "4225"],
    description: "Moving companies and storage facilities",
  },
  home_inspection: {
    name: "Home Inspection",
    sicCodes: ["8734", "7389"],
    description: "Home inspectors and appraisers",
  },
  mortgage_lending: {
    name: "Mortgage & Lending",
    sicCodes: ["6162", "6163", "6141"],
    description: "Mortgage brokers and lenders",
  },
  insurance: {
    name: "Insurance",
    sicCodes: ["6411", "6321", "6331"],
    description: "Home and property insurance",
  },
  landscaping: {
    name: "Landscaping",
    sicCodes: ["0782", "0781"],
    description: "Lawn care and landscaping services",
  },
  cleaning: {
    name: "Cleaning Services",
    sicCodes: ["7349", "7217"],
    description: "House cleaning and carpet cleaning",
  },
  pest_control: {
    name: "Pest Control",
    sicCodes: ["7342"],
    description: "Pest control and extermination",
  },
  legal: {
    name: "Legal Services",
    sicCodes: ["8111"],
    description: "Real estate attorneys",
  },
  title_escrow: {
    name: "Title & Escrow",
    sicCodes: ["6361", "6541"],
    description: "Title companies and escrow services",
  },
};

// GET - List all schemas and stats
export async function GET() {
  const schemas = Object.entries(DATA_LAKE_SCHEMAS).map(([key, schema]) => ({
    id: key,
    name: schema.name,
    source: schema.source,
    totalRecords: schema.totalRecords,
    lastUpdate: schema.lastUpdate,
    fieldCount: schema.fields.length,
    indexedFields: schema.fields.filter(f => f.indexed).length,
    storagePath: schema.storagePath,
    useCases: schema.useCases,
  }));

  const totalRecords = Object.values(DATA_LAKE_SCHEMAS).reduce(
    (sum, s) => sum + s.totalRecords, 0
  );

  return NextResponse.json({
    success: true,
    totalRecords,
    totalRecordsFormatted: sf(totalRecords),
    schemaCount: schemas.length,
    schemas,
    partnershipCategories: Object.entries(PARTNERSHIP_CATEGORIES).map(([key, cat]) => ({
      id: key,
      ...cat,
    })),
  });
}

// POST - Get detailed schema or query partners by category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, schemaId, category } = body;

    if (action === "getSchema" && schemaId) {
      const schema = DATA_LAKE_SCHEMAS[schemaId as keyof typeof DATA_LAKE_SCHEMAS];
      if (!schema) {
        return NextResponse.json({ error: "Schema not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, schema });
    }

    if (action === "getPartnerCategory" && category) {
      const cat = PARTNERSHIP_CATEGORIES[category as keyof typeof PARTNERSHIP_CATEGORIES];
      if (!cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        category: cat,
        queryHint: `SELECT * FROM ny_business WHERE sicCode IN (${cat.sicCodes.map(c => `'${c}'`).join(", ")})`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
