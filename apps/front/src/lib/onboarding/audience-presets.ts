/**
 * AUDIENCE PRESETS
 * ═══════════════════════════════════════════════════════════════════════════════
 * Industry-specific defaults for onboarding wizard
 *
 * Each preset configures:
 * - Target roles
 * - SIC codes for company matching
 * - Company size ranges
 * - Revenue ranges (where applicable)
 * - Suggested first message template
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface AudiencePreset {
  id: string;
  industry: string;
  displayName: string;
  description: string;
  icon: string;
  targetRoles: string[];
  sicCodes: string[];
  companySizeRange: string;
  employeeMin?: number;
  employeeMax?: number;
  revenueRange?: string;
  revenueMin?: number;
  revenueMax?: number;
  suggestedMessage: string;
  useCase?: string;
  cadenceTiming: "fast" | "standard" | "slow";
  retargetGapHours: number;
}

/**
 * Real Estate Agents & Brokers
 * Target: Individual agents and small brokerages
 */
export const REAL_ESTATE_PRESET: AudiencePreset = {
  id: "real_estate",
  industry: "real_estate",
  displayName: "Real Estate Agents & Brokers",
  description:
    "Target real estate professionals looking to own their lead generation",
  icon: "🏠",
  targetRoles: [
    "Real Estate Agent",
    "Broker",
    "Realtor",
    "Associate Broker",
    "Managing Broker",
    "Real Estate Salesperson",
    "Listing Agent",
    "Buyer Agent",
  ],
  sicCodes: ["6531"], // Real Estate Agents and Managers
  companySizeRange: "1-10",
  employeeMin: 1,
  employeeMax: 10,
  suggestedMessage:
    "Most agents keep renting their lead generation and never control the system. Nextier changes that. Open to 15 min talk ?",
  useCase:
    "Help agents build owned lead generation systems instead of renting leads",
  cadenceTiming: "fast",
  retargetGapHours: 48,
};

/**
 * Sales Professionals
 * Target: Sales managers and leaders at growing companies
 */
export const SALES_PROFESSIONALS_PRESET: AudiencePreset = {
  id: "sales",
  industry: "sales",
  displayName: "Sales Professionals",
  description: "Target sales leaders who need systematic lead generation",
  icon: "📈",
  targetRoles: [
    "Sales Manager",
    "VP Sales",
    "Vice President of Sales",
    "Sales Director",
    "Director of Sales",
    "Account Executive",
    "Senior Account Executive",
    "BDR",
    "Business Development Representative",
    "SDR",
    "Sales Development Representative",
    "Head of Sales",
    "Chief Revenue Officer",
    "CRO",
  ],
  sicCodes: [
    "5999", // Miscellaneous Retail
    "7389", // Business Services
    "8742", // Management Consulting
  ],
  companySizeRange: "10-100",
  employeeMin: 10,
  employeeMax: 100,
  suggestedMessage:
    "The best sales teams don't chase leads — their system does. That's what we build at Nextier. best email ?",
  useCase: "Help sales teams automate top-of-funnel lead generation",
  cadenceTiming: "fast",
  retargetGapHours: 48,
};

/**
 * CRM Consultants
 * Target: CRM implementation specialists and partners
 */
export const CRM_CONSULTANTS_PRESET: AudiencePreset = {
  id: "crm_consulting",
  industry: "crm_consulting",
  displayName: "CRM Consultants",
  description: "Target CRM consultants who can add lead gen to their services",
  icon: "🔧",
  targetRoles: [
    "CRM Consultant",
    "Salesforce Admin",
    "Salesforce Administrator",
    "Salesforce Consultant",
    "HubSpot Partner",
    "HubSpot Consultant",
    "CRM Implementation Specialist",
    "CRM Manager",
    "Marketing Automation Specialist",
    "RevOps Manager",
    "Revenue Operations Manager",
    "Marketing Operations Manager",
  ],
  sicCodes: [
    "7371", // Computer Programming Services
    "7372", // Prepackaged Software
    "8742", // Management Consulting
  ],
  companySizeRange: "1-25",
  employeeMin: 1,
  employeeMax: 25,
  suggestedMessage:
    "Most CRM consultants focus on setup, not lead flow. Nextier fills the pipeline your clients need. Open to 15 min talk ?",
  useCase:
    "Partner with CRM consultants to add lead generation to their service offering",
  cadenceTiming: "standard",
  retargetGapHours: 72,
};

/**
 * Solopreneurs
 * Target: Solo service providers - personal trainers, yoga instructors, coaches
 */
export const SOLOPRENEURS_PRESET: AudiencePreset = {
  id: "solopreneurs",
  industry: "solopreneurs",
  displayName: "Solopreneurs & Solo Service Providers",
  description:
    "Target personal trainers, yoga instructors, coaches, and solo practitioners",
  icon: "💪",
  targetRoles: [
    "Owner",
    "Founder",
    "Personal Trainer",
    "Fitness Instructor",
    "Yoga Instructor",
    "Pilates Instructor",
    "Life Coach",
    "Business Coach",
    "Health Coach",
    "Wellness Coach",
    "Nutritionist",
    "Massage Therapist",
    "Esthetician",
    "Hair Stylist",
    "Freelancer",
    "Consultant",
    "Therapist",
    "Counselor",
    "Tutor",
    "Music Teacher",
  ],
  sicCodes: [
    "7991", // Physical Fitness Facilities
    "7999", // Amusement and Recreation
    "8049", // Offices of Health Practitioners
    "8099", // Health and Allied Services
    "7231", // Beauty Shops
    "7241", // Barber Shops
    "8299", // Schools and Educational Services
    "8322", // Individual and Family Social Services
    "7941", // Professional Sports Clubs
  ],
  companySizeRange: "1-5",
  employeeMin: 1,
  employeeMax: 5,
  revenueRange: "$50K-$500K",
  revenueMin: 50000,
  revenueMax: 500000,
  suggestedMessage:
    "Most solo practitioners rely on referrals and hope. Nextier builds you a predictable client pipeline. Open to 15 min talk ?",
  useCase: "Help solopreneurs build consistent client acquisition systems",
  cadenceTiming: "standard",
  retargetGapHours: 48,
};

/**
 * Blue Collar Exits
 * Target: Business owners in blue collar industries thinking about expansion or exit
 * Use case: Source deals for Business Brokers
 */
export const BLUE_COLLAR_EXITS_PRESET: AudiencePreset = {
  id: "blue_collar_exits",
  industry: "blue_collar_exits",
  displayName: "Blue Collar Business Owners",
  description:
    "Source deals for Business Brokers - owners thinking about expansion or exit",
  icon: "🔨",
  targetRoles: [
    "Owner",
    "Proprietor",
    "President",
    "Founder",
    "Co-Founder",
    "CEO",
    "Managing Member",
    "Principal",
    "Partner",
  ],
  sicCodes: [
    "1711", // Plumbing, Heating, AC
    "1731", // Electrical Work
    "1761", // Roofing, Siding, Sheet Metal
    "7349", // Building Cleaning and Maintenance
    "7538", // General Automotive Repair
    "4214", // Local Trucking with Storage
    "1521", // General Contractors - Single Family
    "5812", // Eating Places (Restaurants)
    "7231", // Beauty Shops
    "1799", // Special Trade Contractors
    "7699", // Repair Shops and Related Services
    "4212", // Local Trucking without Storage
    "1629", // Heavy Construction
    "5541", // Gasoline Service Stations
  ],
  companySizeRange: "5-50",
  employeeMin: 5,
  employeeMax: 50,
  revenueRange: "$500K-$5M",
  revenueMin: 500000,
  revenueMax: 5000000,
  suggestedMessage:
    "Ever wonder what your business could sell for? I can get you a valuation. Best email ?",
  useCase:
    "Source deals for Business Brokers - owners thinking about expansion or exit",
  cadenceTiming: "slow",
  retargetGapHours: 72,
};

/**
 * All presets indexed by ID
 */
export const AUDIENCE_PRESETS: Record<string, AudiencePreset> = {
  real_estate: REAL_ESTATE_PRESET,
  sales: SALES_PROFESSIONALS_PRESET,
  crm_consulting: CRM_CONSULTANTS_PRESET,
  solopreneurs: SOLOPRENEURS_PRESET,
  blue_collar_exits: BLUE_COLLAR_EXITS_PRESET,
};

/**
 * Ordered list for display in wizard
 */
export const AUDIENCE_PRESET_LIST: AudiencePreset[] = [
  REAL_ESTATE_PRESET,
  SALES_PROFESSIONALS_PRESET,
  CRM_CONSULTANTS_PRESET,
  SOLOPRENEURS_PRESET,
  BLUE_COLLAR_EXITS_PRESET,
];

/**
 * Get preset by industry ID
 */
export function getPresetByIndustry(industryId: string): AudiencePreset | null {
  return AUDIENCE_PRESETS[industryId] || null;
}

/**
 * Get default audience profile from preset
 */
export function getDefaultAudienceProfile(preset: AudiencePreset) {
  return {
    industry: preset.industry,
    targetRoles: preset.targetRoles,
    sicCodes: preset.sicCodes,
    companySizeRange: preset.companySizeRange,
    employeeMin: preset.employeeMin,
    employeeMax: preset.employeeMax,
    revenueRange: preset.revenueRange,
    revenueMin: preset.revenueMin,
    revenueMax: preset.revenueMax,
    geography: {
      states: [],
      cities: [],
      zips: [],
    },
  };
}

/**
 * Get cadence configuration from preset
 */
export function getCadenceConfig(preset: AudiencePreset) {
  const baseConfig = {
    retargetGapHours: preset.retargetGapHours,
    maxRetargets: 3,
    followUpGapHours: 24,
    maxFollowUps: 3,
    blackoutStart: 20, // 8 PM
    blackoutEnd: 9, // 9 AM
  };

  switch (preset.cadenceTiming) {
    case "fast":
      return {
        ...baseConfig,
        retargetGapHours: 48,
        followUpGapHours: 4,
      };
    case "slow":
      return {
        ...baseConfig,
        retargetGapHours: 72,
        followUpGapHours: 48,
      };
    default:
      return baseConfig;
  }
}
