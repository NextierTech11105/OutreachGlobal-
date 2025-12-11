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
    description:
      "Complete NY residential data with demographics, property info, and wealth indicators",
    fields: [
      {
        name: "First Name",
        normalized: "firstName",
        type: "string",
        indexed: true,
      },
      { name: "Middle Initial", normalized: "middleInitial", type: "string" },
      {
        name: "Last Name",
        normalized: "lastName",
        type: "string",
        indexed: true,
      },
      { name: "Address", normalized: "address", type: "string", indexed: true },
      { name: "City", normalized: "city", type: "string", indexed: true },
      { name: "State", normalized: "state", type: "string" },
      {
        name: "Zip Code",
        normalized: "zipCode",
        type: "string",
        indexed: true,
      },
      { name: "Zip Code + 4", normalized: "zip4", type: "string" },
      { name: "Delivery Point", normalized: "deliveryPoint", type: "string" },
      { name: "Carrier Route", normalized: "carrierRoute", type: "string" },
      { name: "County Number", normalized: "countyFips", type: "string" },
      {
        name: "County Name",
        normalized: "county",
        type: "string",
        indexed: true,
      },
      { name: "Latitude", normalized: "lat", type: "number" },
      { name: "Longitude", normalized: "lng", type: "number" },
      {
        name: "First in Household",
        normalized: "headOfHousehold",
        type: "boolean",
      },
      { name: "Child Present", normalized: "hasChildren", type: "boolean" },
      { name: "MFDU", normalized: "isMultiFamily", type: "boolean" },
      { name: "Exact Age", normalized: "age", type: "number" },
      { name: "Estimated Age", normalized: "estimatedAge", type: "number" },
      {
        name: "Estimated Income",
        normalized: "estimatedIncome",
        type: "number",
      },
      {
        name: "Length of Residence",
        normalized: "yearsAtAddress",
        type: "number",
      },
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
      {
        name: "Estimated Wealth",
        normalized: "estimatedWealth",
        type: "number",
      },
      {
        name: "Phone Number",
        normalized: "phone",
        type: "string",
        indexed: true,
      },
      { name: "Time Zone", normalized: "timezone", type: "string" },
      { name: "Birth Date", normalized: "birthDate", type: "date" },
    ],
    storagePath: "datalake/residential/ny/",
    useCases: [
      "property outreach",
      "skip trace enrichment",
      "demographic targeting",
      "wealth screening",
    ],
  },

  // NY Cell Phone Database - 5.1M records
  ny_cell_phone: {
    name: "New York Cell Phone Database",
    source: "USBizData",
    totalRecords: 5141785,
    lastUpdate: "Q4 2025",
    description: "NY cell phone numbers with owner info for SMS outreach",
    fields: [
      {
        name: "Cell Number",
        normalized: "cellPhone",
        type: "string",
        indexed: true,
      },
      {
        name: "First Name",
        normalized: "firstName",
        type: "string",
        indexed: true,
      },
      {
        name: "Last Name",
        normalized: "lastName",
        type: "string",
        indexed: true,
      },
      { name: "Address", normalized: "address", type: "string", indexed: true },
      { name: "City", normalized: "city", type: "string" },
      { name: "State", normalized: "state", type: "string" },
      {
        name: "Zip Code",
        normalized: "zipCode",
        type: "string",
        indexed: true,
      },
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
      {
        name: "Email Address",
        normalized: "email",
        type: "string",
        indexed: true,
      },
      {
        name: "First Name",
        normalized: "firstName",
        type: "string",
        indexed: true,
      },
      {
        name: "Last Name",
        normalized: "lastName",
        type: "string",
        indexed: true,
      },
      {
        name: "Street Address",
        normalized: "address",
        type: "string",
        indexed: true,
      },
      { name: "City", normalized: "city", type: "string" },
      { name: "State", normalized: "state", type: "string" },
      {
        name: "Zip Code",
        normalized: "zipCode",
        type: "string",
        indexed: true,
      },
      { name: "Phone Number", normalized: "phone", type: "string" },
      { name: "Opt-In IP", normalized: "optInIp", type: "string" },
    ],
    storagePath: "datalake/emails/ny/",
    useCases: [
      "email campaigns",
      "newsletter outreach",
      "valuation report delivery",
    ],
  },

  // NY Business Database - 5.5M records
  ny_business: {
    name: "New York Business Database",
    source: "USBizData",
    totalRecords: 5514091,
    lastUpdate: "Q4 2025",
    description:
      "NY business contacts with company details, SIC codes, and revenue",
    fields: [
      {
        name: "Company Name",
        normalized: "companyName",
        type: "string",
        indexed: true,
      },
      {
        name: "Contact Name",
        normalized: "contactName",
        type: "string",
        indexed: true,
      },
      {
        name: "Email Address",
        normalized: "email",
        type: "string",
        indexed: true,
      },
      {
        name: "Street Address",
        normalized: "address",
        type: "string",
        indexed: true,
      },
      { name: "City", normalized: "city", type: "string" },
      { name: "State", normalized: "state", type: "string" },
      {
        name: "Zip Code",
        normalized: "zipCode",
        type: "string",
        indexed: true,
      },
      { name: "County", normalized: "county", type: "string" },
      { name: "Area Code", normalized: "areaCode", type: "string" },
      {
        name: "Phone Number",
        normalized: "phone",
        type: "string",
        indexed: true,
      },
      { name: "Website URL", normalized: "website", type: "string" },
      {
        name: "Number of Employees",
        normalized: "employeeCount",
        type: "number",
      },
      { name: "Annual Revenue", normalized: "annualRevenue", type: "number" },
      {
        name: "SIC Code",
        normalized: "sicCode",
        type: "string",
        indexed: true,
      },
      { name: "SIC Description", normalized: "sicDescription", type: "string" },
    ],
    storagePath: "datalake/business/ny/",
    useCases: [
      "B2B outreach",
      "commercial property leads",
      "local business partnerships",
      "coupon partners",
    ],
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

// Schema ID to storage path mapping
export const SCHEMA_PATHS: Record<string, string> = {
  ny_residential: "datalake/residential/ny/",
  ny_cell_phone: "datalake/phones/ny/",
  ny_optin_email: "datalake/emails/ny/",
  ny_business: "datalake/business/ny/",
};

// B2B Sector definitions with SIC code mappings
export const B2B_SECTORS = {
  "professional-services": {
    name: "Professional Services",
    description: "Law firms, accounting, consulting, engineering",
    sicPrefix: ["81", "87"],
    subsectors: {
      "legal-services": { name: "Legal Services", sicCodes: ["8111"] },
      accounting: { name: "Accounting & CPA", sicCodes: ["8721"] },
      consulting: { name: "Management Consulting", sicCodes: ["8742"] },
      engineering: { name: "Engineering Services", sicCodes: ["8711"] },
      architects: { name: "Architectural Firms", sicCodes: ["8712"] },
    },
  },
  "healthcare-medical": {
    name: "Healthcare & Medical",
    description: "Doctors, clinics, medical services",
    sicPrefix: ["80"],
    subsectors: {
      physicians: { name: "Physicians", sicCodes: ["8011"] },
      dentists: { name: "Dentists", sicCodes: ["8021"] },
      chiropractors: { name: "Chiropractors", sicCodes: ["8041"] },
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
      restaurants: { name: "Full-Service Restaurants", sicCodes: ["5812"] },
      pizzerias: { name: "Pizzerias", sicCodes: ["5812"] },
      "fast-food": { name: "Fast Food", sicCodes: ["5812"] },
      "bars-taverns": { name: "Bars & Taverns", sicCodes: ["5813"] },
      catering: { name: "Caterers", sicCodes: ["5812"] },
      bakeries: { name: "Bakeries", sicCodes: ["5461"] },
      delis: { name: "Delis", sicCodes: ["5812"] },
    },
  },
  "retail-stores": {
    name: "Retail Stores",
    description: "Shops and retail establishments",
    sicPrefix: ["52", "53", "54", "55", "56", "57", "59"],
    subsectors: {
      grocery: { name: "Grocery Stores", sicCodes: ["5411"] },
      convenience: { name: "Convenience Stores", sicCodes: ["5411"] },
      clothing: { name: "Clothing Stores", sicCodes: ["5611", "5621", "5651"] },
      hardware: { name: "Hardware Stores", sicCodes: ["5251"] },
      furniture: { name: "Furniture Stores", sicCodes: ["5712"] },
      electronics: { name: "Electronics", sicCodes: ["5731"] },
      pharmacies: { name: "Pharmacies", sicCodes: ["5912"] },
    },
  },
  manufacturing: {
    name: "Manufacturing",
    description: "Factories and production facilities",
    sicPrefix: ["20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39"],
    subsectors: {
      "food-processing": { name: "Food Processing", sicCodes: ["2011", "2013", "2015", "2020"] },
      textiles: { name: "Textiles", sicCodes: ["2211", "2221", "2231"] },
      printing: { name: "Printing", sicCodes: ["2711", "2721", "2752"] },
      chemicals: { name: "Chemicals", sicCodes: ["2812", "2819", "2821"] },
      plastics: { name: "Plastics", sicCodes: ["3081", "3082", "3083"] },
      metals: { name: "Metal Fabrication", sicCodes: ["3312", "3317", "3441"] },
      machinery: { name: "Machinery", sicCodes: ["3531", "3532", "3533"] },
      electronics: { name: "Electronics Mfg", sicCodes: ["3661", "3672", "3674"] },
      "cement-concrete": { name: "Cement & Concrete", sicCodes: ["3241", "3272", "3273"] },
    },
  },
  "transportation-logistics": {
    name: "Transportation & Logistics",
    description: "Trucking, shipping, warehousing",
    sicPrefix: ["40", "41", "42", "43", "44", "45", "46", "47"],
    subsectors: {
      trucking: { name: "Trucking", sicCodes: ["4212", "4213", "4214"] },
      moving: { name: "Moving Companies", sicCodes: ["4212", "4214"] },
      warehousing: { name: "Warehousing", sicCodes: ["4225", "4226"] },
      freight: { name: "Freight Forwarding", sicCodes: ["4731"] },
      courier: { name: "Courier Services", sicCodes: ["4215"] },
      "taxis-limo": { name: "Taxi & Limo", sicCodes: ["4121"] },
    },
  },
  "hotels-hospitality": {
    name: "Hotels & Hospitality",
    description: "Hotels, motels, lodging",
    sicPrefix: ["70"],
    subsectors: {
      hotels: { name: "Hotels", sicCodes: ["7011"] },
      motels: { name: "Motels", sicCodes: ["7011"] },
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
      colleges: { name: "Colleges", sicCodes: ["8221"] },
      vocational: { name: "Vocational Schools", sicCodes: ["8249"] },
      tutoring: { name: "Tutoring", sicCodes: ["8299"] },
      daycare: { name: "Daycare", sicCodes: ["8351"] },
    },
  },
  automotive: {
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
      banks: { name: "Banks", sicCodes: ["6021", "6022"] },
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
      developers: { name: "Developers", sicCodes: ["6552"] },
      appraisers: { name: "Appraisers", sicCodes: ["6531"] },
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
      plumbers: { name: "Plumbers", sicCodes: ["1711"] },
      electricians: { name: "Electricians", sicCodes: ["1731"] },
      hvac: { name: "HVAC", sicCodes: ["1711"] },
      roofers: { name: "Roofers", sicCodes: ["1761"] },
      painters: { name: "Painters", sicCodes: ["1721"] },
      carpenters: { name: "Carpenters", sicCodes: ["1751"] },
      masonry: { name: "Masonry", sicCodes: ["1741"] },
      landscaping: { name: "Landscaping", sicCodes: ["0782"] },
    },
  },
  "personal-services": {
    name: "Personal Services",
    description: "Personal care and services",
    sicPrefix: ["72"],
    subsectors: {
      salons: { name: "Hair Salons", sicCodes: ["7231"] },
      barbershops: { name: "Barber Shops", sicCodes: ["7241"] },
      spas: { name: "Day Spas", sicCodes: ["7299"] },
      "dry-cleaners": { name: "Dry Cleaners", sicCodes: ["7216"] },
      laundromats: { name: "Laundromats", sicCodes: ["7215"] },
      "funeral-homes": { name: "Funeral Homes", sicCodes: ["7261"] },
    },
  },
  "business-services": {
    name: "Business Services",
    description: "B2B service providers",
    sicPrefix: ["73"],
    subsectors: {
      advertising: { name: "Advertising", sicCodes: ["7311"] },
      staffing: { name: "Staffing Agencies", sicCodes: ["7361"] },
      janitorial: { name: "Janitorial", sicCodes: ["7349"] },
      security: { name: "Security Services", sicCodes: ["7381", "7382"] },
      "it-services": { name: "IT Services", sicCodes: ["7371", "7372", "7373", "7374", "7375", "7376", "7377", "7378", "7379"] },
      printing: { name: "Commercial Printing", sicCodes: ["2752"] },
    },
  },
  "recreation-entertainment": {
    name: "Recreation & Entertainment",
    description: "Entertainment venues and services",
    sicPrefix: ["79"],
    subsectors: {
      gyms: { name: "Gyms & Fitness", sicCodes: ["7991"] },
      "golf-courses": { name: "Golf Courses", sicCodes: ["7992"] },
      bowling: { name: "Bowling Alleys", sicCodes: ["7933"] },
      theaters: { name: "Movie Theaters", sicCodes: ["7832"] },
      amusement: { name: "Amusement Parks", sicCodes: ["7996"] },
    },
  },
};
