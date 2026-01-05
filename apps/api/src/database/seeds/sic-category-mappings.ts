/**
 * SIC CODE → CATEGORY MAPPINGS
 * ============================
 * Groups SIC codes into labeled categories.
 */

export interface SicCategoryMapping {
  slug: string;
  name: string;
  sicRanges: Array<{ start: string; end: string }>;
  sicPrefixes: string[];
  propertyOwnershipLikelihood: number; // 0-1: likelihood business owns property
}

export const SIC_CATEGORY_MAPPINGS: SicCategoryMapping[] = [
  {
    slug: "professional-services",
    name: "Professional Services",
    sicRanges: [
      { start: "8700", end: "8799" },
      { start: "8100", end: "8199" },
    ],
    sicPrefixes: ["87", "81"],
    propertyOwnershipLikelihood: 0.65,
  },
  {
    slug: "healthcare-medical",
    name: "Healthcare & Medical",
    sicRanges: [{ start: "8000", end: "8099" }],
    sicPrefixes: ["80"],
    propertyOwnershipLikelihood: 0.55,
  },
  {
    slug: "manufacturing",
    name: "Manufacturing & Industrial",
    sicRanges: [{ start: "2000", end: "3999" }],
    sicPrefixes: ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39"],
    propertyOwnershipLikelihood: 0.75,
  },
  {
    slug: "technology-software",
    name: "Technology & Software",
    sicRanges: [{ start: "7370", end: "7379" }],
    sicPrefixes: ["737"],
    propertyOwnershipLikelihood: 0.20,
  },
  {
    slug: "building-trades",
    name: "Building Trades & Construction",
    sicRanges: [{ start: "1500", end: "1799" }],
    sicPrefixes: ["15", "16", "17"],
    propertyOwnershipLikelihood: 0.40,
  },
  {
    slug: "distribution-wholesale",
    name: "Distribution & Wholesale",
    sicRanges: [
      { start: "5000", end: "5199" },
    ],
    sicPrefixes: ["50", "51"],
    propertyOwnershipLikelihood: 0.50,
  },
  {
    slug: "automotive-services",
    name: "Automotive Services",
    sicRanges: [
      { start: "7500", end: "7549" },
      { start: "5500", end: "5599" },
    ],
    sicPrefixes: ["75", "55"],
    propertyOwnershipLikelihood: 0.45,
  },
  {
    slug: "hospitality-food",
    name: "Hospitality & Food Service",
    sicRanges: [
      { start: "5800", end: "5899" },
      { start: "7000", end: "7099" },
    ],
    sicPrefixes: ["58", "70"],
    propertyOwnershipLikelihood: 0.30,
  },
  {
    slug: "retail-trade",
    name: "Retail Trade",
    sicRanges: [{ start: "5200", end: "5999" }],
    sicPrefixes: ["52", "53", "54", "56", "57", "59"],
    propertyOwnershipLikelihood: 0.35,
  },
  {
    slug: "personal-services",
    name: "Personal Services",
    sicRanges: [{ start: "7200", end: "7299" }],
    sicPrefixes: ["72"],
    propertyOwnershipLikelihood: 0.25,
  },
  {
    slug: "other-services",
    name: "Other Services",
    sicRanges: [
      { start: "0100", end: "0999" },
      { start: "4000", end: "4999" },
      { start: "6000", end: "6999" },
      { start: "9000", end: "9999" },
    ],
    sicPrefixes: [],
    propertyOwnershipLikelihood: 0.40,
  },
];

/**
 * Find category for a SIC code
 */
export function mapSicToCategory(sicCode: string): SicCategoryMapping | null {
  const code = sicCode.trim();

  // Check prefix match
  for (const category of SIC_CATEGORY_MAPPINGS) {
    for (const prefix of category.sicPrefixes) {
      if (code.startsWith(prefix)) {
        return category;
      }
    }
  }

  // Check numeric ranges
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

  return SIC_CATEGORY_MAPPINGS.find(c => c.slug === "other-services") || null;
}

/**
 * Group SIC codes by category
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
 * Get summary for grouped SIC codes
 */
export function getSicCategorySummary(
  grouped: Map<string, { category: SicCategoryMapping; codes: Array<{ code: string; count: number }> }>
): Array<{
  slug: string;
  name: string;
  totalCodes: number;
  totalRecords: number;
  propertyOwnershipLikelihood: number;
}> {
  const summary: Array<{
    slug: string;
    name: string;
    totalCodes: number;
    totalRecords: number;
    propertyOwnershipLikelihood: number;
  }> = [];

  for (const [slug, data] of grouped) {
    summary.push({
      slug,
      name: data.category.name,
      totalCodes: data.codes.length,
      totalRecords: data.codes.reduce((sum, c) => sum + c.count, 0),
      propertyOwnershipLikelihood: data.category.propertyOwnershipLikelihood,
    });
  }

  return summary.sort((a, b) => b.totalRecords - a.totalRecords);
}
