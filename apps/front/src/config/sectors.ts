/**
 * Sector-Based Workspace Configuration
 * Organizes leads, properties, and campaigns into targeted industry sectors
 */

import {
  Building2,
  Home,
  Landmark,
  Store,
  Briefcase,
  Factory,
  Truck,
  Utensils,
  Heart,
  GraduationCap,
  Scale,
  Stethoscope,
  Car,
  Plane,
  Ship,
  TreePine,
  Warehouse,
  Hotel,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  MapPin,
  RotateCcw,
} from "lucide-react";

// ============ SECTOR TYPES ============
export type SectorCategory =
  | "real_estate"
  | "business"
  | "financial"
  | "geographic";

export interface Sector {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: SectorCategory;
  icon: typeof Building2;
  color: string;
  bgColor: string;
  // Search filters to apply for this sector
  filters: Record<string, unknown>;
  // SIC codes for business matching (if applicable)
  sicCodes?: string[];
  // Property types for real estate matching
  propertyTypes?: string[];
  // Lead type flags
  leadTypes?: string[];
}

export interface SectorWorkspace {
  id: string;
  name: string;
  description: string;
  sectors: Sector[];
  icon: typeof Building2;
  color: string;
}

// ============ REAL ESTATE SECTORS ============
export const REAL_ESTATE_SECTORS: Sector[] = [
  {
    id: "residential_sfr",
    name: "Single Family Residential",
    shortName: "SFR",
    description: "Single family homes and townhouses",
    category: "real_estate",
    icon: Home,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    filters: { property_type: "SFR" },
    propertyTypes: ["SFR"],
  },
  {
    id: "residential_mfr",
    name: "Multi-Family Residential",
    shortName: "Multi-Family",
    description: "Duplexes, triplexes, apartment buildings",
    category: "real_estate",
    icon: Building2,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    filters: { property_type: "MFR" },
    propertyTypes: ["MFR"],
  },
  {
    id: "residential_condo",
    name: "Condominiums",
    shortName: "Condos",
    description: "Condos and co-ops",
    category: "real_estate",
    icon: Building2,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    filters: { property_type: "CONDO" },
    propertyTypes: ["CONDO"],
  },
  {
    id: "commercial",
    name: "Commercial Properties",
    shortName: "Commercial",
    description: "Office, retail, and commercial buildings",
    category: "real_estate",
    icon: Store,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    filters: { property_type: "OTHER", commercial: true },
    propertyTypes: ["OTHER"],
  },
  {
    id: "land",
    name: "Vacant Land",
    shortName: "Land",
    description: "Undeveloped land and lots",
    category: "real_estate",
    icon: TreePine,
    color: "text-green-600",
    bgColor: "bg-green-50",
    filters: { property_type: "LAND" },
    propertyTypes: ["LAND"],
  },
  {
    id: "mobile_homes",
    name: "Mobile Homes",
    shortName: "Mobile",
    description: "Mobile and manufactured homes",
    category: "real_estate",
    icon: Truck,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    filters: { property_type: "MOBILE" },
    propertyTypes: ["MOBILE"],
  },
];

// ============ FINANCIAL/DISTRESSED SECTORS ============
export const FINANCIAL_SECTORS: Sector[] = [
  {
    id: "pre_foreclosure",
    name: "Pre-Foreclosure",
    shortName: "Pre-FC",
    description: "Properties in pre-foreclosure status",
    category: "financial",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    filters: { pre_foreclosure: true },
    leadTypes: ["pre_foreclosure"],
  },
  {
    id: "foreclosure",
    name: "Foreclosure & REO",
    shortName: "Foreclosure",
    description: "Bank-owned and foreclosed properties",
    category: "financial",
    icon: AlertTriangle,
    color: "text-red-700",
    bgColor: "bg-red-50",
    filters: { foreclosure: true },
    leadTypes: ["foreclosure"],
  },
  {
    id: "tax_lien",
    name: "Tax Liens",
    shortName: "Tax Lien",
    description: "Properties with delinquent taxes",
    category: "financial",
    icon: DollarSign,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    filters: { tax_lien: true },
    leadTypes: ["tax_lien"],
  },
  {
    id: "reverse_mortgage",
    name: "Reverse Mortgages",
    shortName: "Reverse",
    description: "Properties with reverse mortgage loans",
    category: "financial",
    icon: RotateCcw,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    filters: { loan_type_code_first: "REV" },
    leadTypes: ["reverse_mortgage"],
  },
  {
    id: "high_equity",
    name: "High Equity",
    shortName: "High Equity",
    description: "Properties with 50%+ equity",
    category: "financial",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
    filters: { equity_percent_min: 50 },
    leadTypes: ["high_equity"],
  },
  {
    id: "free_clear",
    name: "Free & Clear",
    shortName: "Free & Clear",
    description: "Properties with no mortgage",
    category: "financial",
    icon: DollarSign,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    filters: { free_clear: true },
    leadTypes: ["free_clear"],
  },
  {
    id: "absentee_owner",
    name: "Absentee Owners",
    shortName: "Absentee",
    description: "Owner lives at different address",
    category: "financial",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    filters: { absentee_owner: true },
    leadTypes: ["absentee_owner"],
  },
  {
    id: "inherited_probate",
    name: "Inherited / Probate",
    shortName: "Probate",
    description: "Recently inherited properties",
    category: "financial",
    icon: Users,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    filters: { inherited: true },
    leadTypes: ["inherited"],
  },
];

// ============ BUSINESS SECTORS (SIC Code Based) ============
export const BUSINESS_SECTORS: Sector[] = [
  {
    id: "professional_services",
    name: "Professional Services",
    shortName: "Professional",
    description: "Law firms, accounting, consulting",
    category: "business",
    icon: Briefcase,
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    filters: {},
    sicCodes: ["8111", "8721", "8742", "8748"], // Legal, Accounting, Management Consulting
  },
  {
    id: "healthcare",
    name: "Healthcare & Medical",
    shortName: "Healthcare",
    description: "Doctors, clinics, medical services",
    category: "business",
    icon: Stethoscope,
    color: "text-red-500",
    bgColor: "bg-red-50",
    filters: {},
    sicCodes: [
      "8011",
      "8021",
      "8031",
      "8041",
      "8042",
      "8049",
      "8051",
      "8052",
      "8059",
      "8062",
      "8063",
      "8069",
    ],
  },
  {
    id: "restaurants_food",
    name: "Restaurants & Food Service",
    shortName: "Restaurants",
    description: "Restaurants, cafes, catering",
    category: "business",
    icon: Utensils,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    filters: {},
    sicCodes: ["5812", "5813", "5814"],
  },
  {
    id: "retail",
    name: "Retail & Stores",
    shortName: "Retail",
    description: "Retail shops and stores",
    category: "business",
    icon: Store,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    filters: {},
    sicCodes: ["52", "53", "54", "55", "56", "57", "58", "59"], // Retail trade divisions
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    shortName: "Manufacturing",
    description: "Factories and production facilities",
    category: "business",
    icon: Factory,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    filters: {},
    sicCodes: [
      "20",
      "21",
      "22",
      "23",
      "24",
      "25",
      "26",
      "27",
      "28",
      "29",
      "30",
      "31",
      "32",
      "33",
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
    ],
  },
  {
    id: "transportation",
    name: "Transportation & Logistics",
    shortName: "Transport",
    description: "Trucking, shipping, logistics",
    category: "business",
    icon: Truck,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    filters: {},
    sicCodes: ["40", "41", "42", "43", "44", "45", "46", "47"],
  },
  {
    id: "hospitality",
    name: "Hotels & Hospitality",
    shortName: "Hospitality",
    description: "Hotels, motels, lodging",
    category: "business",
    icon: Hotel,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    filters: {},
    sicCodes: ["7011", "7021", "7032", "7033", "7041"],
  },
  {
    id: "education",
    name: "Education & Training",
    shortName: "Education",
    description: "Schools, training centers",
    category: "business",
    icon: GraduationCap,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    filters: {},
    sicCodes: ["8211", "8221", "8222", "8231", "8243", "8244", "8249", "8299"],
  },
  {
    id: "automotive",
    name: "Automotive",
    shortName: "Auto",
    description: "Car dealers, repair shops, parts",
    category: "business",
    icon: Car,
    color: "text-zinc-600",
    bgColor: "bg-zinc-50",
    filters: {},
    sicCodes: [
      "5511",
      "5521",
      "5531",
      "5541",
      "5551",
      "5561",
      "5571",
      "5599",
      "7532",
      "7533",
      "7534",
      "7535",
      "7536",
      "7537",
      "7538",
      "7539",
    ],
  },
  {
    id: "financial_services",
    name: "Financial Services",
    shortName: "Finance",
    description: "Banks, insurance, investments",
    category: "business",
    icon: Landmark,
    color: "text-green-700",
    bgColor: "bg-green-50",
    filters: {},
    sicCodes: ["60", "61", "62", "63", "64", "65", "67"],
  },
  {
    id: "real_estate_biz",
    name: "Real Estate Businesses",
    shortName: "RE Biz",
    description: "Brokers, agents, property management",
    category: "business",
    icon: Building2,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    filters: {},
    sicCodes: [
      "6512",
      "6513",
      "6514",
      "6515",
      "6517",
      "6519",
      "6531",
      "6541",
      "6552",
      "6553",
    ],
  },
  {
    id: "construction",
    name: "Construction & Contractors",
    shortName: "Construction",
    description: "Builders, contractors, trades",
    category: "business",
    icon: Warehouse,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    filters: {},
    sicCodes: ["15", "16", "17"],
  },
];

// ============ GEOGRAPHIC SECTORS ============
export const GEOGRAPHIC_SECTORS: Sector[] = [
  {
    id: "ny_metro",
    name: "NYC Metro Area",
    shortName: "NYC Metro",
    description: "New York City and surrounding areas",
    category: "geographic",
    icon: MapPin,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    filters: {
      state: "NY",
      county: [
        "New York",
        "Kings",
        "Queens",
        "Bronx",
        "Richmond",
        "Nassau",
        "Suffolk",
        "Westchester",
      ],
    },
  },
  {
    id: "ny_upstate",
    name: "Upstate New York",
    shortName: "Upstate NY",
    description: "Buffalo, Rochester, Syracuse, Albany regions",
    category: "geographic",
    icon: MapPin,
    color: "text-green-600",
    bgColor: "bg-green-50",
    filters: { state: "NY" }, // Exclude metro counties
  },
  {
    id: "bronx",
    name: "Bronx County",
    shortName: "Bronx",
    description: "Bronx, NY properties",
    category: "geographic",
    icon: MapPin,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    filters: { state: "NY", county: "Bronx" },
  },
  {
    id: "brooklyn",
    name: "Brooklyn (Kings County)",
    shortName: "Brooklyn",
    description: "Brooklyn, NY properties",
    category: "geographic",
    icon: MapPin,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    filters: { state: "NY", county: "Kings" },
  },
  {
    id: "manhattan",
    name: "Manhattan (New York County)",
    shortName: "Manhattan",
    description: "Manhattan, NY properties",
    category: "geographic",
    icon: MapPin,
    color: "text-red-600",
    bgColor: "bg-red-50",
    filters: { state: "NY", county: "New York" },
  },
  {
    id: "queens",
    name: "Queens County",
    shortName: "Queens",
    description: "Queens, NY properties",
    category: "geographic",
    icon: MapPin,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    filters: { state: "NY", county: "Queens" },
  },
  {
    id: "staten_island",
    name: "Staten Island (Richmond County)",
    shortName: "Staten Island",
    description: "Staten Island, NY properties",
    category: "geographic",
    icon: MapPin,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    filters: { state: "NY", county: "Richmond" },
  },
];

// ============ WORKSPACE DEFINITIONS ============
export const SECTOR_WORKSPACES: SectorWorkspace[] = [
  {
    id: "real_estate",
    name: "Real Estate",
    description: "Property types and residential/commercial sectors",
    sectors: REAL_ESTATE_SECTORS,
    icon: Home,
    color: "text-blue-600",
  },
  {
    id: "financial",
    name: "Financial & Distressed",
    description: "Motivated sellers, distressed properties, equity plays",
    sectors: FINANCIAL_SECTORS,
    icon: DollarSign,
    color: "text-green-600",
  },
  {
    id: "business",
    name: "Business & B2B",
    description: "Industry-specific business sectors by SIC code",
    sectors: BUSINESS_SECTORS,
    icon: Briefcase,
    color: "text-slate-600",
  },
  {
    id: "geographic",
    name: "Geographic",
    description: "Location-based sectors and regions",
    sectors: GEOGRAPHIC_SECTORS,
    icon: MapPin,
    color: "text-purple-600",
  },
];

// ============ HELPER FUNCTIONS ============
export function getSectorById(sectorId: string): Sector | undefined {
  const allSectors = [
    ...REAL_ESTATE_SECTORS,
    ...FINANCIAL_SECTORS,
    ...BUSINESS_SECTORS,
    ...GEOGRAPHIC_SECTORS,
  ];
  return allSectors.find((s) => s.id === sectorId);
}

export function getSectorsByCategory(category: SectorCategory): Sector[] {
  switch (category) {
    case "real_estate":
      return REAL_ESTATE_SECTORS;
    case "financial":
      return FINANCIAL_SECTORS;
    case "business":
      return BUSINESS_SECTORS;
    case "geographic":
      return GEOGRAPHIC_SECTORS;
    default:
      return [];
  }
}

export function getWorkspaceById(
  workspaceId: string,
): SectorWorkspace | undefined {
  return SECTOR_WORKSPACES.find((w) => w.id === workspaceId);
}

export function getAllSectors(): Sector[] {
  return [
    ...REAL_ESTATE_SECTORS,
    ...FINANCIAL_SECTORS,
    ...BUSINESS_SECTORS,
    ...GEOGRAPHIC_SECTORS,
  ];
}

export function matchSectorBySIC(sicCode: string): Sector[] {
  return BUSINESS_SECTORS.filter((sector) =>
    sector.sicCodes?.some((code) => sicCode.startsWith(code)),
  );
}
