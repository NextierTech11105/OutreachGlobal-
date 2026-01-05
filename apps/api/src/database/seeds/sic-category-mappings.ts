/**
 * SIC CODE → CATEGORY MAPPINGS
 * ============================
 * Auto-maps SIC codes to targeting categories based on prefix ranges.
 *
 * Categories optimized for business broker targeting ($1-50M revenue).
 */

export interface SicCategoryMapping {
  slug: string;
  name: string;
  sicRanges: Array<{ start: string; end: string }>;
  sicPrefixes: string[];
  propertyOwnershipLikelihood: number; // 0-1: likelihood owner also owns property
  avgDealValue: number;
  avgConversionRate: number;
  dollarPerMinute: number;
  priorityTier: "critical" | "high_intent" | "warm" | "scheduled" | "cold";
  valueTier: "premium" | "standard" | "volume" | "nurture";
}

/**
 * CATEGORY DEFINITIONS
 * Ordered by priority (highest value first)
 */
export const SIC_CATEGORY_MAPPINGS: SicCategoryMapping[] = [
  // === PREMIUM TIER ===
  {
    slug: "professional-services",
    name: "Professional Services",
    sicRanges: [
      { start: "8700", end: "8799" }, // Engineering, accounting, research
      { start: "8100", end: "8199" }, // Legal services
    ],
    sicPrefixes: ["8721", "8711", "8712", "8713", "8731", "8732", "8733", "8734", "8111", "8741", "8742", "8743", "8748"],
    propertyOwnershipLikelihood: 0.65,
    avgDealValue: 2500000,
    avgConversionRate: 0.08,
    dollarPerMinute: 12.5,
    priorityTier: "high_intent",
    valueTier: "premium",
  },
  {
    slug: "healthcare-medical",
    name: "Healthcare & Medical",
    sicRanges: [
      { start: "8000", end: "8099" }, // Health services
    ],
    sicPrefixes: ["8011", "8021", "8031", "8041", "8042", "8043", "8049", "8051", "8052", "8059", "8062", "8063", "8069", "8071", "8072", "8082", "8092", "8093", "8099"],
    propertyOwnershipLikelihood: 0.55,
    avgDealValue: 3000000,
    avgConversionRate: 0.06,
    dollarPerMinute: 10.0,
    priorityTier: "high_intent",
    valueTier: "premium",
  },
  {
    slug: "manufacturing",
    name: "Manufacturing & Industrial",
    sicRanges: [
      { start: "2000", end: "3999" }, // All manufacturing
    ],
    sicPrefixes: ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39"],
    propertyOwnershipLikelihood: 0.75,
    avgDealValue: 4000000,
    avgConversionRate: 0.05,
    dollarPerMinute: 8.5,
    priorityTier: "warm",
    valueTier: "premium",
  },

  // === STANDARD TIER ===
  {
    slug: "technology-software",
    name: "Technology & Software",
    sicRanges: [
      { start: "7370", end: "7379" }, // Computer services
    ],
    sicPrefixes: ["7371", "7372", "7373", "7374", "7375", "7376", "7377", "7378", "7379"],
    propertyOwnershipLikelihood: 0.20,
    avgDealValue: 5000000,
    avgConversionRate: 0.04,
    dollarPerMinute: 6.0,
    priorityTier: "warm",
    valueTier: "standard",
  },
  {
    slug: "building-trades",
    name: "Building Trades & Construction",
    sicRanges: [
      { start: "1500", end: "1799" }, // Construction
    ],
    sicPrefixes: ["15", "16", "17"],
    propertyOwnershipLikelihood: 0.40,
    avgDealValue: 2000000,
    avgConversionRate: 0.07,
    dollarPerMinute: 5.5,
    priorityTier: "warm",
    valueTier: "standard",
  },
  {
    slug: "distribution-wholesale",
    name: "Distribution & Wholesale",
    sicRanges: [
      { start: "5000", end: "5199" }, // Wholesale trade - durable
      { start: "5100", end: "5199" }, // Wholesale trade - nondurable
    ],
    sicPrefixes: ["50", "51"],
    propertyOwnershipLikelihood: 0.50,
    avgDealValue: 3500000,
    avgConversionRate: 0.05,
    dollarPerMinute: 5.0,
    priorityTier: "scheduled",
    valueTier: "standard",
  },
  {
    slug: "automotive-services",
    name: "Automotive Services",
    sicRanges: [
      { start: "7500", end: "7549" }, // Auto repair, services
      { start: "5500", end: "5599" }, // Auto dealers
    ],
    sicPrefixes: ["7532", "7533", "7534", "7536", "7537", "7538", "7539", "5511", "5521", "5531", "5541", "5551", "5561", "5571", "5599"],
    propertyOwnershipLikelihood: 0.45,
    avgDealValue: 1500000,
    avgConversionRate: 0.09,
    dollarPerMinute: 4.5,
    priorityTier: "scheduled",
    valueTier: "standard",
  },

  // === VOLUME TIER ===
  {
    slug: "hospitality-food",
    name: "Hospitality & Food Service",
    sicRanges: [
      { start: "5800", end: "5899" }, // Eating/drinking places
      { start: "7000", end: "7099" }, // Hotels/lodging
    ],
    sicPrefixes: ["5812", "5813", "7011", "7021", "7032", "7033", "7041"],
    propertyOwnershipLikelihood: 0.30,
    avgDealValue: 800000,
    avgConversionRate: 0.12,
    dollarPerMinute: 3.0,
    priorityTier: "cold",
    valueTier: "volume",
  },
  {
    slug: "retail-trade",
    name: "Retail Trade",
    sicRanges: [
      { start: "5200", end: "5999" }, // Retail trade (excluding auto/food)
    ],
    sicPrefixes: ["52", "53", "54", "55", "56", "57", "59"],
    propertyOwnershipLikelihood: 0.35,
    avgDealValue: 1000000,
    avgConversionRate: 0.08,
    dollarPerMinute: 2.5,
    priorityTier: "cold",
    valueTier: "volume",
  },
  {
    slug: "personal-services",
    name: "Personal Services",
    sicRanges: [
      { start: "7200", end: "7299" }, // Personal services
    ],
    sicPrefixes: ["7211", "7212", "7213", "7215", "7216", "7217", "7218", "7219", "7221", "7231", "7241", "7251", "7261"],
    propertyOwnershipLikelihood: 0.25,
    avgDealValue: 500000,
    avgConversionRate: 0.15,
    dollarPerMinute: 2.0,
    priorityTier: "cold",
    valueTier: "volume",
  },

  // === NURTURE TIER ===
  {
    slug: "other-services",
    name: "Other Services",
    sicRanges: [
      { start: "0100", end: "0999" }, // Agriculture
      { start: "4000", end: "4999" }, // Transportation/utilities
      { start: "6000", end: "6999" }, // Finance/insurance/real estate
      { start: "9000", end: "9999" }, // Public administration
    ],
    sicPrefixes: [],
    propertyOwnershipLikelihood: 0.40,
    avgDealValue: 1500000,
    avgConversionRate: 0.04,
    dollarPerMinute: 1.5,
    priorityTier: "cold",
    valueTier: "nurture",
  },
];

/**
 * Find category for a SIC code
 */
export function mapSicToCategory(sicCode: string): SicCategoryMapping | null {
  const code = sicCode.trim();

  // 1. Check exact prefix match first (most specific)
  for (const category of SIC_CATEGORY_MAPPINGS) {
    if (category.sicPrefixes.includes(code)) {
      return category;
    }
  }

  // 2. Check prefix starts-with (4-digit → 2-digit fallback)
  for (const category of SIC_CATEGORY_MAPPINGS) {
    for (const prefix of category.sicPrefixes) {
      if (code.startsWith(prefix) || prefix.startsWith(code.substring(0, 2))) {
        return category;
      }
    }
  }

  // 3. Check numeric ranges
  const codeNum = parseInt(code, 10);
  if (!isNaN(codeNum)) {
    for (const category of SIC_CATEGORY_MAPPINGS) {
      for (const range of category.sicRanges) {
        const start = parseInt(range.start, 10);
        const end = parseInt(range.end, 10);
        if (codeNum >= start && codeNum <= end) {
          return category;
        }
      }
    }
  }

  // 4. Default to "other-services"
  return SIC_CATEGORY_MAPPINGS.find(c => c.slug === "other-services") || null;
}

/**
 * Batch map multiple SIC codes
 */
export function mapSicCodesToCategories(
  sicCodes: Array<{ code: string; count: number; description?: string }>
): Map<string, { category: SicCategoryMapping; codes: Array<{ code: string; count: number; description?: string }> }> {
  const grouped = new Map<string, { category: SicCategoryMapping; codes: Array<{ code: string; count: number; description?: string }> }>();

  for (const item of sicCodes) {
    const category = mapSicToCategory(item.code);
    if (!category) continue;

    if (!grouped.has(category.slug)) {
      grouped.set(category.slug, { category, codes: [] });
    }
    grouped.get(category.slug)!.codes.push(item);
  }

  return grouped;
}

/**
 * Get summary stats for grouped SIC codes
 */
export function getSicCategorySummary(
  grouped: Map<string, { category: SicCategoryMapping; codes: Array<{ code: string; count: number }> }>
): Array<{
  slug: string;
  name: string;
  totalCodes: number;
  totalRecords: number;
  priorityTier: string;
  valueTier: string;
  dollarPerMinute: number;
  propertyOwnershipLikelihood: number;
}> {
  const summary: Array<{
    slug: string;
    name: string;
    totalCodes: number;
    totalRecords: number;
    priorityTier: string;
    valueTier: string;
    dollarPerMinute: number;
    propertyOwnershipLikelihood: number;
  }> = [];

  for (const [slug, data] of grouped) {
    summary.push({
      slug,
      name: data.category.name,
      totalCodes: data.codes.length,
      totalRecords: data.codes.reduce((sum, c) => sum + c.count, 0),
      priorityTier: data.category.priorityTier,
      valueTier: data.category.valueTier,
      dollarPerMinute: data.category.dollarPerMinute,
      propertyOwnershipLikelihood: data.category.propertyOwnershipLikelihood,
    });
  }

  // Sort by dollar per minute (highest first)
  return summary.sort((a, b) => b.dollarPerMinute - a.dollarPerMinute);
}
