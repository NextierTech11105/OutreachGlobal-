/**
 * Property Use Code Categorization System
 * Organized for cross-referencing with B2B datalake (Apollo, LinkedIn, etc.)
 *
 * Each category maps to potential business types for skip tracing and outreach:
 * - Property owner (Real Estate investor/landlord)
 * - Business owner/operator (tenant or owner-occupant)
 * - Decision makers to target via Apollo/LinkedIn
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type PropertyCategory =
  | "RESIDENTIAL_SINGLE"
  | "RESIDENTIAL_MULTI"
  | "RESIDENTIAL_CONDO"
  | "RESIDENTIAL_MOBILE"
  | "RESIDENTIAL_LAND"
  | "COMMERCIAL_OFFICE"
  | "COMMERCIAL_RETAIL"
  | "COMMERCIAL_FOOD_BEVERAGE"
  | "COMMERCIAL_SERVICES"
  | "COMMERCIAL_LODGING"
  | "COMMERCIAL_MEDICAL"
  | "COMMERCIAL_AUTOMOTIVE"
  | "INDUSTRIAL_LIGHT"
  | "INDUSTRIAL_HEAVY"
  | "INDUSTRIAL_WAREHOUSE"
  | "AGRICULTURAL_FARM"
  | "AGRICULTURAL_RANCH"
  | "ENTERTAINMENT_LEISURE"
  | "EDUCATION"
  | "RELIGIOUS"
  | "GOVERNMENT"
  | "PARKING_TRANSIT"
  | "VACANT_LAND"
  | "SPECIAL_USE"
  | "UNKNOWN";

export interface PropertyUseCategory {
  id: PropertyCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color
  apolloIndustries: string[]; // Apollo industry filters for B2B enrichment
  decisionMakerTitles: string[]; // Titles to target on LinkedIn/Apollo
  codes: number[];
  tags: string[]; // Search tags for filtering
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTY USE CATEGORIES WITH B2B MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

export const PROPERTY_USE_CATEGORIES: PropertyUseCategory[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // RESIDENTIAL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "RESIDENTIAL_SINGLE",
    label: "Single Family Homes",
    description: "SFR, townhouses, patio homes - owner-occupants or landlords",
    icon: "Home",
    color: "blue",
    apolloIndustries: [
      "Real Estate",
      "Real Estate Investment",
      "Property Management",
    ],
    decisionMakerTitles: [
      "Owner",
      "Landlord",
      "Property Manager",
      "Real Estate Investor",
    ],
    codes: [376, 380, 382, 383, 385, 386, 377, 363, 384, 390, 423, 447, 452],
    tags: ["sfr", "single-family", "homeowner", "landlord", "residential"],
  },
  {
    id: "RESIDENTIAL_MULTI",
    label: "Multi-Family Properties",
    description:
      "Duplexes, triplexes, apartments - landlords and property managers",
    icon: "Building2",
    color: "indigo",
    apolloIndustries: [
      "Real Estate",
      "Property Management",
      "Apartment Management",
    ],
    decisionMakerTitles: [
      "Owner",
      "Property Manager",
      "Asset Manager",
      "Managing Partner",
      "Principal",
    ],
    codes: [
      357, 358, 359, 360, 361, 369, 372, 378, 381, 388, 362, 368, 370, 421, 461,
    ],
    tags: [
      "multi-family",
      "apartment",
      "duplex",
      "triplex",
      "landlord",
      "property-manager",
    ],
  },
  {
    id: "RESIDENTIAL_CONDO",
    label: "Condominiums",
    description: "Condos and co-ops - individual owners or investors",
    icon: "Building",
    color: "purple",
    apolloIndustries: ["Real Estate", "Real Estate Investment"],
    decisionMakerTitles: ["Owner", "HOA President", "Property Manager"],
    codes: [364, 366, 387, 1010, 1023, 1114, 1026],
    tags: ["condo", "condominium", "co-op", "hoa"],
  },
  {
    id: "RESIDENTIAL_MOBILE",
    label: "Mobile & Manufactured Homes",
    description: "Mobile homes, modular homes, trailer parks",
    icon: "Caravan",
    color: "amber",
    apolloIndustries: [
      "Real Estate",
      "Mobile Home Parks",
      "Manufactured Housing",
    ],
    decisionMakerTitles: ["Owner", "Park Manager", "Community Manager"],
    codes: [371, 373, 162],
    tags: ["mobile-home", "manufactured", "trailer-park", "modular"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMERCIAL - OFFICE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "COMMERCIAL_OFFICE",
    label: "Office Buildings",
    description: "Office buildings, professional buildings, medical offices",
    icon: "Briefcase",
    color: "slate",
    apolloIndustries: [
      "Commercial Real Estate",
      "Professional Services",
      "Legal Services",
      "Financial Services",
      "Insurance",
      "Consulting",
      "Accounting",
    ],
    decisionMakerTitles: [
      "Owner",
      "Managing Partner",
      "Office Manager",
      "Facilities Manager",
      "CEO",
      "COO",
      "CFO",
    ],
    codes: [136, 140, 169, 170, 171, 176, 177, 184, 139, 295, 301, 3013, 3015],
    tags: ["office", "professional", "commercial", "business"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMERCIAL - RETAIL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "COMMERCIAL_RETAIL",
    label: "Retail & Storefronts",
    description: "Stores, shopping centers, malls, convenience stores",
    icon: "Store",
    color: "pink",
    apolloIndustries: [
      "Retail",
      "Shopping Centers",
      "Consumer Goods",
      "Apparel",
      "Electronics",
      "Home Improvement",
    ],
    decisionMakerTitles: [
      "Owner",
      "Store Manager",
      "District Manager",
      "Regional Manager",
      "VP Retail",
      "Franchise Owner",
    ],
    codes: [
      124, 125, 137, 141, 143, 144, 145, 158, 167, 168, 178, 179, 183, 187, 188,
      194, 307, 459, 2062, 2063, 2064, 2065, 2066, 2067, 2068, 2069, 2070, 2071,
    ],
    tags: ["retail", "store", "shopping", "mall", "consumer", "franchise"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMERCIAL - FOOD & BEVERAGE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "COMMERCIAL_FOOD_BEVERAGE",
    label: "Restaurants & Food Service",
    description: "Restaurants, bars, cafes, bakeries, fast food",
    icon: "Utensils",
    color: "orange",
    apolloIndustries: [
      "Restaurants",
      "Food & Beverage",
      "Hospitality",
      "Quick Service Restaurants",
      "Bars & Nightclubs",
    ],
    decisionMakerTitles: [
      "Owner",
      "General Manager",
      "Restaurant Manager",
      "Executive Chef",
      "Franchise Owner",
      "Operations Manager",
    ],
    codes: [128, 129, 146, 148, 151, 166, 189, 449, 2013],
    tags: ["restaurant", "food", "bar", "cafe", "dining", "hospitality"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMERCIAL - SERVICES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "COMMERCIAL_SERVICES",
    label: "Service Businesses",
    description: "Auto repair, dry cleaners, salons, daycares, gyms",
    icon: "Wrench",
    color: "teal",
    apolloIndustries: [
      "Automotive",
      "Personal Services",
      "Child Care",
      "Pet Services",
      "Fitness",
      "Laundry Services",
    ],
    decisionMakerTitles: [
      "Owner",
      "Manager",
      "Director",
      "Franchise Owner",
      "Operations Manager",
    ],
    codes: [
      126, 147, 156, 157, 173, 175, 191, 192, 193, 296, 311, 412, 433, 458, 464,
      3014,
    ],
    tags: [
      "service",
      "automotive",
      "salon",
      "daycare",
      "gym",
      "laundry",
      "pet",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMERCIAL - LODGING
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "COMMERCIAL_LODGING",
    label: "Hotels & Lodging",
    description: "Hotels, motels, B&Bs, resorts",
    icon: "Bed",
    color: "violet",
    apolloIndustries: ["Hospitality", "Hotels", "Travel & Tourism", "Resorts"],
    decisionMakerTitles: [
      "Owner",
      "General Manager",
      "Hotel Manager",
      "Director of Operations",
      "Franchise Owner",
    ],
    codes: [131, 153, 154, 155, 163, 299],
    tags: ["hotel", "motel", "lodging", "hospitality", "resort", "bnb"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMERCIAL - MEDICAL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "COMMERCIAL_MEDICAL",
    label: "Medical & Healthcare",
    description: "Medical clinics, dental offices, hospitals, nursing homes",
    icon: "Stethoscope",
    color: "red",
    apolloIndustries: [
      "Healthcare",
      "Medical Practices",
      "Dental",
      "Senior Care",
      "Mental Health",
      "Veterinary",
    ],
    decisionMakerTitles: [
      "Owner",
      "Practice Manager",
      "Administrator",
      "Medical Director",
      "CEO",
      "Office Manager",
    ],
    codes: [142, 152, 302, 312, 339, 1115],
    tags: ["medical", "healthcare", "dental", "clinic", "hospital", "nursing"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMERCIAL - AUTOMOTIVE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "COMMERCIAL_AUTOMOTIVE",
    label: "Auto & Gas Stations",
    description: "Gas stations, car dealerships, auto repair, car washes",
    icon: "Car",
    color: "yellow",
    apolloIndustries: [
      "Automotive",
      "Gas Stations",
      "Car Dealerships",
      "Auto Services",
    ],
    decisionMakerTitles: [
      "Owner",
      "Dealer Principal",
      "General Manager",
      "Service Manager",
      "Operations Manager",
    ],
    codes: [127, 180, 185, 186, 190],
    tags: ["auto", "gas-station", "car-dealer", "car-wash", "automotive"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // INDUSTRIAL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "INDUSTRIAL_WAREHOUSE",
    label: "Warehouses & Storage",
    description: "Warehouses, distribution centers, self-storage, cold storage",
    icon: "Warehouse",
    color: "stone",
    apolloIndustries: [
      "Logistics",
      "Warehousing",
      "Distribution",
      "Self Storage",
      "Supply Chain",
    ],
    decisionMakerTitles: [
      "Owner",
      "Warehouse Manager",
      "Operations Director",
      "Logistics Manager",
      "Facility Manager",
    ],
    codes: [130, 202, 229, 238, 280, 448, 5022],
    tags: ["warehouse", "storage", "distribution", "logistics", "self-storage"],
  },
  {
    id: "INDUSTRIAL_LIGHT",
    label: "Light Industrial",
    description: "Manufacturing, assembly, R&D, flex space",
    icon: "Factory",
    color: "cyan",
    apolloIndustries: [
      "Manufacturing",
      "Industrial",
      "Technology",
      "Research & Development",
    ],
    decisionMakerTitles: [
      "Owner",
      "Plant Manager",
      "Operations Director",
      "VP Manufacturing",
      "Facility Manager",
    ],
    codes: [195, 201, 212, 213, 215, 216, 220, 224, 227, 231, 5021],
    tags: ["industrial", "manufacturing", "assembly", "r&d", "flex"],
  },
  {
    id: "INDUSTRIAL_HEAVY",
    label: "Heavy Industrial",
    description: "Heavy manufacturing, refineries, processing plants",
    icon: "Cog",
    color: "zinc",
    apolloIndustries: [
      "Heavy Industry",
      "Manufacturing",
      "Oil & Gas",
      "Chemicals",
      "Mining",
    ],
    decisionMakerTitles: [
      "Owner",
      "Plant Manager",
      "VP Operations",
      "Site Director",
      "General Manager",
    ],
    codes: [
      196, 197, 199, 203, 205, 206, 207, 208, 209, 210, 211, 218, 219, 221, 225,
      226, 228, 230, 232, 233, 234, 237, 240, 6003,
    ],
    tags: [
      "heavy-industrial",
      "manufacturing",
      "refinery",
      "processing",
      "mining",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AGRICULTURAL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "AGRICULTURAL_FARM",
    label: "Farms & Agriculture",
    description: "Farms, orchards, vineyards, crop land",
    icon: "Tractor",
    color: "green",
    apolloIndustries: ["Agriculture", "Farming", "Food Production", "Wineries"],
    decisionMakerTitles: [
      "Owner",
      "Farm Manager",
      "Operations Manager",
      "Winemaker",
    ],
    codes: [
      101, 103, 105, 106, 110, 111, 112, 118, 119, 120, 121, 239, 413, 446, 450,
      7004, 7014,
    ],
    tags: ["farm", "agriculture", "crops", "vineyard", "orchard"],
  },
  {
    id: "AGRICULTURAL_RANCH",
    label: "Ranches & Livestock",
    description: "Ranches, livestock, dairy, poultry",
    icon: "Beef",
    color: "amber",
    apolloIndustries: ["Agriculture", "Livestock", "Dairy", "Ranching"],
    decisionMakerTitles: ["Owner", "Ranch Manager", "Operations Manager"],
    codes: [104, 108, 109, 113, 114, 117, 466],
    tags: ["ranch", "livestock", "cattle", "dairy", "poultry"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ENTERTAINMENT & LEISURE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ENTERTAINMENT_LEISURE",
    label: "Entertainment & Recreation",
    description: "Theaters, gyms, golf courses, amusement parks, event venues",
    icon: "Drama",
    color: "fuchsia",
    apolloIndustries: [
      "Entertainment",
      "Sports & Recreation",
      "Events",
      "Golf",
      "Gaming",
    ],
    decisionMakerTitles: [
      "Owner",
      "General Manager",
      "Director",
      "Event Manager",
      "Operations Director",
    ],
    codes: [
      132, 259, 260, 261, 262, 263, 264, 267, 270, 279, 281, 285, 287, 290, 292,
      293, 303, 305, 316, 322, 326, 327, 331, 332, 334, 343, 346, 348, 350, 355,
      410, 4033, 4034,
    ],
    tags: [
      "entertainment",
      "recreation",
      "sports",
      "golf",
      "theater",
      "events",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // EDUCATION
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "EDUCATION",
    label: "Schools & Education",
    description: "Schools, colleges, universities, daycares",
    icon: "GraduationCap",
    color: "blue",
    apolloIndustries: ["Education", "Higher Education", "K-12", "Child Care"],
    decisionMakerTitles: [
      "Principal",
      "Superintendent",
      "President",
      "Dean",
      "Director",
      "Administrator",
    ],
    codes: [274, 328, 342, 352],
    tags: ["school", "education", "college", "university", "daycare"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // RELIGIOUS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "RELIGIOUS",
    label: "Religious Properties",
    description: "Churches, synagogues, temples, mosques",
    icon: "Church",
    color: "violet",
    apolloIndustries: ["Religious Organizations", "Non-Profit"],
    decisionMakerTitles: [
      "Pastor",
      "Rabbi",
      "Priest",
      "Imam",
      "Administrator",
      "Board Member",
    ],
    codes: [336],
    tags: ["church", "religious", "worship", "temple", "synagogue"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // GOVERNMENT & INSTITUTIONAL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "GOVERNMENT",
    label: "Government & Municipal",
    description: "Government buildings, public facilities, military",
    icon: "Landmark",
    color: "gray",
    apolloIndustries: ["Government", "Public Administration", "Military"],
    decisionMakerTitles: [
      "Administrator",
      "Director",
      "Manager",
      "Commissioner",
    ],
    codes: [
      271, 277, 278, 282, 283, 284, 286, 288, 289, 294, 314, 319, 320, 321, 325,
      333, 335, 338, 344, 354, 356, 8501, 9001, 9220,
    ],
    tags: ["government", "municipal", "public", "federal", "state", "military"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PARKING & TRANSIT
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "PARKING_TRANSIT",
    label: "Parking & Transportation",
    description: "Parking lots, garages, airports, bus terminals",
    icon: "ParkingSquare",
    color: "slate",
    apolloIndustries: ["Transportation", "Parking", "Aviation", "Logistics"],
    decisionMakerTitles: ["Owner", "Manager", "Director", "Operations Manager"],
    codes: [172, 174, 258, 265, 266, 291, 300, 323, 330, 349, 351, 418],
    tags: ["parking", "transit", "transportation", "airport", "logistics"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // VACANT LAND
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "VACANT_LAND",
    label: "Vacant Land",
    description: "Undeveloped land, lots, parcels",
    icon: "Map",
    color: "emerald",
    apolloIndustries: ["Real Estate", "Land Development", "Construction"],
    decisionMakerTitles: ["Owner", "Developer", "Land Manager", "Investor"],
    codes: [
      389, 391, 393, 394, 395, 396, 398, 399, 400, 401, 402, 403, 404, 406, 409,
      453, 462, 8008,
    ],
    tags: ["land", "vacant", "lot", "development", "undeveloped"],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SPECIAL USE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "SPECIAL_USE",
    label: "Special Use Properties",
    description: "Utilities, communications, rights-of-way, misc",
    icon: "Zap",
    color: "yellow",
    apolloIndustries: ["Utilities", "Telecommunications", "Energy"],
    decisionMakerTitles: ["Manager", "Director", "Superintendent"],
    codes: [
      102, 107, 115, 116, 122, 123, 133, 134, 135, 138, 159, 182, 198, 200, 204,
      235, 236, 241, 246, 248, 249, 250, 251, 252, 253, 255, 257, 268, 269, 272,
      273, 276, 297, 298, 304, 306, 308, 310, 315, 317, 318, 329, 337, 340, 345,
      347, 353, 407, 408, 411, 414, 415, 416, 417, 419, 420, 422, 425, 427, 429,
      431, 432, 434, 435, 436, 437, 438, 439, 440, 441, 444, 445, 451, 455, 456,
      457, 460, 463, 465,
    ],
    tags: ["utility", "communications", "special", "right-of-way"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get category by property use code
 */
export function getCategoryByCode(
  code: number,
): PropertyUseCategory | undefined {
  return PROPERTY_USE_CATEGORIES.find((cat) => cat.codes.includes(code));
}

/**
 * Get category by ID
 */
export function getCategoryById(
  id: PropertyCategory,
): PropertyUseCategory | undefined {
  return PROPERTY_USE_CATEGORIES.find((cat) => cat.id === id);
}

/**
 * Get all codes for a category
 */
export function getCodesByCategory(categoryId: PropertyCategory): number[] {
  const category = getCategoryById(categoryId);
  return category?.codes || [];
}

/**
 * Search categories by tag
 */
export function searchCategoriesByTag(tag: string): PropertyUseCategory[] {
  const lowerTag = tag.toLowerCase();
  return PROPERTY_USE_CATEGORIES.filter((cat) =>
    cat.tags.some((t) => t.includes(lowerTag)),
  );
}

/**
 * Get Apollo industries for a property use code
 */
export function getApolloIndustriesForCode(code: number): string[] {
  const category = getCategoryByCode(code);
  return category?.apolloIndustries || [];
}

/**
 * Get decision maker titles for a property use code
 */
export function getDecisionMakerTitlesForCode(code: number): string[] {
  const category = getCategoryByCode(code);
  return category?.decisionMakerTitles || [];
}

/**
 * Get categories for B2B outreach (commercial properties with businesses)
 */
export function getB2BCategories(): PropertyUseCategory[] {
  const b2bIds: PropertyCategory[] = [
    "COMMERCIAL_OFFICE",
    "COMMERCIAL_RETAIL",
    "COMMERCIAL_FOOD_BEVERAGE",
    "COMMERCIAL_SERVICES",
    "COMMERCIAL_LODGING",
    "COMMERCIAL_MEDICAL",
    "COMMERCIAL_AUTOMOTIVE",
    "INDUSTRIAL_WAREHOUSE",
    "INDUSTRIAL_LIGHT",
    "INDUSTRIAL_HEAVY",
    "ENTERTAINMENT_LEISURE",
  ];
  return PROPERTY_USE_CATEGORIES.filter((cat) => b2bIds.includes(cat.id));
}

/**
 * Get categories for real estate investor outreach
 */
export function getInvestorCategories(): PropertyUseCategory[] {
  const investorIds: PropertyCategory[] = [
    "RESIDENTIAL_SINGLE",
    "RESIDENTIAL_MULTI",
    "RESIDENTIAL_CONDO",
    "RESIDENTIAL_MOBILE",
    "VACANT_LAND",
  ];
  return PROPERTY_USE_CATEGORIES.filter((cat) => investorIds.includes(cat.id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE TO LABEL MAPPING (for UI display)
// ═══════════════════════════════════════════════════════════════════════════════

export const PROPERTY_USE_CODE_LABELS: Record<number, string> = {
  101: "Dairy Farm",
  103: "Farm, Crops",
  104: "Feedlots",
  105: "Farm (Irrigated or Dry)",
  106: "Horticulture, Ornamental",
  107: "Irrigation, Flood Control",
  108: "Livestock, Animals",
  109: "Ranch/Farm Fixtures",
  110: "Orchard (Fruit, Nut)",
  111: "Orchards, Groves",
  112: "Pasture",
  113: "Poultry Farm",
  114: "Ranch",
  117: "Range Land (Grazing)",
  118: "Agricultural/Rural",
  120: "Timberland, Forest",
  121: "Vineyard",
  122: "Well Site (Agricultural)",
  124: "Convenience Store",
  125: "Appliance Store",
  126: "Auto Repair, Garage",
  127: "Vehicle Sales/Rentals",
  128: "Bakery",
  129: "Bar, Tavern",
  130: "Commercial Building/Warehouse",
  131: "Bed & Breakfast",
  132: "Casino",
  136: "Commercial Office",
  137: "Convenience Store w/Fuel",
  140: "Store/Office Mixed Use",
  141: "Department Store",
  142: "Dental Building",
  144: "Home Improvement Store",
  145: "Drug Store, Pharmacy",
  146: "Drive-thru Restaurant",
  147: "Dry Cleaner",
  148: "Restaurant",
  151: "Grocery, Supermarket",
  152: "Hospital - Private",
  153: "Hotel/Motel",
  154: "Hotel-Resort",
  155: "Hotel",
  156: "Kennel",
  157: "Laundromat",
  158: "Liquor Store",
  162: "Mobile Home Park",
  163: "Motel",
  166: "Nightclub",
  167: "Shopping Center/Strip",
  168: "Nursery, Greenhouse, Florist",
  169: "Office Building",
  170: "Office Building (Multi-Story)",
  171: "Office/Residential Mixed",
  172: "Parking Garage",
  173: "Print Shop",
  174: "Parking Lot",
  175: "Day Care, Pre-School",
  176: "Professional Building",
  177: "Professional Building",
  178: "Retail Stores",
  179: "Shopping Mall",
  180: "Gas Station",
  183: "Mini-Mall",
  184: "Skyscraper/High-Rise",
  185: "Service Station w/Food",
  186: "Service Station",
  188: "Store, Retail",
  189: "Take-Out Restaurant",
  190: "Truck Stop",
  191: "Service Shop",
  192: "Veterinary",
  193: "Car Wash",
  194: "Wholesale/Discount",
  229: "Mini-Warehouse, Storage",
  238: "Warehouse, Storage",
  239: "Winery",
  296: "Gym, Health Spa",
  311: "Marina, Boat Slips",
  312: "Medical Clinic",
  357: "Garden Apt (5+ Units)",
  358: "High-Rise Apartments",
  359: "Apartment House (100+)",
  360: "Apartments (Generic)",
  361: "Apartment House (5+)",
  364: "Cluster Home",
  366: "Condominium",
  369: "Duplex",
  371: "Manufactured/Modular Home",
  372: "Multi-Family",
  373: "Mobile Home",
  376: "Patio Home",
  377: "PUD",
  378: "Quadplex",
  380: "Residential",
  381: "Residential Income",
  382: "Row House",
  383: "Rural Residence",
  384: "Seasonal/Vacation",
  385: "Single Family Residence",
  386: "Townhouse",
  388: "Triplex",
  389: "Vacant Land",
  390: "Zero Lot Line",
  401: "Residential Vacant Land",
  412: "Pet Boarding & Grooming",
  421: "Condo Building",
  423: "Barndominium",
  447: "Tiny House",
  448: "Residential Storage",
  449: "Roadside Market",
  452: "Garden Home",
  458: "Car Wash - Automated",
  459: "Cannabis Dispensary",
  461: "Cooperative Building",
  464: "Barber/Hair Salon",
};

/**
 * Get label for a property use code
 */
export function getCodeLabel(code: number): string {
  return PROPERTY_USE_CODE_LABELS[code] || `Code ${code}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK FILTERS FOR UI
// ═══════════════════════════════════════════════════════════════════════════════

export const QUICK_FILTERS = {
  // Real Estate Investor Targets
  "Multi-Family Landlords": getCodesByCategory("RESIDENTIAL_MULTI"),
  "SFR Landlords": getCodesByCategory("RESIDENTIAL_SINGLE"),
  "Mobile Home Parks": [162, 371, 373],
  "Land Developers": getCodesByCategory("VACANT_LAND"),

  // B2B Targets by Industry
  "Restaurants & Bars": [128, 129, 146, 148, 151, 166, 189, 449, 2013],
  "Hotels & Lodging": [131, 153, 154, 155, 163, 299],
  "Medical & Dental": [142, 152, 302, 312, 339, 1115],
  "Auto & Gas": [126, 127, 180, 185, 186, 190, 193, 433, 458],
  "Retail Stores": [
    124, 125, 137, 141, 143, 144, 145, 158, 167, 168, 178, 179, 183, 187, 188,
    194,
  ],
  Warehouses: [130, 202, 229, 238, 280],
  "Office Buildings": [136, 140, 169, 170, 171, 176, 177, 184, 139],

  // High-Value Targets
  "Shopping Centers": [167, 179, 183, 182],
  "Industrial Parks": [212, 213, 224],
  "Golf Courses": [290, 293],
  "Self Storage": [229, 448],
};
