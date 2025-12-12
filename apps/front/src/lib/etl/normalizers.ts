/**
 * NEXTIER UNIFIED GRAPH ETL - Normalizers
 * Standardizes addresses, phones, emails, and names for entity resolution
 */

// Phone normalization: strip to digits only, handle country code
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  // Remove leading 1 for US numbers
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

// Email normalization: lowercase, trim, handle gmail dots
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  let normalized = email.toLowerCase().trim();

  // Handle Gmail dot-insensitivity (john.doe@gmail.com = johndoe@gmail.com)
  if (normalized.includes("@gmail.com")) {
    const [local, domain] = normalized.split("@");
    normalized = local.replace(/\./g, "") + "@" + domain;
  }

  return normalized;
}

// Address normalization: standardize street suffixes, remove unit numbers
export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return "";

  let normalized = address.toUpperCase().trim();

  // Street suffix standardization
  const suffixes: Record<string, string> = {
    STREET: "ST",
    AVENUE: "AVE",
    BOULEVARD: "BLVD",
    DRIVE: "DR",
    ROAD: "RD",
    LANE: "LN",
    COURT: "CT",
    PLACE: "PL",
    CIRCLE: "CIR",
    HIGHWAY: "HWY",
    PARKWAY: "PKWY",
    TERRACE: "TER",
    TRAIL: "TRL",
    WAY: "WAY",
  };

  for (const [full, abbrev] of Object.entries(suffixes)) {
    normalized = normalized.replace(new RegExp(`\\b${full}\\b`, "g"), abbrev);
  }

  // Direction standardization
  const directions: Record<string, string> = {
    NORTH: "N",
    SOUTH: "S",
    EAST: "E",
    WEST: "W",
    NORTHEAST: "NE",
    NORTHWEST: "NW",
    SOUTHEAST: "SE",
    SOUTHWEST: "SW",
  };

  for (const [full, abbrev] of Object.entries(directions)) {
    normalized = normalized.replace(new RegExp(`\\b${full}\\b`, "g"), abbrev);
  }

  // Remove unit/apt/suite numbers
  normalized = normalized.replace(
    /\b(UNIT|APT|APARTMENT|SUITE|STE|#)\s*\w+/g,
    "",
  );

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

// Name normalization: uppercase, remove titles, standardize suffixes
export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";

  let normalized = name.toUpperCase().trim();

  // Remove common titles
  const titles = ["MR", "MRS", "MS", "DR", "PROF", "REV", "HON"];
  for (const title of titles) {
    normalized = normalized.replace(new RegExp(`^${title}\\.?\\s+`, "i"), "");
  }

  // Standardize suffixes
  const suffixMap: Record<string, string> = {
    JUNIOR: "JR",
    SENIOR: "SR",
    SECOND: "II",
    THIRD: "III",
    FOURTH: "IV",
  };

  for (const [full, abbrev] of Object.entries(suffixMap)) {
    normalized = normalized.replace(new RegExp(`\\b${full}\\b`, "g"), abbrev);
  }

  return normalized.replace(/\s+/g, " ").trim();
}

// Company name normalization: remove legal suffixes, standardize
export function normalizeCompanyName(name: string | null | undefined): string {
  if (!name) return "";

  let normalized = name.toUpperCase().trim();

  // Remove legal suffixes
  const legalSuffixes = [
    "LLC",
    "L.L.C.",
    "L L C",
    "INC",
    "INC.",
    "INCORPORATED",
    "CORP",
    "CORP.",
    "CORPORATION",
    "CO",
    "CO.",
    "COMPANY",
    "LTD",
    "LTD.",
    "LIMITED",
    "LP",
    "L.P.",
    "LIMITED PARTNERSHIP",
    "LLP",
    "L.L.P.",
    "PC",
    "P.C.",
    "PROFESSIONAL CORPORATION",
    "PLLC",
    "P.L.L.C.",
  ];

  for (const suffix of legalSuffixes) {
    normalized = normalized.replace(
      new RegExp(`\\s*,?\\s*${suffix.replace(/\./g, "\\.")}$`, "i"),
      "",
    );
  }

  // Remove "THE" at start
  normalized = normalized.replace(/^THE\s+/i, "");

  // Remove punctuation
  normalized = normalized.replace(/[.,'"]/g, "");

  return normalized.replace(/\s+/g, " ").trim();
}

// SIC code normalization: ensure 4 digits
export function normalizeSIC(sic: string | number | null | undefined): string {
  if (sic == null) return "";
  const sicStr = String(sic).replace(/\D/g, "");
  return sicStr.padStart(4, "0").slice(0, 4);
}

// ZIP code normalization: 5 digits only
export function normalizeZip(zip: string | number | null | undefined): string {
  if (zip == null) return "";
  const zipStr = String(zip).replace(/\D/g, "");
  return zipStr.slice(0, 5).padStart(5, "0");
}

// State normalization: convert to 2-letter abbreviation
export function normalizeState(state: string | null | undefined): string {
  if (!state) return "";

  const stateMap: Record<string, string> = {
    ALABAMA: "AL",
    ALASKA: "AK",
    ARIZONA: "AZ",
    ARKANSAS: "AR",
    CALIFORNIA: "CA",
    COLORADO: "CO",
    CONNECTICUT: "CT",
    DELAWARE: "DE",
    FLORIDA: "FL",
    GEORGIA: "GA",
    HAWAII: "HI",
    IDAHO: "ID",
    ILLINOIS: "IL",
    INDIANA: "IN",
    IOWA: "IA",
    KANSAS: "KS",
    KENTUCKY: "KY",
    LOUISIANA: "LA",
    MAINE: "ME",
    MARYLAND: "MD",
    MASSACHUSETTS: "MA",
    MICHIGAN: "MI",
    MINNESOTA: "MN",
    MISSISSIPPI: "MS",
    MISSOURI: "MO",
    MONTANA: "MT",
    NEBRASKA: "NE",
    NEVADA: "NV",
    "NEW HAMPSHIRE": "NH",
    "NEW JERSEY": "NJ",
    "NEW MEXICO": "NM",
    "NEW YORK": "NY",
    "NORTH CAROLINA": "NC",
    "NORTH DAKOTA": "ND",
    OHIO: "OH",
    OKLAHOMA: "OK",
    OREGON: "OR",
    PENNSYLVANIA: "PA",
    "RHODE ISLAND": "RI",
    "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD",
    TENNESSEE: "TN",
    TEXAS: "TX",
    UTAH: "UT",
    VERMONT: "VT",
    VIRGINIA: "VA",
    WASHINGTON: "WA",
    "WEST VIRGINIA": "WV",
    WISCONSIN: "WI",
    WYOMING: "WY",
    "DISTRICT OF COLUMBIA": "DC",
  };

  const upper = state.toUpperCase().trim();
  return stateMap[upper] || (upper.length === 2 ? upper : "");
}
