// ==========================================
// SECTOR BUCKET IDs
// Exact bucket IDs for each subsector in the datalake
// Upload USBizData CSVs to these buckets for skip tracing
// ==========================================

// Bucket ID format: {state}-{sector}-{subsector}
// Example: ny-construction-contractors-plumbers

export interface SectorBucket {
  id: string;
  name: string;
  sector: string;
  subsector: string;
  sicCodes: string[];
  storagePath: string;
  description: string;
  state: string;
  tags?: string[]; // For favorites grouping
  propertyAssociated?: boolean; // Businesses tied to real estate
}

// ===== FAVORITES / STAR GROUPING =====
// Group buckets together for quick access and batch operations
export interface FavoriteGroup {
  id: string;
  name: string;
  description: string;
  bucketIds: string[];
  color?: string; // For UI display
  icon?: string; // Star, heart, flag, etc.
  createdAt?: string;
  updatedAt?: string;
}

// Pre-defined favorite groups for common use cases
export const DEFAULT_FAVORITE_GROUPS: FavoriteGroup[] = [
  {
    id: "property-associated",
    name: "Property-Associated Businesses",
    description: "Businesses directly tied to real estate - good for property data enrichment",
    color: "#10B981",
    icon: "building",
    bucketIds: [
      "ny-realestate-agents-brokers",
      "ny-realestate-property-mgmt",
      "ny-realestate-developers",
      "ny-realestate-appraisers",
      "ny-realestate-title-companies",
      "us-realestate-agents-brokers",
      "us-realestate-reits",
      "ny-finance-mortgage-brokers",
      "ny-construction-general-contractors",
      "us-hospitality-campgrounds-rv",
      "ny-hospitality-hotels",
      "us-transport-warehousing",
    ],
  },
  {
    id: "high-value-targets",
    name: "High-Value Acquisition Targets",
    description: "Businesses commonly acquired by PE/strategic buyers",
    color: "#8B5CF6",
    icon: "star",
    bucketIds: [
      "us-auto-car-wash",
      "us-personal-laundromats",
      "us-personal-funeral-homes",
      "us-transport-warehousing",
      "us-health-dentists",
      "us-construction-plumbers-hvac",
      "us-biz-janitorial",
    ],
  },
  {
    id: "skip-trace-priority",
    name: "Skip Trace Priority",
    description: "Sectors where skip tracing has highest ROI for outreach",
    color: "#F59E0B",
    icon: "phone",
    bucketIds: [
      "ny-construction-plumbers",
      "ny-construction-electricians",
      "ny-construction-roofers",
      "ny-auto-repair-shops",
      "ny-food-restaurants",
      "us-construction-plumbers-hvac",
    ],
  },
  {
    id: "local-services",
    name: "Local Services",
    description: "Hyper-local service businesses for geographic targeting",
    color: "#3B82F6",
    icon: "map-pin",
    bucketIds: [
      "ny-personal-salons",
      "ny-personal-barbershops",
      "ny-personal-dry-cleaners",
      "ny-personal-laundromats",
      "ny-food-pizzerias",
      "ny-food-delis",
      "ny-auto-car-wash",
    ],
  },
];

// ===== CONSTRUCTION & CONTRACTORS (SIC 15xx-17xx) =====
export const CONSTRUCTION_BUCKETS: SectorBucket[] = [
  {
    id: "ny-construction-general-contractors",
    name: "NY General Contractors",
    sector: "construction-contractors",
    subsector: "general-contractors",
    sicCodes: ["1521", "1522"],
    storagePath: "datalake/business/ny/sectors/construction-contractors/general-contractors/",
    description: "Residential & commercial general contractors",
    state: "NY",
  },
  {
    id: "ny-construction-commercial-builders",
    name: "NY Commercial Builders",
    sector: "construction-contractors",
    subsector: "commercial-builders",
    sicCodes: ["1541", "1542"],
    storagePath: "datalake/business/ny/sectors/construction-contractors/commercial-builders/",
    description: "Commercial & industrial building contractors",
    state: "NY",
  },
  {
    id: "ny-construction-plumbers",
    name: "NY Plumbers",
    sector: "construction-contractors",
    subsector: "plumbers",
    sicCodes: ["1711"],
    storagePath: "datalake/business/ny/sectors/construction-contractors/plumbers/",
    description: "Plumbing, Heating & Air Conditioning contractors (SIC 1711)",
    state: "NY",
  },
  {
    id: "ny-construction-hvac",
    name: "NY HVAC Contractors",
    sector: "construction-contractors",
    subsector: "hvac",
    sicCodes: ["1711"],
    storagePath: "datalake/business/ny/sectors/construction-contractors/hvac/",
    description: "HVAC & heating contractors (SIC 1711)",
    state: "NY",
  },
  {
    id: "ny-construction-electricians",
    name: "NY Electricians",
    sector: "construction-contractors",
    subsector: "electricians",
    sicCodes: ["1731"],
    storagePath: "datalake/business/ny/sectors/construction-contractors/electricians/",
    description: "Electrical contractors (SIC 1731)",
    state: "NY",
  },
  {
    id: "ny-construction-roofers",
    name: "NY Roofers",
    sector: "construction-contractors",
    subsector: "roofers",
    sicCodes: ["1761"],
    storagePath: "datalake/business/ny/sectors/construction-contractors/roofers/",
    description: "Roofing contractors (SIC 1761)",
    state: "NY",
  },
  {
    id: "ny-construction-painters",
    name: "NY Painters",
    sector: "construction-contractors",
    subsector: "painters",
    sicCodes: ["1721"],
    storagePath: "datalake/business/ny/sectors/construction-contractors/painters/",
    description: "Painting contractors (SIC 1721)",
    state: "NY",
  },
  {
    id: "ny-construction-carpenters",
    name: "NY Carpenters",
    sector: "construction-contractors",
    subsector: "carpenters",
    sicCodes: ["1751"],
    storagePath: "datalake/business/ny/sectors/construction-contractors/carpenters/",
    description: "Carpentry contractors (SIC 1751)",
    state: "NY",
  },
  {
    id: "ny-construction-masonry",
    name: "NY Masonry",
    sector: "construction-contractors",
    subsector: "masonry",
    sicCodes: ["1741"],
    storagePath: "datalake/business/ny/sectors/construction-contractors/masonry/",
    description: "Masonry contractors (SIC 1741)",
    state: "NY",
  },
  {
    id: "ny-construction-landscaping",
    name: "NY Landscaping",
    sector: "construction-contractors",
    subsector: "landscaping",
    sicCodes: ["0782"],
    storagePath: "datalake/business/ny/sectors/construction-contractors/landscaping/",
    description: "Landscaping services (SIC 0782)",
    state: "NY",
  },
];

// ===== TRANSPORTATION & LOGISTICS (SIC 40xx-47xx) =====
export const TRANSPORTATION_BUCKETS: SectorBucket[] = [
  {
    id: "ny-transport-trucking",
    name: "NY Trucking Companies",
    sector: "transportation-logistics",
    subsector: "trucking",
    sicCodes: ["4212", "4213", "4214"],
    storagePath: "datalake/business/ny/sectors/transportation-logistics/trucking/",
    description: "Trucking & freight companies",
    state: "NY",
  },
  {
    id: "ny-transport-moving",
    name: "NY Moving Companies",
    sector: "transportation-logistics",
    subsector: "moving",
    sicCodes: ["4212", "4214"],
    storagePath: "datalake/business/ny/sectors/transportation-logistics/moving/",
    description: "Moving & storage companies",
    state: "NY",
  },
  {
    id: "ny-transport-warehousing",
    name: "NY Warehousing",
    sector: "transportation-logistics",
    subsector: "warehousing",
    sicCodes: ["4225", "4226"],
    storagePath: "datalake/business/ny/sectors/transportation-logistics/warehousing/",
    description: "Warehousing & storage facilities",
    state: "NY",
  },
  {
    id: "ny-transport-freight",
    name: "NY Freight Forwarding",
    sector: "transportation-logistics",
    subsector: "freight",
    sicCodes: ["4731"],
    storagePath: "datalake/business/ny/sectors/transportation-logistics/freight/",
    description: "Freight forwarding & logistics",
    state: "NY",
  },
  {
    id: "ny-transport-courier",
    name: "NY Courier Services",
    sector: "transportation-logistics",
    subsector: "courier",
    sicCodes: ["4215"],
    storagePath: "datalake/business/ny/sectors/transportation-logistics/courier/",
    description: "Courier & delivery services",
    state: "NY",
  },
  {
    id: "ny-transport-taxis-limo",
    name: "NY Taxi & Limo",
    sector: "transportation-logistics",
    subsector: "taxis-limo",
    sicCodes: ["4121"],
    storagePath: "datalake/business/ny/sectors/transportation-logistics/taxis-limo/",
    description: "Taxi & limousine services",
    state: "NY",
  },
];

// ===== AUTOMOTIVE (SIC 55xx, 75xx) =====
export const AUTOMOTIVE_BUCKETS: SectorBucket[] = [
  {
    id: "ny-auto-dealers-new",
    name: "NY New Car Dealers",
    sector: "automotive",
    subsector: "dealers-new",
    sicCodes: ["5511"],
    storagePath: "datalake/business/ny/sectors/automotive/dealers-new/",
    description: "New car dealerships",
    state: "NY",
  },
  {
    id: "ny-auto-dealers-used",
    name: "NY Used Car Dealers",
    sector: "automotive",
    subsector: "dealers-used",
    sicCodes: ["5521"],
    storagePath: "datalake/business/ny/sectors/automotive/dealers-used/",
    description: "Used car dealerships",
    state: "NY",
  },
  {
    id: "ny-auto-repair-shops",
    name: "NY Auto Repair Shops",
    sector: "automotive",
    subsector: "repair-shops",
    sicCodes: ["7538"],
    storagePath: "datalake/business/ny/sectors/automotive/repair-shops/",
    description: "Auto repair & service shops",
    state: "NY",
  },
  {
    id: "ny-auto-body-shops",
    name: "NY Body Shops",
    sector: "automotive",
    subsector: "body-shops",
    sicCodes: ["7532"],
    storagePath: "datalake/business/ny/sectors/automotive/body-shops/",
    description: "Auto body & collision shops",
    state: "NY",
  },
  {
    id: "ny-auto-parts-stores",
    name: "NY Auto Parts",
    sector: "automotive",
    subsector: "parts-stores",
    sicCodes: ["5531"],
    storagePath: "datalake/business/ny/sectors/automotive/parts-stores/",
    description: "Auto parts stores",
    state: "NY",
  },
  {
    id: "ny-auto-tire-shops",
    name: "NY Tire Shops",
    sector: "automotive",
    subsector: "tire-shops",
    sicCodes: ["5531"],
    storagePath: "datalake/business/ny/sectors/automotive/tire-shops/",
    description: "Tire dealers & service",
    state: "NY",
  },
  {
    id: "ny-auto-car-wash",
    name: "NY Car Washes",
    sector: "automotive",
    subsector: "car-wash",
    sicCodes: ["7542"],
    storagePath: "datalake/business/ny/sectors/automotive/car-wash/",
    description: "Car wash & detail services",
    state: "NY",
  },
];

// ===== MANUFACTURING (SIC 20xx-39xx) =====
export const MANUFACTURING_BUCKETS: SectorBucket[] = [
  {
    id: "ny-mfg-food-processing",
    name: "NY Food Processing",
    sector: "manufacturing",
    subsector: "food-processing",
    sicCodes: ["2011", "2013", "2015", "2020"],
    storagePath: "datalake/business/ny/sectors/manufacturing/food-processing/",
    description: "Food manufacturing & processing",
    state: "NY",
  },
  {
    id: "ny-mfg-textiles",
    name: "NY Textiles",
    sector: "manufacturing",
    subsector: "textiles",
    sicCodes: ["2211", "2221", "2231"],
    storagePath: "datalake/business/ny/sectors/manufacturing/textiles/",
    description: "Textile mills & apparel manufacturing",
    state: "NY",
  },
  {
    id: "ny-mfg-printing",
    name: "NY Printing",
    sector: "manufacturing",
    subsector: "printing",
    sicCodes: ["2711", "2721", "2752"],
    storagePath: "datalake/business/ny/sectors/manufacturing/printing/",
    description: "Printing & publishing",
    state: "NY",
  },
  {
    id: "ny-mfg-chemicals",
    name: "NY Chemicals",
    sector: "manufacturing",
    subsector: "chemicals",
    sicCodes: ["2812", "2819", "2821"],
    storagePath: "datalake/business/ny/sectors/manufacturing/chemicals/",
    description: "Chemical products manufacturing",
    state: "NY",
  },
  {
    id: "ny-mfg-plastics",
    name: "NY Plastics",
    sector: "manufacturing",
    subsector: "plastics",
    sicCodes: ["3081", "3082", "3083"],
    storagePath: "datalake/business/ny/sectors/manufacturing/plastics/",
    description: "Plastics & rubber manufacturing",
    state: "NY",
  },
  {
    id: "ny-mfg-metals",
    name: "NY Metal Fabrication",
    sector: "manufacturing",
    subsector: "metals",
    sicCodes: ["3312", "3317", "3441"],
    storagePath: "datalake/business/ny/sectors/manufacturing/metals/",
    description: "Metal fabrication & steel works",
    state: "NY",
  },
  {
    id: "ny-mfg-machinery",
    name: "NY Machinery",
    sector: "manufacturing",
    subsector: "machinery",
    sicCodes: ["3531", "3532", "3533"],
    storagePath: "datalake/business/ny/sectors/manufacturing/machinery/",
    description: "Industrial machinery manufacturing",
    state: "NY",
  },
  {
    id: "ny-mfg-electronics",
    name: "NY Electronics Mfg",
    sector: "manufacturing",
    subsector: "electronics",
    sicCodes: ["3661", "3672", "3674"],
    storagePath: "datalake/business/ny/sectors/manufacturing/electronics/",
    description: "Electronics manufacturing",
    state: "NY",
  },
  {
    id: "ny-mfg-cement-concrete",
    name: "NY Cement & Concrete",
    sector: "manufacturing",
    subsector: "cement-concrete",
    sicCodes: ["3241", "3272", "3273"],
    storagePath: "datalake/business/ny/sectors/manufacturing/cement-concrete/",
    description: "Cement & concrete manufacturing",
    state: "NY",
  },
];

// ===== PROFESSIONAL SERVICES (SIC 81xx, 87xx) =====
export const PROFESSIONAL_BUCKETS: SectorBucket[] = [
  {
    id: "ny-prof-legal-services",
    name: "NY Legal Services",
    sector: "professional-services",
    subsector: "legal-services",
    sicCodes: ["8111"],
    storagePath: "datalake/business/ny/sectors/professional-services/legal-services/",
    description: "Law firms & attorneys",
    state: "NY",
  },
  {
    id: "ny-prof-accounting",
    name: "NY Accounting & CPA",
    sector: "professional-services",
    subsector: "accounting",
    sicCodes: ["8721"],
    storagePath: "datalake/business/ny/sectors/professional-services/accounting/",
    description: "CPAs & accounting firms",
    state: "NY",
  },
  {
    id: "ny-prof-consulting",
    name: "NY Consulting",
    sector: "professional-services",
    subsector: "consulting",
    sicCodes: ["8742"],
    storagePath: "datalake/business/ny/sectors/professional-services/consulting/",
    description: "Management consulting firms",
    state: "NY",
  },
  {
    id: "ny-prof-engineering",
    name: "NY Engineering",
    sector: "professional-services",
    subsector: "engineering",
    sicCodes: ["8711"],
    storagePath: "datalake/business/ny/sectors/professional-services/engineering/",
    description: "Engineering services",
    state: "NY",
  },
  {
    id: "ny-prof-architects",
    name: "NY Architects",
    sector: "professional-services",
    subsector: "architects",
    sicCodes: ["8712"],
    storagePath: "datalake/business/ny/sectors/professional-services/architects/",
    description: "Architectural firms",
    state: "NY",
  },
];

// ===== HEALTHCARE & MEDICAL (SIC 80xx) =====
export const HEALTHCARE_BUCKETS: SectorBucket[] = [
  {
    id: "ny-health-physicians",
    name: "NY Physicians",
    sector: "healthcare-medical",
    subsector: "physicians",
    sicCodes: ["8011"],
    storagePath: "datalake/business/ny/sectors/healthcare-medical/physicians/",
    description: "Doctors offices & clinics",
    state: "NY",
  },
  {
    id: "ny-health-dentists",
    name: "NY Dentists",
    sector: "healthcare-medical",
    subsector: "dentists",
    sicCodes: ["8021"],
    storagePath: "datalake/business/ny/sectors/healthcare-medical/dentists/",
    description: "Dental offices",
    state: "NY",
  },
  {
    id: "ny-health-chiropractors",
    name: "NY Chiropractors",
    sector: "healthcare-medical",
    subsector: "chiropractors",
    sicCodes: ["8041"],
    storagePath: "datalake/business/ny/sectors/healthcare-medical/chiropractors/",
    description: "Chiropractic offices",
    state: "NY",
  },
  {
    id: "ny-health-nursing-homes",
    name: "NY Nursing Homes",
    sector: "healthcare-medical",
    subsector: "nursing-homes",
    sicCodes: ["8051"],
    storagePath: "datalake/business/ny/sectors/healthcare-medical/nursing-homes/",
    description: "Skilled nursing facilities",
    state: "NY",
  },
  {
    id: "ny-health-home-health",
    name: "NY Home Health",
    sector: "healthcare-medical",
    subsector: "home-health",
    sicCodes: ["8082"],
    storagePath: "datalake/business/ny/sectors/healthcare-medical/home-health/",
    description: "Home health care agencies",
    state: "NY",
  },
  {
    id: "ny-health-medical-labs",
    name: "NY Medical Labs",
    sector: "healthcare-medical",
    subsector: "medical-labs",
    sicCodes: ["8071"],
    storagePath: "datalake/business/ny/sectors/healthcare-medical/medical-labs/",
    description: "Medical laboratories & diagnostics",
    state: "NY",
  },
];

// ===== RESTAURANTS & FOOD SERVICE (SIC 58xx) =====
export const RESTAURANT_BUCKETS: SectorBucket[] = [
  {
    id: "ny-food-restaurants",
    name: "NY Restaurants",
    sector: "restaurants-food",
    subsector: "restaurants",
    sicCodes: ["5812"],
    storagePath: "datalake/business/ny/sectors/restaurants-food/restaurants/",
    description: "Full-service restaurants",
    state: "NY",
  },
  {
    id: "ny-food-pizzerias",
    name: "NY Pizzerias",
    sector: "restaurants-food",
    subsector: "pizzerias",
    sicCodes: ["5812"],
    storagePath: "datalake/business/ny/sectors/restaurants-food/pizzerias/",
    description: "Pizza shops & pizzerias",
    state: "NY",
  },
  {
    id: "ny-food-fast-food",
    name: "NY Fast Food",
    sector: "restaurants-food",
    subsector: "fast-food",
    sicCodes: ["5812"],
    storagePath: "datalake/business/ny/sectors/restaurants-food/fast-food/",
    description: "Fast food restaurants",
    state: "NY",
  },
  {
    id: "ny-food-bars-taverns",
    name: "NY Bars & Taverns",
    sector: "restaurants-food",
    subsector: "bars-taverns",
    sicCodes: ["5813"],
    storagePath: "datalake/business/ny/sectors/restaurants-food/bars-taverns/",
    description: "Bars & drinking places",
    state: "NY",
  },
  {
    id: "ny-food-catering",
    name: "NY Catering",
    sector: "restaurants-food",
    subsector: "catering",
    sicCodes: ["5812"],
    storagePath: "datalake/business/ny/sectors/restaurants-food/catering/",
    description: "Caterers & event food service",
    state: "NY",
  },
  {
    id: "ny-food-bakeries",
    name: "NY Bakeries",
    sector: "restaurants-food",
    subsector: "bakeries",
    sicCodes: ["5461"],
    storagePath: "datalake/business/ny/sectors/restaurants-food/bakeries/",
    description: "Bakeries & pastry shops",
    state: "NY",
  },
  {
    id: "ny-food-delis",
    name: "NY Delis",
    sector: "restaurants-food",
    subsector: "delis",
    sicCodes: ["5812"],
    storagePath: "datalake/business/ny/sectors/restaurants-food/delis/",
    description: "Delis & sandwich shops",
    state: "NY",
  },
];

// ===== RETAIL STORES (SIC 52xx-59xx) =====
export const RETAIL_BUCKETS: SectorBucket[] = [
  {
    id: "ny-retail-grocery",
    name: "NY Grocery Stores",
    sector: "retail-stores",
    subsector: "grocery",
    sicCodes: ["5411"],
    storagePath: "datalake/business/ny/sectors/retail-stores/grocery/",
    description: "Grocery & supermarkets",
    state: "NY",
  },
  {
    id: "ny-retail-convenience",
    name: "NY Convenience Stores",
    sector: "retail-stores",
    subsector: "convenience",
    sicCodes: ["5411"],
    storagePath: "datalake/business/ny/sectors/retail-stores/convenience/",
    description: "Convenience stores & bodegas",
    state: "NY",
  },
  {
    id: "ny-retail-clothing",
    name: "NY Clothing Stores",
    sector: "retail-stores",
    subsector: "clothing",
    sicCodes: ["5611", "5621", "5651"],
    storagePath: "datalake/business/ny/sectors/retail-stores/clothing/",
    description: "Clothing & apparel stores",
    state: "NY",
  },
  {
    id: "ny-retail-hardware",
    name: "NY Hardware Stores",
    sector: "retail-stores",
    subsector: "hardware",
    sicCodes: ["5251"],
    storagePath: "datalake/business/ny/sectors/retail-stores/hardware/",
    description: "Hardware stores",
    state: "NY",
  },
  {
    id: "ny-retail-furniture",
    name: "NY Furniture Stores",
    sector: "retail-stores",
    subsector: "furniture",
    sicCodes: ["5712"],
    storagePath: "datalake/business/ny/sectors/retail-stores/furniture/",
    description: "Furniture stores",
    state: "NY",
  },
  {
    id: "ny-retail-electronics",
    name: "NY Electronics",
    sector: "retail-stores",
    subsector: "electronics",
    sicCodes: ["5731"],
    storagePath: "datalake/business/ny/sectors/retail-stores/electronics/",
    description: "Electronics stores",
    state: "NY",
  },
  {
    id: "ny-retail-pharmacies",
    name: "NY Pharmacies",
    sector: "retail-stores",
    subsector: "pharmacies",
    sicCodes: ["5912"],
    storagePath: "datalake/business/ny/sectors/retail-stores/pharmacies/",
    description: "Drug stores & pharmacies",
    state: "NY",
  },
];

// ===== HOTELS & HOSPITALITY (SIC 70xx) =====
export const HOSPITALITY_BUCKETS: SectorBucket[] = [
  {
    id: "ny-hospitality-hotels",
    name: "NY Hotels",
    sector: "hotels-hospitality",
    subsector: "hotels",
    sicCodes: ["7011"],
    storagePath: "datalake/business/ny/sectors/hotels-hospitality/hotels/",
    description: "Hotels & resorts",
    state: "NY",
  },
  {
    id: "ny-hospitality-motels",
    name: "NY Motels",
    sector: "hotels-hospitality",
    subsector: "motels",
    sicCodes: ["7011"],
    storagePath: "datalake/business/ny/sectors/hotels-hospitality/motels/",
    description: "Motels & motor lodges",
    state: "NY",
  },
  {
    id: "ny-hospitality-bed-breakfast",
    name: "NY B&Bs",
    sector: "hotels-hospitality",
    subsector: "bed-breakfast",
    sicCodes: ["7011"],
    storagePath: "datalake/business/ny/sectors/hotels-hospitality/bed-breakfast/",
    description: "Bed & breakfast establishments",
    state: "NY",
  },
  {
    id: "ny-hospitality-event-venues",
    name: "NY Event Venues",
    sector: "hotels-hospitality",
    subsector: "event-venues",
    sicCodes: ["7941"],
    storagePath: "datalake/business/ny/sectors/hotels-hospitality/event-venues/",
    description: "Event halls & venues",
    state: "NY",
  },
  {
    id: "us-hospitality-campgrounds-rv",
    name: "US Campgrounds & RV Parks",
    sector: "hotels-hospitality",
    subsector: "campgrounds-rv",
    sicCodes: ["7033"],
    storagePath: "datalake/business/us/sectors/hotels-hospitality/campgrounds-rv/",
    description: "Campgrounds & RV parks (SIC 7033) - 16,366 nationwide",
    state: "US",
  },
];

// ===== NATIONAL SECTOR BUCKETS (US-WIDE) =====
// For USBizData national purchases that aren't state-specific
export const NATIONAL_BUCKETS: SectorBucket[] = [
  {
    id: "us-construction-plumbers-hvac",
    name: "US Plumbing/Heating/AC Contractors",
    sector: "construction-contractors",
    subsector: "plumbers-hvac",
    sicCodes: ["1711"],
    storagePath: "datalake/business/us/sectors/construction-contractors/plumbers-hvac/",
    description: "US Plumbing, Heating & AC contractors (SIC 1711) - 338,605 nationwide",
    state: "US",
  },
  {
    id: "us-hospitality-campgrounds-rv",
    name: "US Campgrounds & RV Parks",
    sector: "hotels-hospitality",
    subsector: "campgrounds-rv",
    sicCodes: ["7033"],
    storagePath: "datalake/business/us/sectors/hotels-hospitality/campgrounds-rv/",
    description: "US Campgrounds & RV parks (SIC 7033) - 16,366 nationwide",
    state: "US",
  },
  {
    id: "us-transport-trucking",
    name: "US Trucking Companies",
    sector: "transportation-logistics",
    subsector: "trucking",
    sicCodes: ["4212", "4213", "4214"],
    storagePath: "datalake/business/us/sectors/transportation-logistics/trucking/",
    description: "US Trucking & freight companies - nationwide",
    state: "US",
  },
  {
    id: "us-auto-car-wash",
    name: "US Car Washes",
    sector: "automotive",
    subsector: "car-wash",
    sicCodes: ["7542"],
    storagePath: "datalake/business/us/sectors/automotive/car-wash/",
    description: "US Car wash & detail services - nationwide",
    state: "US",
  },
  {
    id: "us-personal-laundromats",
    name: "US Laundromats",
    sector: "personal-services",
    subsector: "laundromats",
    sicCodes: ["7215"],
    storagePath: "datalake/business/us/sectors/personal-services/laundromats/",
    description: "US Laundromats & coin laundries - nationwide",
    state: "US",
  },
  {
    id: "us-mfg-cement-concrete",
    name: "US Cement & Concrete",
    sector: "manufacturing",
    subsector: "cement-concrete",
    sicCodes: ["3241", "3272", "3273"],
    storagePath: "datalake/business/us/sectors/manufacturing/cement-concrete/",
    description: "US Cement & concrete manufacturers - nationwide",
    state: "US",
  },
  {
    id: "us-transport-warehousing",
    name: "US Warehousing & Storage",
    sector: "transportation-logistics",
    subsector: "warehousing",
    sicCodes: ["4225", "4226"],
    storagePath: "datalake/business/us/sectors/transportation-logistics/warehousing/",
    description: "US Warehousing & self-storage facilities - nationwide",
    state: "US",
  },
  {
    id: "us-personal-funeral-homes",
    name: "US Funeral Homes",
    sector: "personal-services",
    subsector: "funeral-homes",
    sicCodes: ["7261"],
    storagePath: "datalake/business/us/sectors/personal-services/funeral-homes/",
    description: "US Funeral homes & mortuaries - nationwide",
    state: "US",
  },
  {
    id: "us-food-bakeries",
    name: "US Retail Bakeries",
    sector: "restaurants-food",
    subsector: "bakeries",
    sicCodes: ["5461"],
    storagePath: "datalake/business/us/sectors/restaurants-food/bakeries/",
    description: "US Retail Bakeries (SIC 5461) - 65,905 nationwide",
    state: "US",
  },
  {
    id: "us-food-restaurants",
    name: "US Restaurants",
    sector: "restaurants-food",
    subsector: "restaurants",
    sicCodes: ["5812"],
    storagePath: "datalake/business/us/sectors/restaurants-food/restaurants/",
    description: "US Full-service restaurants - nationwide",
    state: "US",
  },
  {
    id: "us-food-bars-taverns",
    name: "US Bars & Taverns",
    sector: "restaurants-food",
    subsector: "bars-taverns",
    sicCodes: ["5813"],
    storagePath: "datalake/business/us/sectors/restaurants-food/bars-taverns/",
    description: "US Bars & drinking places - nationwide",
    state: "US",
  },
  {
    id: "us-health-physicians",
    name: "US Physicians",
    sector: "healthcare-medical",
    subsector: "physicians",
    sicCodes: ["8011"],
    storagePath: "datalake/business/us/sectors/healthcare-medical/physicians/",
    description: "US Doctors offices & clinics - nationwide",
    state: "US",
  },
  {
    id: "us-health-dentists",
    name: "US Dentists",
    sector: "healthcare-medical",
    subsector: "dentists",
    sicCodes: ["8021"],
    storagePath: "datalake/business/us/sectors/healthcare-medical/dentists/",
    description: "US Dental offices - nationwide",
    state: "US",
  },
  {
    id: "us-prof-legal-services",
    name: "US Legal Services",
    sector: "professional-services",
    subsector: "legal-services",
    sicCodes: ["8111"],
    storagePath: "datalake/business/us/sectors/professional-services/legal-services/",
    description: "US Law firms & attorneys - nationwide",
    state: "US",
  },
  {
    id: "us-auto-repair-shops",
    name: "US Auto Repair Shops",
    sector: "automotive",
    subsector: "repair-shops",
    sicCodes: ["7538"],
    storagePath: "datalake/business/us/sectors/automotive/repair-shops/",
    description: "US Auto repair & service shops - nationwide",
    state: "US",
  },
  {
    id: "us-retail-hardware",
    name: "US Hardware Stores",
    sector: "retail-stores",
    subsector: "hardware",
    sicCodes: ["5251"],
    storagePath: "datalake/business/us/sectors/retail-stores/hardware/",
    description: "US Hardware stores - nationwide",
    state: "US",
  },
  {
    id: "us-personal-salons",
    name: "US Hair Salons",
    sector: "personal-services",
    subsector: "salons",
    sicCodes: ["7231"],
    storagePath: "datalake/business/us/sectors/personal-services/salons/",
    description: "US Hair salons & beauty shops - nationwide",
    state: "US",
  },
  {
    id: "us-biz-janitorial",
    name: "US Janitorial Services",
    sector: "business-services",
    subsector: "janitorial",
    sicCodes: ["7349"],
    storagePath: "datalake/business/us/sectors/business-services/janitorial/",
    description: "US Janitorial & cleaning services - nationwide",
    state: "US",
  },
  {
    id: "us-rec-gyms",
    name: "US Gyms & Fitness",
    sector: "recreation-entertainment",
    subsector: "gyms",
    sicCodes: ["7991"],
    storagePath: "datalake/business/us/sectors/recreation-entertainment/gyms/",
    description: "US Gyms & fitness centers - nationwide",
    state: "US",
  },
  {
    id: "us-realestate-agents-brokers",
    name: "US RE Agents & Brokers",
    sector: "real-estate",
    subsector: "agents-brokers",
    sicCodes: ["6531"],
    storagePath: "datalake/business/us/sectors/real-estate/agents-brokers/",
    description: "US Real estate agents & brokers - 2,184,724 nationwide (SIC 6531)",
    state: "US",
    propertyAssociated: true,
    tags: ["real-estate", "agents", "brokers"],
  },
  {
    id: "us-finance-insurance-agents",
    name: "US Insurance Agents",
    sector: "financial-services",
    subsector: "insurance-agents",
    sicCodes: ["6411"],
    storagePath: "datalake/business/us/sectors/financial-services/insurance-agents/",
    description: "US Insurance agents & brokers - nationwide",
    state: "US",
  },
  {
    id: "us-realestate-reits",
    name: "US Real Estate Investment Trusts",
    sector: "real-estate",
    subsector: "reits",
    sicCodes: ["6798"],
    storagePath: "datalake/business/us/sectors/real-estate/reits/",
    description: "US REITs - 27,987 nationwide (SIC 6798)",
    state: "US",
    propertyAssociated: true,
    tags: ["investors", "real-estate", "institutional"],
  },
];

// ===== REAL ESTATE (SIC 65xx) =====
export const REAL_ESTATE_BUCKETS: SectorBucket[] = [
  {
    id: "ny-realestate-agents-brokers",
    name: "NY RE Agents & Brokers",
    sector: "real-estate",
    subsector: "agents-brokers",
    sicCodes: ["6531"],
    storagePath: "datalake/business/ny/sectors/real-estate/agents-brokers/",
    description: "Real estate agents & brokers",
    state: "NY",
  },
  {
    id: "ny-realestate-property-mgmt",
    name: "NY Property Management",
    sector: "real-estate",
    subsector: "property-mgmt",
    sicCodes: ["6531"],
    storagePath: "datalake/business/ny/sectors/real-estate/property-mgmt/",
    description: "Property management companies",
    state: "NY",
  },
  {
    id: "ny-realestate-developers",
    name: "NY Developers",
    sector: "real-estate",
    subsector: "developers",
    sicCodes: ["6552"],
    storagePath: "datalake/business/ny/sectors/real-estate/developers/",
    description: "Real estate developers",
    state: "NY",
  },
  {
    id: "ny-realestate-appraisers",
    name: "NY Appraisers",
    sector: "real-estate",
    subsector: "appraisers",
    sicCodes: ["6531"],
    storagePath: "datalake/business/ny/sectors/real-estate/appraisers/",
    description: "Real estate appraisers",
    state: "NY",
  },
  {
    id: "ny-realestate-title-companies",
    name: "NY Title Companies",
    sector: "real-estate",
    subsector: "title-companies",
    sicCodes: ["6361"],
    storagePath: "datalake/business/ny/sectors/real-estate/title-companies/",
    description: "Title & escrow companies",
    state: "NY",
  },
];

// ===== FINANCIAL SERVICES (SIC 60xx-67xx) =====
export const FINANCIAL_BUCKETS: SectorBucket[] = [
  {
    id: "ny-finance-banks",
    name: "NY Banks",
    sector: "financial-services",
    subsector: "banks",
    sicCodes: ["6021", "6022"],
    storagePath: "datalake/business/ny/sectors/financial-services/banks/",
    description: "Banks & banking",
    state: "NY",
  },
  {
    id: "ny-finance-credit-unions",
    name: "NY Credit Unions",
    sector: "financial-services",
    subsector: "credit-unions",
    sicCodes: ["6061"],
    storagePath: "datalake/business/ny/sectors/financial-services/credit-unions/",
    description: "Credit unions",
    state: "NY",
  },
  {
    id: "ny-finance-mortgage-brokers",
    name: "NY Mortgage Brokers",
    sector: "financial-services",
    subsector: "mortgage-brokers",
    sicCodes: ["6162"],
    storagePath: "datalake/business/ny/sectors/financial-services/mortgage-brokers/",
    description: "Mortgage brokers & lenders",
    state: "NY",
  },
  {
    id: "ny-finance-insurance-agents",
    name: "NY Insurance Agents",
    sector: "financial-services",
    subsector: "insurance-agents",
    sicCodes: ["6411"],
    storagePath: "datalake/business/ny/sectors/financial-services/insurance-agents/",
    description: "Insurance agents & brokers",
    state: "NY",
  },
  {
    id: "ny-finance-investment-advisors",
    name: "NY Investment Advisors",
    sector: "financial-services",
    subsector: "investment-advisors",
    sicCodes: ["6282"],
    storagePath: "datalake/business/ny/sectors/financial-services/investment-advisors/",
    description: "Investment advisors & wealth management",
    state: "NY",
  },
  {
    id: "ny-finance-tax-preparers",
    name: "NY Tax Preparers",
    sector: "financial-services",
    subsector: "tax-preparers",
    sicCodes: ["7291"],
    storagePath: "datalake/business/ny/sectors/financial-services/tax-preparers/",
    description: "Tax preparation services",
    state: "NY",
  },
];

// ===== PERSONAL SERVICES (SIC 72xx) =====
export const PERSONAL_SERVICES_BUCKETS: SectorBucket[] = [
  {
    id: "ny-personal-salons",
    name: "NY Hair Salons",
    sector: "personal-services",
    subsector: "salons",
    sicCodes: ["7231"],
    storagePath: "datalake/business/ny/sectors/personal-services/salons/",
    description: "Hair salons & beauty shops",
    state: "NY",
  },
  {
    id: "ny-personal-barbershops",
    name: "NY Barber Shops",
    sector: "personal-services",
    subsector: "barbershops",
    sicCodes: ["7241"],
    storagePath: "datalake/business/ny/sectors/personal-services/barbershops/",
    description: "Barber shops",
    state: "NY",
  },
  {
    id: "ny-personal-spas",
    name: "NY Day Spas",
    sector: "personal-services",
    subsector: "spas",
    sicCodes: ["7299"],
    storagePath: "datalake/business/ny/sectors/personal-services/spas/",
    description: "Day spas & wellness centers",
    state: "NY",
  },
  {
    id: "ny-personal-dry-cleaners",
    name: "NY Dry Cleaners",
    sector: "personal-services",
    subsector: "dry-cleaners",
    sicCodes: ["7216"],
    storagePath: "datalake/business/ny/sectors/personal-services/dry-cleaners/",
    description: "Dry cleaners",
    state: "NY",
  },
  {
    id: "ny-personal-laundromats",
    name: "NY Laundromats",
    sector: "personal-services",
    subsector: "laundromats",
    sicCodes: ["7215"],
    storagePath: "datalake/business/ny/sectors/personal-services/laundromats/",
    description: "Laundromats & coin laundries",
    state: "NY",
  },
  {
    id: "ny-personal-funeral-homes",
    name: "NY Funeral Homes",
    sector: "personal-services",
    subsector: "funeral-homes",
    sicCodes: ["7261"],
    storagePath: "datalake/business/ny/sectors/personal-services/funeral-homes/",
    description: "Funeral homes & mortuaries",
    state: "NY",
  },
];

// ===== BUSINESS SERVICES (SIC 73xx) =====
export const BUSINESS_SERVICES_BUCKETS: SectorBucket[] = [
  {
    id: "ny-biz-advertising",
    name: "NY Advertising",
    sector: "business-services",
    subsector: "advertising",
    sicCodes: ["7311"],
    storagePath: "datalake/business/ny/sectors/business-services/advertising/",
    description: "Advertising agencies",
    state: "NY",
  },
  {
    id: "ny-biz-staffing",
    name: "NY Staffing Agencies",
    sector: "business-services",
    subsector: "staffing",
    sicCodes: ["7361"],
    storagePath: "datalake/business/ny/sectors/business-services/staffing/",
    description: "Staffing & employment agencies",
    state: "NY",
  },
  {
    id: "ny-biz-janitorial",
    name: "NY Janitorial",
    sector: "business-services",
    subsector: "janitorial",
    sicCodes: ["7349"],
    storagePath: "datalake/business/ny/sectors/business-services/janitorial/",
    description: "Janitorial & cleaning services",
    state: "NY",
  },
  {
    id: "ny-biz-security",
    name: "NY Security Services",
    sector: "business-services",
    subsector: "security",
    sicCodes: ["7381", "7382"],
    storagePath: "datalake/business/ny/sectors/business-services/security/",
    description: "Security services & systems",
    state: "NY",
  },
  {
    id: "ny-biz-it-services",
    name: "NY IT Services",
    sector: "business-services",
    subsector: "it-services",
    sicCodes: ["7371", "7372", "7373", "7374", "7375", "7376", "7377", "7378", "7379"],
    storagePath: "datalake/business/ny/sectors/business-services/it-services/",
    description: "IT services & computer consulting",
    state: "NY",
  },
  {
    id: "ny-biz-printing",
    name: "NY Commercial Printing",
    sector: "business-services",
    subsector: "printing",
    sicCodes: ["2752"],
    storagePath: "datalake/business/ny/sectors/business-services/printing/",
    description: "Commercial printing services",
    state: "NY",
  },
];

// ===== EDUCATION & TRAINING (SIC 82xx) =====
export const EDUCATION_BUCKETS: SectorBucket[] = [
  {
    id: "ny-edu-private-schools",
    name: "NY Private Schools",
    sector: "education-training",
    subsector: "private-schools",
    sicCodes: ["8211"],
    storagePath: "datalake/business/ny/sectors/education-training/private-schools/",
    description: "Private K-12 schools",
    state: "NY",
  },
  {
    id: "ny-edu-colleges",
    name: "NY Colleges",
    sector: "education-training",
    subsector: "colleges",
    sicCodes: ["8221"],
    storagePath: "datalake/business/ny/sectors/education-training/colleges/",
    description: "Colleges & universities",
    state: "NY",
  },
  {
    id: "ny-edu-vocational",
    name: "NY Vocational Schools",
    sector: "education-training",
    subsector: "vocational",
    sicCodes: ["8249"],
    storagePath: "datalake/business/ny/sectors/education-training/vocational/",
    description: "Vocational & trade schools",
    state: "NY",
  },
  {
    id: "ny-edu-tutoring",
    name: "NY Tutoring",
    sector: "education-training",
    subsector: "tutoring",
    sicCodes: ["8299"],
    storagePath: "datalake/business/ny/sectors/education-training/tutoring/",
    description: "Tutoring services",
    state: "NY",
  },
  {
    id: "ny-edu-daycare",
    name: "NY Daycare",
    sector: "education-training",
    subsector: "daycare",
    sicCodes: ["8351"],
    storagePath: "datalake/business/ny/sectors/education-training/daycare/",
    description: "Child daycare centers",
    state: "NY",
  },
];

// ===== RECREATION & ENTERTAINMENT (SIC 79xx) =====
export const RECREATION_BUCKETS: SectorBucket[] = [
  {
    id: "ny-rec-gyms",
    name: "NY Gyms & Fitness",
    sector: "recreation-entertainment",
    subsector: "gyms",
    sicCodes: ["7991"],
    storagePath: "datalake/business/ny/sectors/recreation-entertainment/gyms/",
    description: "Gyms & fitness centers",
    state: "NY",
  },
  {
    id: "ny-rec-golf-courses",
    name: "NY Golf Courses",
    sector: "recreation-entertainment",
    subsector: "golf-courses",
    sicCodes: ["7992"],
    storagePath: "datalake/business/ny/sectors/recreation-entertainment/golf-courses/",
    description: "Golf courses & country clubs",
    state: "NY",
  },
  {
    id: "ny-rec-bowling",
    name: "NY Bowling Alleys",
    sector: "recreation-entertainment",
    subsector: "bowling",
    sicCodes: ["7933"],
    storagePath: "datalake/business/ny/sectors/recreation-entertainment/bowling/",
    description: "Bowling alleys",
    state: "NY",
  },
  {
    id: "ny-rec-theaters",
    name: "NY Movie Theaters",
    sector: "recreation-entertainment",
    subsector: "theaters",
    sicCodes: ["7832"],
    storagePath: "datalake/business/ny/sectors/recreation-entertainment/theaters/",
    description: "Movie theaters & cinemas",
    state: "NY",
  },
  {
    id: "ny-rec-amusement",
    name: "NY Amusement Parks",
    sector: "recreation-entertainment",
    subsector: "amusement",
    sicCodes: ["7996"],
    storagePath: "datalake/business/ny/sectors/recreation-entertainment/amusement/",
    description: "Amusement parks & attractions",
    state: "NY",
  },
];

// ===== BUSINESS BROKERS & PRIVATE EQUITY (SIC 67xx, 6282) =====
// Property-associated and M&A focused businesses
export const BUSINESS_BROKERS_PE_BUCKETS: SectorBucket[] = [
  {
    id: "us-biz-brokers",
    name: "US Business Brokers",
    sector: "business-brokers-pe",
    subsector: "business-brokers",
    sicCodes: ["6531", "6282"],
    storagePath: "datalake/business/us/sectors/business-brokers-pe/business-brokers/",
    description: "Business brokers & M&A intermediaries - nationwide",
    state: "US",
    propertyAssociated: true,
    tags: ["m&a", "acquisitions", "deal-flow"],
  },
  {
    id: "us-private-equity",
    name: "US Private Equity Firms",
    sector: "business-brokers-pe",
    subsector: "private-equity",
    sicCodes: ["6282", "6722"],
    storagePath: "datalake/business/us/sectors/business-brokers-pe/private-equity/",
    description: "Private equity & investment firms - nationwide",
    state: "US",
    tags: ["investors", "acquisitions", "capital"],
  },
  {
    id: "us-venture-capital",
    name: "US Venture Capital",
    sector: "business-brokers-pe",
    subsector: "venture-capital",
    sicCodes: ["6282", "6722"],
    storagePath: "datalake/business/us/sectors/business-brokers-pe/venture-capital/",
    description: "Venture capital firms - nationwide",
    state: "US",
    tags: ["investors", "startups", "capital"],
  },
  {
    id: "us-mna-advisors",
    name: "US M&A Advisory",
    sector: "business-brokers-pe",
    subsector: "mna-advisors",
    sicCodes: ["6282", "8742"],
    storagePath: "datalake/business/us/sectors/business-brokers-pe/mna-advisors/",
    description: "M&A advisors & investment bankers - nationwide",
    state: "US",
    tags: ["m&a", "investment-banking", "deals"],
  },
  {
    id: "us-family-offices",
    name: "US Family Offices",
    sector: "business-brokers-pe",
    subsector: "family-offices",
    sicCodes: ["6282", "6722"],
    storagePath: "datalake/business/us/sectors/business-brokers-pe/family-offices/",
    description: "Family offices & wealth management - nationwide",
    state: "US",
    tags: ["investors", "capital", "wealth"],
  },
  {
    id: "ny-biz-brokers",
    name: "NY Business Brokers",
    sector: "business-brokers-pe",
    subsector: "business-brokers",
    sicCodes: ["6531", "6282"],
    storagePath: "datalake/business/ny/sectors/business-brokers-pe/business-brokers/",
    description: "NY Business brokers & M&A intermediaries",
    state: "NY",
    propertyAssociated: true,
    tags: ["m&a", "acquisitions", "deal-flow"],
  },
  {
    id: "ny-private-equity",
    name: "NY Private Equity Firms",
    sector: "business-brokers-pe",
    subsector: "private-equity",
    sicCodes: ["6282", "6722"],
    storagePath: "datalake/business/ny/sectors/business-brokers-pe/private-equity/",
    description: "NY Private equity & investment firms",
    state: "NY",
    tags: ["investors", "acquisitions", "capital"],
  },
];

// ===== PROPERTY-ASSOCIATED BUSINESSES =====
// Businesses tied to real estate for RealEstateAPI enrichment
export const PROPERTY_ASSOCIATED_BUCKETS: SectorBucket[] = [
  {
    id: "us-commercial-landlords",
    name: "US Commercial Landlords",
    sector: "property-associated",
    subsector: "commercial-landlords",
    sicCodes: ["6512"],
    storagePath: "datalake/business/us/sectors/property-associated/commercial-landlords/",
    description: "Commercial building operators & landlords - nationwide",
    state: "US",
    propertyAssociated: true,
    tags: ["real-estate", "landlords", "commercial"],
  },
  {
    id: "us-residential-landlords",
    name: "US Residential Landlords",
    sector: "property-associated",
    subsector: "residential-landlords",
    sicCodes: ["6513"],
    storagePath: "datalake/business/us/sectors/property-associated/residential-landlords/",
    description: "Apartment building operators - nationwide",
    state: "US",
    propertyAssociated: true,
    tags: ["real-estate", "landlords", "residential", "multifamily"],
  },
  {
    id: "us-self-storage",
    name: "US Self Storage Facilities",
    sector: "property-associated",
    subsector: "self-storage",
    sicCodes: ["4225"],
    storagePath: "datalake/business/us/sectors/property-associated/self-storage/",
    description: "Self storage facilities - nationwide",
    state: "US",
    propertyAssociated: true,
    tags: ["real-estate", "storage", "property"],
  },
  {
    id: "us-mobile-home-parks",
    name: "US Mobile Home Parks",
    sector: "property-associated",
    subsector: "mobile-home-parks",
    sicCodes: ["6515"],
    storagePath: "datalake/business/us/sectors/property-associated/mobile-home-parks/",
    description: "Mobile home parks & manufactured housing - nationwide",
    state: "US",
    propertyAssociated: true,
    tags: ["real-estate", "housing", "property"],
  },
  {
    id: "us-parking-facilities",
    name: "US Parking Facilities",
    sector: "property-associated",
    subsector: "parking",
    sicCodes: ["7521"],
    storagePath: "datalake/business/us/sectors/property-associated/parking/",
    description: "Parking lots & garages - nationwide",
    state: "US",
    propertyAssociated: true,
    tags: ["real-estate", "parking", "property"],
  },
  {
    id: "us-shopping-centers",
    name: "US Shopping Centers",
    sector: "property-associated",
    subsector: "shopping-centers",
    sicCodes: ["6512"],
    storagePath: "datalake/business/us/sectors/property-associated/shopping-centers/",
    description: "Shopping centers & retail property operators - nationwide",
    state: "US",
    propertyAssociated: true,
    tags: ["real-estate", "retail", "commercial"],
  },
  {
    id: "us-industrial-parks",
    name: "US Industrial Parks",
    sector: "property-associated",
    subsector: "industrial-parks",
    sicCodes: ["6512", "6552"],
    storagePath: "datalake/business/us/sectors/property-associated/industrial-parks/",
    description: "Industrial park operators & developers - nationwide",
    state: "US",
    propertyAssociated: true,
    tags: ["real-estate", "industrial", "property"],
  },
];

// ===== ALL BUCKETS COMBINED =====
export const ALL_SECTOR_BUCKETS: SectorBucket[] = [
  ...CONSTRUCTION_BUCKETS,
  ...TRANSPORTATION_BUCKETS,
  ...AUTOMOTIVE_BUCKETS,
  ...MANUFACTURING_BUCKETS,
  ...PROFESSIONAL_BUCKETS,
  ...HEALTHCARE_BUCKETS,
  ...RESTAURANT_BUCKETS,
  ...RETAIL_BUCKETS,
  ...HOSPITALITY_BUCKETS,
  ...REAL_ESTATE_BUCKETS,
  ...FINANCIAL_BUCKETS,
  ...PERSONAL_SERVICES_BUCKETS,
  ...BUSINESS_SERVICES_BUCKETS,
  ...EDUCATION_BUCKETS,
  ...RECREATION_BUCKETS,
  ...BUSINESS_BROKERS_PE_BUCKETS,
  ...PROPERTY_ASSOCIATED_BUCKETS,
  ...NATIONAL_BUCKETS,
];

// ===== BUCKET LOOKUP BY ID =====
export const BUCKET_BY_ID: Record<string, SectorBucket> = ALL_SECTOR_BUCKETS.reduce(
  (acc, bucket) => {
    acc[bucket.id] = bucket;
    return acc;
  },
  {} as Record<string, SectorBucket>
);

// ===== BUCKET LOOKUP BY SIC CODE =====
export const BUCKETS_BY_SIC: Record<string, SectorBucket[]> = ALL_SECTOR_BUCKETS.reduce(
  (acc, bucket) => {
    bucket.sicCodes.forEach((sic) => {
      if (!acc[sic]) acc[sic] = [];
      acc[sic].push(bucket);
    });
    return acc;
  },
  {} as Record<string, SectorBucket[]>
);

// ===== HELPER: Get bucket ID for a SIC code =====
export function getBucketForSIC(sicCode: string): SectorBucket | null {
  // Try exact match first
  if (BUCKETS_BY_SIC[sicCode]?.[0]) {
    return BUCKETS_BY_SIC[sicCode][0];
  }

  // Try prefix match (e.g., "1711" matches "17" prefix)
  for (let i = sicCode.length; i >= 2; i--) {
    const prefix = sicCode.substring(0, i);
    if (BUCKETS_BY_SIC[prefix]?.[0]) {
      return BUCKETS_BY_SIC[prefix][0];
    }
  }

  return null;
}

// ===== HELPER: Get all bucket IDs for a sector =====
export function getBucketsForSector(sector: string): SectorBucket[] {
  return ALL_SECTOR_BUCKETS.filter((b) => b.sector === sector);
}

// ===== SECTOR SUMMARY =====
export const SECTOR_SUMMARY = {
  totalBuckets: ALL_SECTOR_BUCKETS.length,
  sectors: {
    "construction-contractors": CONSTRUCTION_BUCKETS.length,
    "transportation-logistics": TRANSPORTATION_BUCKETS.length,
    automotive: AUTOMOTIVE_BUCKETS.length,
    manufacturing: MANUFACTURING_BUCKETS.length,
    "professional-services": PROFESSIONAL_BUCKETS.length,
    "healthcare-medical": HEALTHCARE_BUCKETS.length,
    "restaurants-food": RESTAURANT_BUCKETS.length,
    "retail-stores": RETAIL_BUCKETS.length,
    "hotels-hospitality": HOSPITALITY_BUCKETS.length,
    "real-estate": REAL_ESTATE_BUCKETS.length,
    "financial-services": FINANCIAL_BUCKETS.length,
    "personal-services": PERSONAL_SERVICES_BUCKETS.length,
    "business-services": BUSINESS_SERVICES_BUCKETS.length,
    "education-training": EDUCATION_BUCKETS.length,
    "recreation-entertainment": RECREATION_BUCKETS.length,
    "business-brokers-pe": BUSINESS_BROKERS_PE_BUCKETS.length,
    "property-associated": PROPERTY_ASSOCIATED_BUCKETS.length,
  },
};

// ===== FAVORITES HELPERS =====

// Get all buckets in a favorite group
export function getBucketsInGroup(groupId: string): SectorBucket[] {
  const group = DEFAULT_FAVORITE_GROUPS.find((g) => g.id === groupId);
  if (!group) return [];
  return group.bucketIds.map((id) => BUCKET_BY_ID[id]).filter(Boolean);
}

// Get all property-associated buckets
export function getPropertyAssociatedBuckets(): SectorBucket[] {
  return ALL_SECTOR_BUCKETS.filter((b) => b.propertyAssociated);
}

// Get buckets by tag
export function getBucketsByTag(tag: string): SectorBucket[] {
  return ALL_SECTOR_BUCKETS.filter((b) => b.tags?.includes(tag));
}

// Get all available tags
export function getAllTags(): string[] {
  const tags = new Set<string>();
  ALL_SECTOR_BUCKETS.forEach((b) => {
    b.tags?.forEach((t) => tags.add(t));
  });
  return Array.from(tags).sort();
}

// Create a custom favorite group (returns the group object for storage)
export function createFavoriteGroup(
  name: string,
  bucketIds: string[],
  options?: { description?: string; color?: string; icon?: string }
): FavoriteGroup {
  return {
    id: `custom-${Date.now()}`,
    name,
    description: options?.description || `Custom group: ${name}`,
    bucketIds,
    color: options?.color || "#6366F1",
    icon: options?.icon || "star",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Log summary on import (for debugging)
console.log(`[Sector Buckets] Loaded ${ALL_SECTOR_BUCKETS.length} bucket definitions across 17 sectors`);
