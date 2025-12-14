/**
 * Address Matcher Utility
 * Fuzzy matching for property and business addresses
 * Used by cross-reference pipeline to find bundled deals
 */

// Standard address abbreviations
const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  STREET: "ST",
  AVENUE: "AVE",
  BOULEVARD: "BLVD",
  DRIVE: "DR",
  LANE: "LN",
  ROAD: "RD",
  PLACE: "PL",
  COURT: "CT",
  CIRCLE: "CIR",
  TERRACE: "TER",
  HIGHWAY: "HWY",
  PARKWAY: "PKWY",
  EXPRESSWAY: "EXPY",
  APARTMENT: "APT",
  SUITE: "STE",
  FLOOR: "FL",
  BUILDING: "BLDG",
  NORTH: "N",
  SOUTH: "S",
  EAST: "E",
  WEST: "W",
  NORTHEAST: "NE",
  NORTHWEST: "NW",
  SOUTHEAST: "SE",
  SOUTHWEST: "SW",
};

// Name suffixes to remove
const NAME_SUFFIXES = [
  "JR",
  "SR",
  "II",
  "III",
  "IV",
  "V",
  "ESQ",
  "PHD",
  "MD",
  "DDS",
  "DVM",
  "CPA",
  "LLC",
  "INC",
  "CORP",
  "LTD",
];

/**
 * Normalize an address for consistent matching
 */
export function normalizeAddress(address: string): string {
  if (!address) return "";

  // Uppercase and trim
  let normalized = address.toUpperCase().trim();

  // Apply standard abbreviations
  for (const [full, abbr] of Object.entries(ADDRESS_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${full}\\b\\.?`, "g");
    normalized = normalized.replace(regex, abbr);
  }

  // Remove punctuation except numbers
  normalized = normalized.replace(/[^\w\s]/g, "");

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Normalize a name for consistent matching
 */
export function normalizeName(name: string): string {
  if (!name) return "";

  // Uppercase and trim
  let normalized = name.toUpperCase().trim();

  // Remove suffixes
  for (const suffix of NAME_SUFFIXES) {
    const regex = new RegExp(`\\b${suffix}\\b\\.?`, "g");
    normalized = normalized.replace(regex, "");
  }

  // Remove punctuation
  normalized = normalized.replace(/[^\w\s]/g, "");

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Extract street number and name from address
 */
export function extractStreetParts(address: string): {
  number: string | null;
  street: string;
  unit: string | null;
} {
  const normalized = normalizeAddress(address);

  // Match: NUMBER STREET [APT/STE/UNIT #]
  const match = normalized.match(
    /^(\d+)\s+(.+?)(?:\s+(?:APT|STE|UNIT|FL)\s*(\S+))?$/,
  );

  if (match) {
    return {
      number: match[1],
      street: match[2].trim(),
      unit: match[3] || null,
    };
  }

  return {
    number: null,
    street: normalized,
    unit: null,
  };
}

/**
 * Calculate Jaccard similarity between two token sets
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate normalized Levenshtein similarity (0-1)
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * Calculate address similarity score (0-1)
 */
export function calculateAddressSimilarity(
  addr1: string,
  addr2: string,
): number {
  const n1 = normalizeAddress(addr1);
  const n2 = normalizeAddress(addr2);

  if (!n1 || !n2) return 0;

  // Exact match
  if (n1 === n2) return 1;

  // Extract parts
  const parts1 = extractStreetParts(n1);
  const parts2 = extractStreetParts(n2);

  // If both have street numbers, they must match
  if (parts1.number && parts2.number && parts1.number !== parts2.number) {
    return 0;
  }

  // Street name similarity
  const streetSim = levenshteinSimilarity(parts1.street, parts2.street);

  // Token-based similarity for additional confidence
  const tokens1 = new Set(n1.split(/\s+/));
  const tokens2 = new Set(n2.split(/\s+/));
  const tokenSim = jaccardSimilarity(tokens1, tokens2);

  // Combined score (weighted)
  let score = streetSim * 0.6 + tokenSim * 0.4;

  // Bonus if street numbers match
  if (parts1.number && parts2.number && parts1.number === parts2.number) {
    score = Math.min(1, score + 0.2);
  }

  return score;
}

/**
 * Calculate name similarity score (0-1)
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  if (!n1 || !n2) return 0;

  // Exact match
  if (n1 === n2) return 1;

  // Check containment (one name contains the other)
  if (n1.includes(n2) || n2.includes(n1)) {
    return 0.85;
  }

  // Token-based matching
  const tokens1 = new Set(n1.split(/\s+/));
  const tokens2 = new Set(n2.split(/\s+/));

  // Check for shared tokens (first name, last name)
  const sharedTokens = new Set([...tokens1].filter((t) => tokens2.has(t)));

  // If they share the same last name (last token), high similarity
  const lastToken1 = n1.split(/\s+/).pop() || "";
  const lastToken2 = n2.split(/\s+/).pop() || "";

  if (lastToken1 === lastToken2 && lastToken1.length > 2) {
    return 0.75 + jaccardSimilarity(tokens1, tokens2) * 0.25;
  }

  // General Jaccard similarity
  return jaccardSimilarity(tokens1, tokens2);
}

/**
 * Match a property with potential business matches
 */
export interface PropertyMatch {
  propertyId: string;
  propertyAddress: string;
  propertyOwner: string;
  businessId: string;
  businessName: string;
  businessContact: string;
  businessAddress: string;
  businessPhone?: string;
  businessEmail?: string;
  addressScore: number;
  nameScore: number;
  combinedScore: number;
  matchType: "address_name" | "address_only" | "name_only";
  isBundledDeal: boolean;
}

/**
 * Score and rank matches between a property and businesses
 */
export function scoreMatches(
  property: {
    id: string;
    address: string;
    ownerName: string;
  },
  businesses: Array<{
    id: string;
    companyName: string;
    contactName: string;
    address: string;
    phone?: string;
    email?: string;
  }>,
  threshold = 0.6,
): PropertyMatch[] {
  const matches: PropertyMatch[] = [];

  for (const biz of businesses) {
    const addressScore = calculateAddressSimilarity(
      property.address,
      biz.address,
    );
    const nameScore = calculateNameSimilarity(
      property.ownerName,
      biz.contactName,
    );

    // Combined score (address primary, name secondary)
    const combinedScore = addressScore * 0.6 + nameScore * 0.4;

    if (combinedScore >= threshold) {
      // Determine match type
      let matchType: "address_name" | "address_only" | "name_only";
      if (addressScore > 0.5 && nameScore > 0.5) {
        matchType = "address_name";
      } else if (addressScore > 0.5) {
        matchType = "address_only";
      } else {
        matchType = "name_only";
      }

      // Bundled deal = same person owns property AND business at that address
      const isBundledDeal = addressScore > 0.7 && nameScore > 0.7;

      matches.push({
        propertyId: property.id,
        propertyAddress: property.address,
        propertyOwner: property.ownerName,
        businessId: biz.id,
        businessName: biz.companyName,
        businessContact: biz.contactName,
        businessAddress: biz.address,
        businessPhone: biz.phone,
        businessEmail: biz.email,
        addressScore: Math.round(addressScore * 1000) / 1000,
        nameScore: Math.round(nameScore * 1000) / 1000,
        combinedScore: Math.round(combinedScore * 1000) / 1000,
        matchType,
        isBundledDeal,
      });
    }
  }

  // Sort by combined score descending
  matches.sort((a, b) => b.combinedScore - a.combinedScore);

  return matches;
}

export default {
  normalizeAddress,
  normalizeName,
  extractStreetParts,
  calculateAddressSimilarity,
  calculateNameSimilarity,
  scoreMatches,
};
