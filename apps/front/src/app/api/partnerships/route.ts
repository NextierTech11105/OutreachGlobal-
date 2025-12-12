import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

// DigitalOcean Spaces configuration
const SPACES_ENDPOINT =
  process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com";
const SPACES_REGION = process.env.SPACES_REGION || "nyc3";
const SPACES_KEY = process.env.SPACES_KEY || process.env.DO_SPACES_KEY || "";
const SPACES_SECRET =
  process.env.SPACES_SECRET || process.env.DO_SPACES_SECRET || "";
const SPACES_BUCKET =
  process.env.SPACES_BUCKET || process.env.DO_SPACES_BUCKET || "nextier";

const s3Client = new S3Client({
  endpoint: SPACES_ENDPOINT,
  region: SPACES_REGION,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
  forcePathStyle: false,
});

const PARTNERSHIPS_PREFIX = "partnerships/";

// Partner categories with SIC codes for business matching
export const PARTNER_CATEGORIES = {
  home_services: {
    name: "Home Services",
    sicCodes: ["1711", "1721", "1731", "1751", "1761", "1771"],
    description: "Plumbing, HVAC, Electrical, Roofing",
    icon: "wrench",
  },
  moving_storage: {
    name: "Moving & Storage",
    sicCodes: ["4212", "4213", "4214", "4225"],
    description: "Moving companies and storage facilities",
    icon: "truck",
  },
  home_inspection: {
    name: "Home Inspection",
    sicCodes: ["8734", "7389"],
    description: "Home inspectors and appraisers",
    icon: "clipboard-check",
  },
  mortgage_lending: {
    name: "Mortgage & Lending",
    sicCodes: ["6162", "6163", "6141"],
    description: "Mortgage brokers and lenders",
    icon: "landmark",
  },
  insurance: {
    name: "Insurance",
    sicCodes: ["6411", "6321", "6331"],
    description: "Home and property insurance",
    icon: "shield",
  },
  landscaping: {
    name: "Landscaping",
    sicCodes: ["0782", "0781"],
    description: "Lawn care and landscaping",
    icon: "leaf",
  },
  cleaning: {
    name: "Cleaning Services",
    sicCodes: ["7349", "7217"],
    description: "House cleaning and carpet cleaning",
    icon: "sparkles",
  },
  pest_control: {
    name: "Pest Control",
    sicCodes: ["7342"],
    description: "Pest control and extermination",
    icon: "bug",
  },
  legal: {
    name: "Legal Services",
    sicCodes: ["8111"],
    description: "Real estate attorneys",
    icon: "scale",
  },
  title_escrow: {
    name: "Title & Escrow",
    sicCodes: ["6361", "6541"],
    description: "Title companies and escrow services",
    icon: "file-text",
  },
};

export interface PartnerOffer {
  id: string;
  businessId?: string;
  businessName: string;
  category: keyof typeof PARTNER_CATEGORIES;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  offer: string;
  discount: string;
  terms?: string;
  couponCode?: string;
  expiresAt: string;
  isActive: boolean;
  redemptions: number;
  maxRedemptions?: number;
  createdAt: string;
  updatedAt: string;
}

// In-memory partner offers (would be database in production)
const partnerOffers: PartnerOffer[] = [
  {
    id: "partner-1",
    businessName: "NYC Home Inspectors",
    category: "home_inspection",
    contactName: "Mike Thompson",
    email: "mike@nychomeinspectors.com",
    phone: "212-555-0101",
    address: "123 Inspector Lane",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    offer: "Free radon test with full home inspection",
    discount: "$150 value",
    terms: "Valid for new customers only. Must mention NexTier.",
    couponCode: "NEXTIER150",
    expiresAt: "2025-03-31",
    isActive: true,
    redemptions: 0,
    maxRedemptions: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "partner-2",
    businessName: "Metro Moving Co",
    category: "moving_storage",
    contactName: "Sarah Johnson",
    email: "sarah@metromovingco.com",
    phone: "718-555-0202",
    address: "456 Moving Ave",
    city: "Brooklyn",
    state: "NY",
    zipCode: "11201",
    offer: "10% off local moves + free packing supplies",
    discount: "Up to $500 savings",
    terms: "Minimum $1,000 move. Cannot combine with other offers.",
    couponCode: "NEXTIER10",
    expiresAt: "2025-06-30",
    isActive: true,
    redemptions: 12,
    maxRedemptions: 200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "partner-3",
    businessName: "Liberty Title Services",
    category: "title_escrow",
    contactName: "David Chen",
    email: "david@libertytitle.com",
    phone: "212-555-0303",
    address: "789 Title St",
    city: "Manhattan",
    state: "NY",
    zipCode: "10017",
    offer: "Free title search with closing services",
    discount: "$250 value",
    terms: "Must use Liberty Title for full closing services.",
    couponCode: "NEXTIER-TITLE",
    expiresAt: "2025-12-31",
    isActive: true,
    redemptions: 5,
    maxRedemptions: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "partner-4",
    businessName: "Green Lawn Landscaping",
    category: "landscaping",
    contactName: "Maria Garcia",
    email: "maria@greenlawnny.com",
    phone: "347-555-0404",
    address: "321 Garden Way",
    city: "Queens",
    state: "NY",
    zipCode: "11375",
    offer: "First lawn service FREE with seasonal contract",
    discount: "$75 value",
    terms: "New customers only. Seasonal contract required.",
    couponCode: "GREENFIRST",
    expiresAt: "2025-04-30",
    isActive: true,
    redemptions: 8,
    maxRedemptions: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// GET - List partner offers
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const activeOnly = searchParams.get("active") !== "false";
  const partnerId = searchParams.get("id");

  // Get specific partner
  if (partnerId) {
    const partner = partnerOffers.find((p) => p.id === partnerId);
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, partner });
  }

  // Filter offers
  let filtered = partnerOffers;

  if (category && category in PARTNER_CATEGORIES) {
    filtered = filtered.filter((p) => p.category === category);
  }

  if (activeOnly) {
    filtered = filtered.filter(
      (p) => p.isActive && new Date(p.expiresAt) > new Date(),
    );
  }

  return NextResponse.json({
    success: true,
    categories: Object.entries(PARTNER_CATEGORIES).map(([key, cat]) => ({
      id: key,
      ...cat,
      offerCount: partnerOffers.filter((p) => p.category === key && p.isActive)
        .length,
    })),
    offers: filtered,
    totalActive: partnerOffers.filter((p) => p.isActive).length,
  });
}

// POST - Create or update partner offer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Create new partner offer
    if (action === "create") {
      const {
        businessName,
        category,
        contactName,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        offer,
        discount,
        terms,
        couponCode,
        expiresAt,
        maxRedemptions,
      } = body;

      if (!businessName || !category || !offer || !discount) {
        return NextResponse.json(
          {
            error: "Required: businessName, category, offer, discount",
          },
          { status: 400 },
        );
      }

      const newOffer: PartnerOffer = {
        id: `partner-${Date.now()}`,
        businessName,
        category,
        contactName,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        offer,
        discount,
        terms,
        couponCode,
        expiresAt:
          expiresAt ||
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        isActive: true,
        redemptions: 0,
        maxRedemptions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      partnerOffers.push(newOffer);

      // Save to Spaces
      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: `${PARTNERSHIPS_PREFIX}offers/${newOffer.id}.json`,
            Body: JSON.stringify(newOffer),
            ContentType: "application/json",
          }),
        );
      } catch (err) {
        console.log("[Partnerships] Spaces save skipped:", err);
      }

      return NextResponse.json({ success: true, offer: newOffer });
    }

    // Record redemption
    if (action === "redeem") {
      const { partnerId, leadId, propertyAddress } = body;

      const partner = partnerOffers.find((p) => p.id === partnerId);
      if (!partner) {
        return NextResponse.json(
          { error: "Partner not found" },
          { status: 404 },
        );
      }

      if (!partner.isActive) {
        return NextResponse.json(
          { error: "Offer is no longer active" },
          { status: 400 },
        );
      }

      if (
        partner.maxRedemptions &&
        partner.redemptions >= partner.maxRedemptions
      ) {
        return NextResponse.json(
          { error: "Offer redemption limit reached" },
          { status: 400 },
        );
      }

      partner.redemptions++;
      partner.updatedAt = new Date().toISOString();

      // Log redemption
      const redemption = {
        id: `redeem-${Date.now()}`,
        partnerId,
        leadId,
        propertyAddress,
        couponCode: partner.couponCode,
        redeemedAt: new Date().toISOString(),
      };

      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: `${PARTNERSHIPS_PREFIX}redemptions/${redemption.id}.json`,
            Body: JSON.stringify(redemption),
            ContentType: "application/json",
          }),
        );
      } catch (err) {
        console.log("[Partnerships] Redemption log skipped:", err);
      }

      return NextResponse.json({
        success: true,
        partner,
        redemption,
        couponCode: partner.couponCode,
      });
    }

    // Toggle active status
    if (action === "toggle") {
      const { partnerId } = body;
      const partner = partnerOffers.find((p) => p.id === partnerId);

      if (!partner) {
        return NextResponse.json(
          { error: "Partner not found" },
          { status: 404 },
        );
      }

      partner.isActive = !partner.isActive;
      partner.updatedAt = new Date().toISOString();

      return NextResponse.json({ success: true, partner });
    }

    // Find potential partners from business database
    if (action === "findPartners") {
      const { category, city, zipCode } = body;

      if (!category || !(category in PARTNER_CATEGORIES)) {
        return NextResponse.json(
          { error: "Valid category required" },
          { status: 400 },
        );
      }

      const cat =
        PARTNER_CATEGORIES[category as keyof typeof PARTNER_CATEGORIES];

      // This would query the NY Business data lake
      // For now, return a hint about how to query
      return NextResponse.json({
        success: true,
        category: cat,
        queryHint: {
          description: "Query NY Business database for potential partners",
          sicCodes: cat.sicCodes,
          filters: { city, zipCode },
          endpoint: "/api/datalake/query",
          exampleQuery: {
            schema: "ny_business",
            where: {
              sicCode: { in: cat.sicCodes },
              ...(city && { city }),
              ...(zipCode && { zipCode }),
            },
            limit: 50,
          },
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Partnerships] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE - Remove partner offer
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  const index = partnerOffers.findIndex((p) => p.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  const removed = partnerOffers.splice(index, 1)[0];

  return NextResponse.json({ success: true, removed });
}
