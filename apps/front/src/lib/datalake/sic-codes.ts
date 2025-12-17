// ==========================================
// SIC CODE DATABASE
// Complete micro-sector definitions from USBizData
// ==========================================

export interface SICCode {
  code: string;
  description: string;
  count: number; // Record count from USBizData
  sector?: string; // Parent sector slug
  subsector?: string; // Parent subsector slug
  bucketId?: string; // Mapped bucket ID if available
}

// Full SIC code database with record counts
export const SIC_CODES: Record<string, SICCode> = {
  // ===== CONSTRUCTION & CONTRACTORS (15xx-17xx) =====
  "1521": { code: "1521", description: "General Contractors Single Family Houses", count: 440197, sector: "construction-contractors", subsector: "general-contractors" },
  "1522": { code: "1522", description: "General Contractors Residential Buildings, Other Than Single Family", count: 32295, sector: "construction-contractors", subsector: "general-contractors" },
  "1541": { code: "1541", description: "General Contractors Industrial Buildings and Warehouses", count: 42450, sector: "construction-contractors", subsector: "commercial-builders" },
  "1542": { code: "1542", description: "General Contractors Nonresidential Buildings", count: 168166, sector: "construction-contractors", subsector: "commercial-builders" },
  "1611": { code: "1611", description: "Highway and Street Construction", count: 79607, sector: "construction-contractors", subsector: "heavy-civil" },
  "1622": { code: "1622", description: "Bridge, Tunnel, and Elevated Highway Construction", count: 6716, sector: "construction-contractors", subsector: "heavy-civil" },
  "1623": { code: "1623", description: "Water, Sewer, Pipeline, and Communications and Power Line Construction", count: 52336, sector: "construction-contractors", subsector: "utilities" },
  "1629": { code: "1629", description: "Heavy Construction, Not Elsewhere Classified", count: 36258, sector: "construction-contractors", subsector: "heavy-civil" },
  "1711": { code: "1711", description: "Plumbing, Heating and Air Conditioning", count: 271874, sector: "construction-contractors", subsector: "plumbers", bucketId: "us-construction-plumbers-hvac" },
  "1721": { code: "1721", description: "Painting and Paper Hanging", count: 36306, sector: "construction-contractors", subsector: "painters" },
  "1731": { code: "1731", description: "Electrical Work", count: 246726, sector: "construction-contractors", subsector: "electricians" },
  "1741": { code: "1741", description: "Masonry, Stone Setting, and Other Stone Work", count: 17392, sector: "construction-contractors", subsector: "masonry" },
  "1742": { code: "1742", description: "Plastering, Drywall, Acoustical, and Insulation Work", count: 28001, sector: "construction-contractors", subsector: "drywall" },
  "1743": { code: "1743", description: "Terrazzo, Tile, Marble, and Mosaic Work", count: 15138, sector: "construction-contractors", subsector: "tile" },
  "1751": { code: "1751", description: "Carpentry Work", count: 30955, sector: "construction-contractors", subsector: "carpenters" },
  "1752": { code: "1752", description: "Floor Laying and Other Floor Work", count: 19906, sector: "construction-contractors", subsector: "flooring" },
  "1761": { code: "1761", description: "Roofing, Siding, and Sheet Metal Work", count: 62895, sector: "construction-contractors", subsector: "roofers" },
  "1771": { code: "1771", description: "Concrete Work", count: 35403, sector: "construction-contractors", subsector: "concrete" },
  "1781": { code: "1781", description: "Water Well Drilling", count: 11335, sector: "construction-contractors", subsector: "well-drilling" },
  "1791": { code: "1791", description: "Structural Steel Erection", count: 20694, sector: "construction-contractors", subsector: "steel" },
  "1793": { code: "1793", description: "Glass and Glazing Work", count: 7435, sector: "construction-contractors", subsector: "glass" },
  "1794": { code: "1794", description: "Excavation Work", count: 31253, sector: "construction-contractors", subsector: "excavation" },
  "1795": { code: "1795", description: "Wrecking and Demolition Work", count: 7069, sector: "construction-contractors", subsector: "demolition" },
  "1796": { code: "1796", description: "Installation or Erection of Building Equipment", count: 13754, sector: "construction-contractors", subsector: "installation" },
  "1799": { code: "1799", description: "Special Trade Contractors, Not Elsewhere Classified", count: 120878, sector: "construction-contractors", subsector: "specialty" },

  // ===== TRANSPORTATION & LOGISTICS (40xx-47xx) =====
  "4011": { code: "4011", description: "Railroads, Line Haul Operating", count: 26628, sector: "transportation-logistics", subsector: "railroads" },
  "4111": { code: "4111", description: "Local and Suburban Transit", count: 33447, sector: "transportation-logistics", subsector: "transit" },
  "4119": { code: "4119", description: "Local Passenger Transportation, Not Elsewhere Classified", count: 54218, sector: "transportation-logistics", subsector: "passenger" },
  "4121": { code: "4121", description: "Taxicabs", count: 7537, sector: "transportation-logistics", subsector: "taxis-limo" },
  "4131": { code: "4131", description: "Intercity and Rural Bus Transportation", count: 12856, sector: "transportation-logistics", subsector: "bus" },
  "4141": { code: "4141", description: "Local Bus Charter Service", count: 1250, sector: "transportation-logistics", subsector: "bus" },
  "4142": { code: "4142", description: "Bus Charter Service, Except Local", count: 9114, sector: "transportation-logistics", subsector: "bus" },
  "4151": { code: "4151", description: "School Buses", count: 11217, sector: "transportation-logistics", subsector: "school-buses" },
  "4212": { code: "4212", description: "Local Trucking Without Storage", count: 64935, sector: "transportation-logistics", subsector: "trucking", bucketId: "us-transport-trucking" },
  "4213": { code: "4213", description: "Trucking, Except Local", count: 142957, sector: "transportation-logistics", subsector: "trucking", bucketId: "us-transport-trucking" },
  "4214": { code: "4214", description: "Local Trucking With Storage", count: 32641, sector: "transportation-logistics", subsector: "trucking", bucketId: "us-transport-trucking" },
  "4215": { code: "4215", description: "Courier Services, Except by Air", count: 9529, sector: "transportation-logistics", subsector: "courier" },
  "4221": { code: "4221", description: "Farm Product Warehousing and Storage", count: 10256, sector: "transportation-logistics", subsector: "warehousing" },
  "4222": { code: "4222", description: "Refrigerated Warehousing and Storage", count: 7842, sector: "transportation-logistics", subsector: "warehousing" },
  "4225": { code: "4225", description: "General Warehousing and Storage", count: 109830, sector: "transportation-logistics", subsector: "warehousing", bucketId: "us-transport-warehousing" },
  "4226": { code: "4226", description: "Special Warehousing and Storage", count: 13328, sector: "transportation-logistics", subsector: "warehousing", bucketId: "us-transport-warehousing" },
  "4231": { code: "4231", description: "Terminal and Joint Terminal Maintenance Facilities for Motor Freight", count: 1188, sector: "transportation-logistics", subsector: "terminals" },
  "4513": { code: "4513", description: "Air Courier Services", count: 14530, sector: "transportation-logistics", subsector: "air-courier" },
  "4581": { code: "4581", description: "Airports, Flying Fields, and Airport Terminal Services", count: 64442, sector: "transportation-logistics", subsector: "airports" },
  "4731": { code: "4731", description: "Arrangement of Transportation of Freight and Cargo", count: 136825, sector: "transportation-logistics", subsector: "freight" },

  // ===== AUTOMOTIVE (55xx, 75xx) =====
  "5511": { code: "5511", description: "Motor Vehicle Dealers (New and Used)", count: 318585, sector: "automotive", subsector: "dealers-new" },
  "5521": { code: "5521", description: "Motor Vehicle Dealers (Used Only)", count: 23941, sector: "automotive", subsector: "dealers-used" },
  "5531": { code: "5531", description: "Auto and Home Supply Stores", count: 172233, sector: "automotive", subsector: "parts-stores" },
  "5551": { code: "5551", description: "Boat Dealers", count: 27782, sector: "automotive", subsector: "boat-dealers" },
  "5561": { code: "5561", description: "Recreational Vehicle Dealers", count: 14605, sector: "automotive", subsector: "rv-dealers" },
  "5571": { code: "5571", description: "Motorcycle Dealers", count: 22676, sector: "automotive", subsector: "motorcycle-dealers" },
  "5599": { code: "5599", description: "Automotive Dealers, Not Elsewhere Classified", count: 27313, sector: "automotive", subsector: "other-dealers" },
  "7532": { code: "7532", description: "Top, Body, and Upholstery Repair Shops and Paint Shops", count: 54199, sector: "automotive", subsector: "body-shops" },
  "7533": { code: "7533", description: "Automotive Exhaust System Repair Shops", count: 4130, sector: "automotive", subsector: "exhaust-repair" },
  "7534": { code: "7534", description: "Tire Retreading and Repair Shops", count: 2297, sector: "automotive", subsector: "tire-shops" },
  "7536": { code: "7536", description: "Automotive Glass Replacement Shops", count: 6390, sector: "automotive", subsector: "glass-repair" },
  "7537": { code: "7537", description: "Automotive Transmission Repair Shops", count: 11221, sector: "automotive", subsector: "transmission" },
  "7538": { code: "7538", description: "General Automotive Repair Shops", count: 119232, sector: "automotive", subsector: "repair-shops", bucketId: "us-auto-repair-shops" },
  "7539": { code: "7539", description: "Automotive Repair Shops, Not Elsewhere Classified", count: 17727, sector: "automotive", subsector: "other-repair" },
  "7542": { code: "7542", description: "Carwashes", count: 12711, sector: "automotive", subsector: "car-wash", bucketId: "us-auto-car-wash" },
  "7549": { code: "7549", description: "Automotive Services, Except Repair and Carwashes", count: 32646, sector: "automotive", subsector: "other-services" },

  // ===== RESTAURANTS & FOOD SERVICE (58xx) =====
  "5461": { code: "5461", description: "Retail Bakeries", count: 62247, sector: "restaurants-food", subsector: "bakeries", bucketId: "us-food-bakeries" },
  "5812": { code: "5812", description: "Eating Places", count: 1209846, sector: "restaurants-food", subsector: "restaurants", bucketId: "us-food-restaurants" },
  "5813": { code: "5813", description: "Drinking Places (alcoholic Beverages)", count: 44077, sector: "restaurants-food", subsector: "bars-taverns", bucketId: "us-food-bars-taverns" },

  // ===== HOTELS & HOSPITALITY (70xx) =====
  "7011": { code: "7011", description: "Hotels and Motels", count: 366695, sector: "hotels-hospitality", subsector: "hotels" },
  "7021": { code: "7021", description: "Rooming and Boarding Houses", count: 12006, sector: "hotels-hospitality", subsector: "rooming" },
  "7032": { code: "7032", description: "Sporting and Recreational Camps", count: 27562, sector: "hotels-hospitality", subsector: "camps" },
  "7033": { code: "7033", description: "Recreational Vehicle Parks and Campsites", count: 16039, sector: "hotels-hospitality", subsector: "campgrounds-rv", bucketId: "us-hospitality-campgrounds-rv" },
  "7041": { code: "7041", description: "Organization Hotels and Lodging Houses", count: 3925, sector: "hotels-hospitality", subsector: "organization" },

  // ===== PERSONAL SERVICES (72xx) =====
  "7211": { code: "7211", description: "Power Laundries, Family and Commercial", count: 3084, sector: "personal-services", subsector: "laundries" },
  "7212": { code: "7212", description: "Garment Pressing, and Agents for Laundries", count: 14987, sector: "personal-services", subsector: "pressing" },
  "7213": { code: "7213", description: "Linen Supply", count: 13131, sector: "personal-services", subsector: "linen" },
  "7215": { code: "7215", description: "Coin Operated Laundries and Drycleaning", count: 3369, sector: "personal-services", subsector: "laundromats", bucketId: "us-personal-laundromats" },
  "7216": { code: "7216", description: "Drycleaning Plants, Except Rug Cleaning", count: 7704, sector: "personal-services", subsector: "dry-cleaners" },
  "7217": { code: "7217", description: "Carpet and Upholstery Cleaning", count: 17221, sector: "personal-services", subsector: "carpet-cleaning" },
  "7218": { code: "7218", description: "Industrial Launderers", count: 11519, sector: "personal-services", subsector: "industrial-laundry" },
  "7219": { code: "7219", description: "Laundry and Garment Services, Not Elsewhere Classified", count: 1823, sector: "personal-services", subsector: "other-laundry" },
  "7221": { code: "7221", description: "Photographic Studios, Portrait", count: 48688, sector: "personal-services", subsector: "photography" },
  "7231": { code: "7231", description: "Beauty Shops", count: 145957, sector: "personal-services", subsector: "salons", bucketId: "us-personal-salons" },
  "7241": { code: "7241", description: "Barber Shops", count: 9760, sector: "personal-services", subsector: "barbershops" },
  "7251": { code: "7251", description: "Shoe Repair Shops and Shoeshine Parlors", count: 3646, sector: "personal-services", subsector: "shoe-repair" },
  "7261": { code: "7261", description: "Funeral Service and Crematories", count: 29985, sector: "personal-services", subsector: "funeral-homes", bucketId: "us-personal-funeral-homes" },
  "7291": { code: "7291", description: "Tax Return Preparation Services", count: 81330, sector: "personal-services", subsector: "tax-preparers" },
  "7299": { code: "7299", description: "Miscellaneous Personal Services", count: 140202, sector: "personal-services", subsector: "other" },

  // ===== BUSINESS SERVICES (73xx) =====
  "7311": { code: "7311", description: "Advertising Agencies", count: 256541, sector: "business-services", subsector: "advertising" },
  "7312": { code: "7312", description: "Outdoor Advertising Services", count: 10976, sector: "business-services", subsector: "outdoor-ads" },
  "7313": { code: "7313", description: "Radio, Television, and Publishers' Advertising Representatives", count: 31493, sector: "business-services", subsector: "media-ads" },
  "7319": { code: "7319", description: "Advertising, Not Elsewhere Classified", count: 87234, sector: "business-services", subsector: "other-ads" },
  "7322": { code: "7322", description: "Adjustment and Collection Services", count: 32317, sector: "business-services", subsector: "collections" },
  "7323": { code: "7323", description: "Credit Reporting Services", count: 35430, sector: "business-services", subsector: "credit-reporting" },
  "7331": { code: "7331", description: "Direct Mail Advertising Services", count: 67925, sector: "business-services", subsector: "direct-mail" },
  "7334": { code: "7334", description: "Photocopying and Duplicating Services", count: 20805, sector: "business-services", subsector: "printing" },
  "7335": { code: "7335", description: "Commercial Photography", count: 21883, sector: "business-services", subsector: "photography" },
  "7336": { code: "7336", description: "Commercial Art and Graphic Design", count: 82518, sector: "business-services", subsector: "design" },
  "7338": { code: "7338", description: "Secretarial and Court Reporting Services", count: 19645, sector: "business-services", subsector: "secretarial" },
  "7342": { code: "7342", description: "Disinfecting and Pest Control Services", count: 34355, sector: "business-services", subsector: "pest-control" },
  "7349": { code: "7349", description: "Building Cleaning and Maintenance Services", count: 102413, sector: "business-services", subsector: "janitorial", bucketId: "us-biz-janitorial" },
  "7352": { code: "7352", description: "Medical Equipment Rental and Leasing", count: 7634, sector: "business-services", subsector: "medical-rental" },
  "7353": { code: "7353", description: "Heavy Construction Equipment Rental and Leasing", count: 13927, sector: "business-services", subsector: "equipment-rental" },
  "7359": { code: "7359", description: "Equipment Rental and Leasing, Not Elsewhere Classified", count: 140627, sector: "business-services", subsector: "equipment-rental" },
  "7361": { code: "7361", description: "Employment Agencies", count: 273880, sector: "business-services", subsector: "staffing" },
  "7363": { code: "7363", description: "Help Supply Services", count: 166027, sector: "business-services", subsector: "staffing" },
  "7371": { code: "7371", description: "Computer Programming Services", count: 611879, sector: "business-services", subsector: "it-services" },
  "7372": { code: "7372", description: "Prepackaged Software", count: 322320, sector: "business-services", subsector: "it-services" },
  "7373": { code: "7373", description: "Computer Integrated Systems Design", count: 232883, sector: "business-services", subsector: "it-services" },
  "7374": { code: "7374", description: "Computer Processing and Data Preparation", count: 297004, sector: "business-services", subsector: "it-services" },
  "7375": { code: "7375", description: "Information Retrieval Services", count: 73026, sector: "business-services", subsector: "it-services" },
  "7376": { code: "7376", description: "Computer Facilities Management Services", count: 9027, sector: "business-services", subsector: "it-services" },
  "7377": { code: "7377", description: "Computer Rental and Leasing", count: 5117, sector: "business-services", subsector: "it-services" },
  "7378": { code: "7378", description: "Computer Maintenance and Repair", count: 72809, sector: "business-services", subsector: "it-services" },
  "7379": { code: "7379", description: "Computer Related Services, Not Elsewhere Classified", count: 237091, sector: "business-services", subsector: "it-services" },
  "7381": { code: "7381", description: "Detective, Guard, and Armored Car Services", count: 80149, sector: "business-services", subsector: "security" },
  "7382": { code: "7382", description: "Security Systems Services", count: 55778, sector: "business-services", subsector: "security" },
  "7383": { code: "7383", description: "News Syndicates", count: 28331, sector: "business-services", subsector: "news" },
  "7384": { code: "7384", description: "Photofinishing Laboratories", count: 14111, sector: "business-services", subsector: "photo" },
  "7389": { code: "7389", description: "Business Services, Not Elsewhere Classified", count: 906585, sector: "business-services", subsector: "other" },

  // ===== HEALTHCARE & MEDICAL (80xx) =====
  "8011": { code: "8011", description: "Offices and Clinics of Doctors of Medicine", count: 1701012, sector: "healthcare-medical", subsector: "physicians", bucketId: "us-health-physicians" },
  "8021": { code: "8021", description: "Offices and Clinics of Dentists", count: 146432, sector: "healthcare-medical", subsector: "dentists", bucketId: "us-health-dentists" },
  "8031": { code: "8031", description: "Offices and Clinics of Doctors of Osteopathy", count: 13153, sector: "healthcare-medical", subsector: "osteopaths" },
  "8041": { code: "8041", description: "Offices and Clinics of Chiropractors", count: 37076, sector: "healthcare-medical", subsector: "chiropractors" },
  "8042": { code: "8042", description: "Offices and Clinics of Optometrists", count: 26327, sector: "healthcare-medical", subsector: "optometrists" },
  "8043": { code: "8043", description: "Offices and Clinics of Podiatrists", count: 11956, sector: "healthcare-medical", subsector: "podiatrists" },
  "8049": { code: "8049", description: "Offices and Clinics of Health Practitioners, Not Elsewhere Classified", count: 297892, sector: "healthcare-medical", subsector: "other-practitioners" },
  "8051": { code: "8051", description: "Skilled Nursing Care Facilities", count: 127297, sector: "healthcare-medical", subsector: "nursing-homes" },
  "8052": { code: "8052", description: "Intermediate Care Facilities", count: 25100, sector: "healthcare-medical", subsector: "care-facilities" },
  "8059": { code: "8059", description: "Nursing and Personal Care Facilities, Not Elsewhere Classified", count: 87201, sector: "healthcare-medical", subsector: "care-facilities" },
  "8062": { code: "8062", description: "General Medical and Surgical Hospitals", count: 639569, sector: "healthcare-medical", subsector: "hospitals" },
  "8063": { code: "8063", description: "Psychiatric Hospitals", count: 51774, sector: "healthcare-medical", subsector: "psych-hospitals" },
  "8069": { code: "8069", description: "Specialty Hospitals, Except Psychiatric", count: 91596, sector: "healthcare-medical", subsector: "specialty-hospitals" },
  "8071": { code: "8071", description: "Medical Laboratories", count: 111491, sector: "healthcare-medical", subsector: "medical-labs" },
  "8072": { code: "8072", description: "Dental Laboratories", count: 10304, sector: "healthcare-medical", subsector: "dental-labs" },
  "8082": { code: "8082", description: "Home Health Care Services", count: 134887, sector: "healthcare-medical", subsector: "home-health" },
  "8092": { code: "8092", description: "Kidney Dialysis Centers", count: 15098, sector: "healthcare-medical", subsector: "dialysis" },
  "8093": { code: "8093", description: "Specialty Outpatient Facilities, Not Elsewhere Classified", count: 77166, sector: "healthcare-medical", subsector: "outpatient" },
  "8099": { code: "8099", description: "Health and Allied Services, Not Elsewhere Classified", count: 316838, sector: "healthcare-medical", subsector: "other-health" },

  // ===== PROFESSIONAL SERVICES (81xx, 87xx) =====
  "8111": { code: "8111", description: "Legal Services", count: 1485798, sector: "professional-services", subsector: "legal-services", bucketId: "us-prof-legal-services" },
  "8711": { code: "8711", description: "Engineering Services", count: 610317, sector: "professional-services", subsector: "engineering" },
  "8712": { code: "8712", description: "Architectural Services", count: 177525, sector: "professional-services", subsector: "architects" },
  "8713": { code: "8713", description: "Surveying Services", count: 26178, sector: "professional-services", subsector: "surveying" },
  "8721": { code: "8721", description: "Accounting, Auditing, and Bookkeeping Services", count: 498775, sector: "professional-services", subsector: "accounting" },
  "8731": { code: "8731", description: "Commercial Physical and Biological Research", count: 276975, sector: "professional-services", subsector: "research" },
  "8732": { code: "8732", description: "Commercial Economic, Sociological, and Educational Research", count: 140601, sector: "professional-services", subsector: "research" },
  "8733": { code: "8733", description: "Noncommercial Research Organizations", count: 166866, sector: "professional-services", subsector: "research" },
  "8734": { code: "8734", description: "Testing Laboratories", count: 63577, sector: "professional-services", subsector: "testing" },
  "8741": { code: "8741", description: "Management Services", count: 276825, sector: "professional-services", subsector: "management" },
  "8742": { code: "8742", description: "Management Consulting Services", count: 987465, sector: "professional-services", subsector: "consulting" },
  "8743": { code: "8743", description: "Public Relations Services", count: 87667, sector: "professional-services", subsector: "pr" },
  "8744": { code: "8744", description: "Facilities Support Management Services", count: 21075, sector: "professional-services", subsector: "facilities" },
  "8748": { code: "8748", description: "Business Consulting Services, Not Elsewhere Classified", count: 428094, sector: "professional-services", subsector: "consulting" },

  // ===== REAL ESTATE (65xx) =====
  "6512": { code: "6512", description: "Operators of Nonresidential Buildings", count: 111255, sector: "real-estate", subsector: "property-mgmt" },
  "6513": { code: "6513", description: "Operators of Apartment Buildings", count: 149039, sector: "real-estate", subsector: "property-mgmt" },
  "6514": { code: "6514", description: "Operators of Dwellings Other Than Apartment Buildings", count: 2857, sector: "real-estate", subsector: "property-mgmt" },
  "6515": { code: "6515", description: "Operators of Residential Mobile Home Sites", count: 7845, sector: "real-estate", subsector: "property-mgmt" },
  "6531": { code: "6531", description: "Real Estate Agents and Managers", count: 2184724, sector: "real-estate", subsector: "agents-brokers", bucketId: "us-realestate-agents-brokers" },
  "6541": { code: "6541", description: "Title Abstract Offices", count: 65937, sector: "real-estate", subsector: "title-companies" },
  "6552": { code: "6552", description: "Land Subdividers and Developers, Except Cemeteries", count: 81016, sector: "real-estate", subsector: "developers" },
  "6553": { code: "6553", description: "Cemetery Subdividers and Developers", count: 9780, sector: "real-estate", subsector: "cemeteries" },
  "6798": { code: "6798", description: "Real Estate Investment Trusts", count: 27987, sector: "real-estate", subsector: "reits", bucketId: "us-realestate-reits" },

  // ===== FINANCIAL SERVICES (60xx-67xx) =====
  "6021": { code: "6021", description: "National Commercial Banks", count: 930648, sector: "financial-services", subsector: "banks" },
  "6022": { code: "6022", description: "State Commercial Banks", count: 253762, sector: "financial-services", subsector: "banks" },
  "6035": { code: "6035", description: "Savings Institutions, Federally Chartered", count: 51466, sector: "financial-services", subsector: "savings" },
  "6036": { code: "6036", description: "Savings Institutions, Not Federally Chartered", count: 22230, sector: "financial-services", subsector: "savings" },
  "6061": { code: "6061", description: "Credit Unions, Federally Chartered", count: 209262, sector: "financial-services", subsector: "credit-unions" },
  "6062": { code: "6062", description: "Credit Unions, Not Federally Chartered", count: 41224, sector: "financial-services", subsector: "credit-unions" },
  "6141": { code: "6141", description: "Personal Credit Institutions", count: 151428, sector: "financial-services", subsector: "personal-credit" },
  "6153": { code: "6153", description: "Short Term Business Credit Institutions", count: 44662, sector: "financial-services", subsector: "business-credit" },
  "6159": { code: "6159", description: "Miscellaneous business Credit Institutions", count: 28722, sector: "financial-services", subsector: "business-credit" },
  "6162": { code: "6162", description: "Mortgage Bankers and Loan Correspondents", count: 298129, sector: "financial-services", subsector: "mortgage-brokers" },
  "6163": { code: "6163", description: "Loan Brokers", count: 40467, sector: "financial-services", subsector: "loan-brokers" },
  "6211": { code: "6211", description: "Security Brokers, Dealers, and Flotation Companies", count: 397763, sector: "financial-services", subsector: "securities" },
  "6282": { code: "6282", description: "Investment Advice", count: 516863, sector: "financial-services", subsector: "investment-advisors" },
  "6311": { code: "6311", description: "Life Insurance", count: 100274, sector: "financial-services", subsector: "life-insurance" },
  "6321": { code: "6321", description: "Accident and Health Insurance", count: 51033, sector: "financial-services", subsector: "health-insurance" },
  "6324": { code: "6324", description: "Hospital and Medical Service Plans", count: 84083, sector: "financial-services", subsector: "medical-plans" },
  "6331": { code: "6331", description: "Fire, Marine, and Casualty Insurance", count: 113165, sector: "financial-services", subsector: "property-insurance" },
  "6351": { code: "6351", description: "Surety Insurance", count: 22588, sector: "financial-services", subsector: "surety" },
  "6361": { code: "6361", description: "Title Insurance", count: 28067, sector: "financial-services", subsector: "title-insurance" },
  "6399": { code: "6399", description: "Insurance Carriers, Not Elsewhere Classified", count: 12424, sector: "financial-services", subsector: "other-insurance" },
  "6411": { code: "6411", description: "Insurance Agents, Brokers, and Service", count: 1306302, sector: "financial-services", subsector: "insurance-agents", bucketId: "us-finance-insurance-agents" },

  // ===== RETAIL STORES (52xx-59xx) =====
  "5211": { code: "5211", description: "Lumber and Other Building Materials Dealers", count: 174522, sector: "retail-stores", subsector: "lumber" },
  "5231": { code: "5231", description: "Paint, Glass, and Wallpaper Stores", count: 51276, sector: "retail-stores", subsector: "paint" },
  "5251": { code: "5251", description: "Hardware Stores", count: 48327, sector: "retail-stores", subsector: "hardware", bucketId: "us-retail-hardware" },
  "5261": { code: "5261", description: "Retail Nurseries, Lawn and Garden Supply Stores", count: 49189, sector: "retail-stores", subsector: "garden" },
  "5311": { code: "5311", description: "Department Stores", count: 193972, sector: "retail-stores", subsector: "department" },
  "5331": { code: "5331", description: "Variety Stores", count: 78424, sector: "retail-stores", subsector: "variety" },
  "5399": { code: "5399", description: "Miscellaneous General Merchandise Stores", count: 47489, sector: "retail-stores", subsector: "general" },
  "5411": { code: "5411", description: "Grocery Stores", count: 389024, sector: "retail-stores", subsector: "grocery" },
  "5421": { code: "5421", description: "Meat and Fish (Seafood) Markets", count: 9217, sector: "retail-stores", subsector: "meat-fish" },
  "5431": { code: "5431", description: "Fruit and Vegetable Markets", count: 7854, sector: "retail-stores", subsector: "produce" },
  "5441": { code: "5441", description: "Candy, Nut, and Confectionery Stores", count: 9629, sector: "retail-stores", subsector: "candy" },
  "5451": { code: "5451", description: "Dairy Products Stores", count: 7002, sector: "retail-stores", subsector: "dairy" },
  "5499": { code: "5499", description: "Miscellaneous Food Stores", count: 62641, sector: "retail-stores", subsector: "specialty-food" },
  "5611": { code: "5611", description: "Men's and Boys' Clothing and Accessory Stores", count: 43581, sector: "retail-stores", subsector: "mens-clothing" },
  "5621": { code: "5621", description: "Women's Clothing Stores", count: 88160, sector: "retail-stores", subsector: "womens-clothing" },
  "5632": { code: "5632", description: "Women's Accessory and Specialty Stores", count: 38095, sector: "retail-stores", subsector: "accessories" },
  "5641": { code: "5641", description: "Children's and Infants' Wear Stores", count: 23984, sector: "retail-stores", subsector: "childrens" },
  "5651": { code: "5651", description: "Family Clothing Stores", count: 84194, sector: "retail-stores", subsector: "family-clothing" },
  "5661": { code: "5661", description: "Shoe Stores", count: 57378, sector: "retail-stores", subsector: "shoes" },
  "5699": { code: "5699", description: "Miscellaneous Apparel and Accessory Stores", count: 55266, sector: "retail-stores", subsector: "apparel-other" },
  "5712": { code: "5712", description: "Furniture Stores", count: 126149, sector: "retail-stores", subsector: "furniture" },
  "5713": { code: "5713", description: "Floor Covering Stores", count: 35456, sector: "retail-stores", subsector: "flooring" },
  "5714": { code: "5714", description: "Drapery, Curtain, and Upholstery Stores", count: 5121, sector: "retail-stores", subsector: "drapery" },
  "5719": { code: "5719", description: "Miscellaneous home furnishings Stores", count: 57879, sector: "retail-stores", subsector: "home-furnishings" },
  "5722": { code: "5722", description: "Household Appliance Stores", count: 31933, sector: "retail-stores", subsector: "appliances" },
  "5731": { code: "5731", description: "Radio, Television, and Consumer Electronics Stores", count: 138100, sector: "retail-stores", subsector: "electronics" },
  "5734": { code: "5734", description: "Computer and Computer Software Stores", count: 463547, sector: "retail-stores", subsector: "computers" },
  "5735": { code: "5735", description: "Record and Prerecorded Tape Stores", count: 22317, sector: "retail-stores", subsector: "music" },
  "5736": { code: "5736", description: "Musical Instrument Stores", count: 25811, sector: "retail-stores", subsector: "instruments" },
  "5912": { code: "5912", description: "Drug Stores and Proprietary Stores", count: 221378, sector: "retail-stores", subsector: "pharmacies" },
  "5921": { code: "5921", description: "Liquor Stores", count: 34161, sector: "retail-stores", subsector: "liquor" },
  "5932": { code: "5932", description: "Used Merchandise Stores", count: 69261, sector: "retail-stores", subsector: "used" },
  "5941": { code: "5941", description: "Sporting Goods Stores and Bicycle Shops", count: 118281, sector: "retail-stores", subsector: "sporting-goods" },
  "5942": { code: "5942", description: "Book Stores", count: 90621, sector: "retail-stores", subsector: "books" },
  "5943": { code: "5943", description: "Stationery Stores", count: 72705, sector: "retail-stores", subsector: "stationery" },
  "5944": { code: "5944", description: "Jewelry Stores", count: 64349, sector: "retail-stores", subsector: "jewelry" },
  "5945": { code: "5945", description: "Hobby, Toy, and Game Shops", count: 52236, sector: "retail-stores", subsector: "hobbies" },
  "5946": { code: "5946", description: "Camera and Photographic Supply Stores", count: 8264, sector: "retail-stores", subsector: "camera" },
  "5947": { code: "5947", description: "Gift, Novelty, and Souvenir Shops", count: 98732, sector: "retail-stores", subsector: "gifts" },
  "5948": { code: "5948", description: "Luggage and Leather Goods Stores", count: 15722, sector: "retail-stores", subsector: "luggage" },
  "5949": { code: "5949", description: "Sewing, Needlework, and Piece Goods Stores", count: 14046, sector: "retail-stores", subsector: "sewing" },
  "5961": { code: "5961", description: "Catalog and Mail Order Houses", count: 94345, sector: "retail-stores", subsector: "catalog" },
  "5962": { code: "5962", description: "Automatic Merchandising Machine Operators", count: 10033, sector: "retail-stores", subsector: "vending" },
  "5963": { code: "5963", description: "Direct Selling Establishments", count: 46687, sector: "retail-stores", subsector: "direct-selling" },
  "5983": { code: "5983", description: "Fuel Oil Dealers", count: 5122, sector: "retail-stores", subsector: "fuel" },
  "5984": { code: "5984", description: "Liquefied Petroleum Gas (Bottled Gas) Dealers", count: 9734, sector: "retail-stores", subsector: "lpg" },
  "5992": { code: "5992", description: "Florists", count: 39789, sector: "retail-stores", subsector: "florists" },
  "5993": { code: "5993", description: "Tobacco Stores and Stands", count: 6975, sector: "retail-stores", subsector: "tobacco" },
  "5994": { code: "5994", description: "News Dealers and Newsstands", count: 13998, sector: "retail-stores", subsector: "news" },
  "5995": { code: "5995", description: "Optical Goods Stores", count: 47408, sector: "retail-stores", subsector: "optical" },
  "5999": { code: "5999", description: "Miscellaneous Retail Stores, Not Elsewhere Classified", count: 347589, sector: "retail-stores", subsector: "misc" },

  // ===== RECREATION & ENTERTAINMENT (79xx) =====
  "7911": { code: "7911", description: "Dance Studios, Schools, and Halls", count: 17818, sector: "recreation-entertainment", subsector: "dance" },
  "7922": { code: "7922", description: "Theatrical Producers", count: 83801, sector: "recreation-entertainment", subsector: "theater" },
  "7929": { code: "7929", description: "Bands, Orchestras, Actors, and Other Entertainers", count: 63199, sector: "recreation-entertainment", subsector: "entertainment" },
  "7933": { code: "7933", description: "Bowling Centers", count: 7326, sector: "recreation-entertainment", subsector: "bowling" },
  "7941": { code: "7941", description: "Professional Sports Clubs and Promoters", count: 61029, sector: "recreation-entertainment", subsector: "sports" },
  "7948": { code: "7948", description: "Racing, Including Track Operation", count: 13540, sector: "recreation-entertainment", subsector: "racing" },
  "7991": { code: "7991", description: "Physical Fitness Facilities", count: 88512, sector: "recreation-entertainment", subsector: "gyms", bucketId: "us-rec-gyms" },
  "7992": { code: "7992", description: "Public Golf Courses", count: 47910, sector: "recreation-entertainment", subsector: "golf-courses" },
  "7993": { code: "7993", description: "Coin Operated Amusement Devices", count: 21869, sector: "recreation-entertainment", subsector: "arcade" },
  "7996": { code: "7996", description: "Amusement Parks", count: 11015, sector: "recreation-entertainment", subsector: "amusement" },
  "7997": { code: "7997", description: "Membership Sports and Recreation Clubs", count: 73698, sector: "recreation-entertainment", subsector: "clubs" },
  "7999": { code: "7999", description: "Amusement and Recreation Services, Not Elsewhere Classified", count: 206259, sector: "recreation-entertainment", subsector: "other" },

  // ===== MANUFACTURING - HIGH VALUE (30xx-39xx) =====
  "3241": { code: "3241", description: "Cement, Hydraulic", count: 6658, sector: "manufacturing", subsector: "cement-concrete", bucketId: "us-mfg-cement-concrete" },
  "3272": { code: "3272", description: "Concrete Products, Except Block and Brick", count: 19041, sector: "manufacturing", subsector: "cement-concrete", bucketId: "us-mfg-cement-concrete" },
  "3273": { code: "3273", description: "Ready Mixed Concrete", count: 19390, sector: "manufacturing", subsector: "cement-concrete", bucketId: "us-mfg-cement-concrete" },
};

// ===== HELPER FUNCTIONS =====

// Get SIC code info
export function getSIC(code: string): SICCode | null {
  return SIC_CODES[code] || null;
}

// Get all SIC codes for a sector
export function getSICsForSector(sector: string): SICCode[] {
  return Object.values(SIC_CODES).filter(s => s.sector === sector);
}

// Get all SIC codes for a subsector
export function getSICsForSubsector(subsector: string): SICCode[] {
  return Object.values(SIC_CODES).filter(s => s.subsector === subsector);
}

// Get total record count for a sector
export function getSectorCount(sector: string): number {
  return getSICsForSector(sector).reduce((sum, s) => sum + s.count, 0);
}

// Get total record count for a subsector
export function getSubsectorCount(subsector: string): number {
  return getSICsForSubsector(subsector).reduce((sum, s) => sum + s.count, 0);
}

// Search SIC codes by description
export function searchSICs(query: string): SICCode[] {
  const q = query.toLowerCase();
  return Object.values(SIC_CODES).filter(s =>
    s.description.toLowerCase().includes(q) ||
    s.code.includes(q)
  );
}

// Get high-value SIC codes (>50K records)
export function getHighVolumeSICs(): SICCode[] {
  return Object.values(SIC_CODES)
    .filter(s => s.count >= 50000)
    .sort((a, b) => b.count - a.count);
}

// Summary stats
export const SIC_SUMMARY = {
  totalCodes: Object.keys(SIC_CODES).length,
  totalRecords: Object.values(SIC_CODES).reduce((sum, s) => sum + s.count, 0),
  topSectors: [
    { sector: "healthcare-medical", count: getSectorCount("healthcare-medical") },
    { sector: "professional-services", count: getSectorCount("professional-services") },
    { sector: "real-estate", count: getSectorCount("real-estate") },
    { sector: "financial-services", count: getSectorCount("financial-services") },
    { sector: "restaurants-food", count: getSectorCount("restaurants-food") },
  ].sort((a, b) => b.count - a.count),
};

console.log(`[SIC Codes] Loaded ${Object.keys(SIC_CODES).length} SIC code definitions`);
