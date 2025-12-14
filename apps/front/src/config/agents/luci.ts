/**
 * LUCI - Lead Understanding & Classification Intelligence
 *
 * High IQ Data Scientist specializing in:
 * - Real Estate data analysis (RealEstateAPI)
 * - Business intelligence (USBizData)
 * - B2B enrichment (Apollo.io)
 * - Skip tracing and contact discovery
 * - Property ownership cross-referencing
 *
 * Persona: Master's in Data Science, analytical, precise, thorough
 */

export const LUCI_AGENT = {
  id: "luci",
  name: "LUCI",
  fullName: "Lead Understanding & Classification Intelligence",
  version: "2.0.0",

  // Persona
  persona: {
    description:
      "LUCI is a high-IQ data scientist with a Master's in Data Science. She's the brain behind the lead generation machine - mastering PostgreSQL databases, DigitalOcean Spaces, real estate analytics, business intelligence, and B2B enrichment. Analytical, precise, and thorough - she finds patterns others miss and turns raw data into qualified leads.",
    traits: [
      "Analytical and methodical",
      "Data-driven decision making",
      "Pattern recognition expert",
      "Cross-references multiple data sources",
      "Prioritizes high-value opportunities",
      "Database optimization specialist",
      "Cloud storage architect",
      "Full-stack data pipeline master",
    ],
    expertise: [
      // Database & Storage
      "PostgreSQL database design and optimization",
      "Drizzle ORM query building",
      "DigitalOcean Spaces (S3-compatible) file management",
      "JSON/JSONB data handling",
      "Database indexing and performance tuning",
      // Data Sources
      "Real Estate API data analysis",
      "USBizData business intelligence",
      "Apollo.io B2B enrichment",
      "Skip tracing and contact discovery",
      "Property ownership analysis",
      // Classification
      "SIC/NAICS industry classification",
      "Revenue and employee size analysis",
      "Acquisition target identification",
      // Platform Mastery
      "Lead generation pipeline architecture",
      "Multi-channel campaign orchestration",
      "Data lake management",
      "Bucket/Lead lifecycle management",
    ],
  },

  // Platform Understanding - LUCI knows the whole system
  platformMastery: {
    description: "LUCI understands the entire lead generation machine",
    components: {
      dataLake: {
        tables: [
          "businesses",
          "properties",
          "leads",
          "contacts",
          "dataSources",
        ],
        purpose: "Raw data ingestion from USBizData, RealEstateAPI, Apollo",
      },
      buckets: {
        description: "Saved searches with lead management",
        workflow: "Filters -> Bucket -> Leads -> Enrichment -> Campaigns",
      },
      enrichmentPipeline: {
        steps: [
          "1. Import raw data (CSV/API)",
          "2. Auto-tag and classify",
          "3. Skip trace owners (get personal contact)",
          "4. Cross-reference property ownership",
          "5. Score and prioritize",
          "6. Push to campaigns",
        ],
      },
      campaigns: {
        channels: ["SMS (Gianna)", "Email", "Power Dialer", "Direct Mail"],
        agents: ["Gianna (SMS/Voice)", "Sabrina (Email)", "LUCI (Data)"],
      },
      deals: {
        pipeline: [
          "Discovery",
          "Qualification",
          "Proposal",
          "Negotiation",
          "Contract",
          "Closing",
        ],
        types: [
          "B2B Exit",
          "Commercial",
          "Assemblage",
          "Blue Collar Exit",
          "Development",
        ],
      },
    },
    databases: {
      primary: "PostgreSQL on DigitalOcean",
      schema: "Drizzle ORM with typed queries",
      storage: "DigitalOcean Spaces (S3-compatible)",
    },
  },

  // Core Skills
  skills: {
    // SKILL 1: Data Lake Scanning
    scan: {
      name: "Data Lake Scan",
      description: "Scan entire business database with auto-tagging",
      modes: {
        sequential: "Process in order of creation (oldest first)",
        shuffle: "Random sampling for diverse campaigns",
        priority: "High-value targets first (by revenue)",
      },
      outputs: ["Tagged businesses", "Priority scores", "Tag distribution"],
    },

    // SKILL 2: Owner Skip Tracing
    skipTrace: {
      name: "Owner Skip Trace",
      description: "Skip trace the OWNER (person, not company)",
      process: [
        "Extract owner name from business record",
        "Use business address as starting point",
        "Query RealEstateAPI SkipTrace endpoint",
        "Label phones as MOBILE vs LANDLINE",
        "Capture emails and mailing address",
      ],
      outputs: [
        "Mobile phones",
        "Landline phones",
        "Emails",
        "Mailing address",
      ],
    },

    // SKILL 3: Property Cross-Reference
    propertyLookup: {
      name: "Property Ownership Lookup",
      description: "Find properties owned by business owner",
      process: [
        "Take owner first/last name",
        "Query RealEstateAPI PropertySearch by owner name",
        "Return all properties owned by that person",
        "Calculate total equity across properties",
        "Flag multi-property and high-equity owners",
      ],
      outputs: ["Properties owned", "Total property value", "Total equity"],
    },

    // SKILL 4: Auto-Tagging
    autoTag: {
      name: "Intelligent Auto-Tagging",
      description: "Apply smart tags based on business characteristics",
      categories: {
        acquisition: {
          tags: ["blue-collar", "acquisition-target", "sweet-spot-revenue"],
          criteria:
            "SIC 15-17, 34-39, 42, 49, 75-76 + 5-50 employees + $500K-$10M revenue",
        },
        techIntegration: {
          tags: ["tech-integration", "scale-ready"],
          criteria: "SIC 50-51, 60-64, 73, 80, 82, 87 + 20+ employees",
        },
        exit: {
          tags: [
            "exit-prep-timing",
            "mature-ownership",
            "potential-exit",
            "succession-planning",
          ],
          criteria:
            "5-15 years old (exit timing) OR 20+ years old (mature/succession)",
        },
        expansion: {
          tags: ["expansion-candidate"],
          criteria: "10-100 employees + $1M+ revenue",
        },
        propertyOwner: {
          tags: [
            "property-owner",
            "multi-property-owner",
            "high-equity-property-owner",
          ],
          criteria:
            "Owns real estate, owns 3+ properties, or has >$100K equity",
        },
      },
    },

    // SKILL 5: Campaign Generation
    campaignGen: {
      name: "Daily Campaign Generation",
      description: "Generate campaigns for each outreach channel",
      channels: {
        sms: {
          requirement: "Mobile phone number",
          priority: ["acquisition-target", "potential-exit"],
          dailyLimit: 50,
        },
        email: {
          requirement: "Email address",
          priority: ["tech-integration", "expansion-candidate"],
          dailyLimit: 100,
        },
        call: {
          requirement: "Any phone number",
          priority: ["high-equity-property-owner", "mature-ownership"],
          dailyLimit: 30,
        },
      },
    },
  },

  // Auto-Tagging Rules (SIC Code based)
  tagRules: {
    blueCollar: {
      sicPrefixes: [
        "15",
        "16",
        "17",
        "07",
        "34",
        "35",
        "36",
        "37",
        "38",
        "39",
        "42",
        "49",
        "75",
        "76",
      ],
      description:
        "Construction, Manufacturing, Trucking, Utilities, Repair Services",
    },
    techIntegration: {
      sicPrefixes: ["50", "51", "60", "61", "63", "64", "73", "80", "82", "87"],
      description:
        "Wholesale, Finance, Insurance, Business Services, Healthcare, Education, Consulting",
    },
  },

  // Priority Scoring
  priorityScoring: {
    factors: [
      { factor: "Blue collar SIC code", points: 1 },
      { factor: "5-50 employees (acquisition sweet spot)", points: 2 },
      { factor: "$500K-$10M revenue", points: 2 },
      { factor: "Tech integration SIC code", points: 1 },
      { factor: "20+ employees (scale ready)", points: 1 },
      { factor: "5-15 years old (exit timing)", points: 1 },
      { factor: "20+ years old (mature ownership)", points: 2 },
      { factor: "30+ years old (succession planning)", points: 1 },
      { factor: "$1M+ revenue + 10-100 employees (expansion)", points: 1 },
      { factor: "Owner name identified", points: 1 },
    ],
    thresholds: {
      high: 5, // 5+ points = high priority
      medium: 3, // 3-4 points = medium priority
      low: 0, // 0-2 points = low priority
    },
  },

  // API Endpoints
  endpoints: {
    pipeline: "/api/luci/pipeline",
    actions: {
      scan: "POST /api/luci/pipeline { action: 'scan', scanMode, limit, tagFilter }",
      enrich:
        "POST /api/luci/pipeline { action: 'enrich', businessIds, skipTraceEnabled, crossReferenceProperties }",
      generateCampaigns:
        "POST /api/luci/pipeline { action: 'generate-campaigns', channels, targetTags, campaignsPerChannel }",
    },
  },

  // Scheduled Jobs
  scheduledJobs: {
    dailyScan: {
      name: "Daily Data Lake Scan",
      schedule: "0 6 * * *", // 6 AM daily
      action: "scan",
      config: {
        scanMode: "priority",
        limit: 1000,
      },
    },
    dailyCampaigns: {
      name: "Daily Campaign Generation",
      schedule: "0 7 * * *", // 7 AM daily
      action: "generate-campaigns",
      config: {
        channels: ["sms", "email", "call"],
        targetTags: ["acquisition-target", "potential-exit", "property-owner"],
        campaignsPerChannel: 50,
      },
    },
    weeklyEnrichment: {
      name: "Weekly Deep Enrichment",
      schedule: "0 2 * * 0", // 2 AM Sunday
      action: "enrich",
      config: {
        tagFilter: ["acquisition-target", "high-priority"],
        skipTraceEnabled: true,
        crossReferenceProperties: true,
      },
    },
  },
};

// Export individual components for easy access
export const LUCI_SKILLS = LUCI_AGENT.skills;
export const LUCI_TAG_RULES = LUCI_AGENT.tagRules;
export const LUCI_PRIORITY_SCORING = LUCI_AGENT.priorityScoring;
export const LUCI_SCHEDULED_JOBS = LUCI_AGENT.scheduledJobs;

// Helper: Get LUCI system prompt for AI interactions
export function getLuciSystemPrompt(): string {
  return `You are LUCI (Lead Understanding & Classification Intelligence), a high-IQ data scientist with a Master's in Data Science.

EXPERTISE:
- Real Estate API data analysis and property valuation
- USBizData business intelligence and SIC/NAICS classification
- Apollo.io B2B enrichment and company research
- Skip tracing to find owner contact information
- Property ownership cross-referencing

YOUR ROLE:
1. Scan the business data lake and identify high-value targets
2. Auto-tag businesses for: acquisition, tech integration, exit prep, expansion
3. Skip trace OWNERS (the person, not the company) to get their direct contact
4. Cross-reference to find properties owned by business owners
5. Generate daily campaigns for SMS, email, and call channels

PRIORITY TARGETS:
- Blue collar businesses (construction, manufacturing, repair) with 5-50 employees
- $500K-$10M revenue (acquisition sweet spot)
- 20+ year old businesses (owner ready to exit)
- Business owners who also own real estate (multi-angle opportunity)

Be analytical, precise, and data-driven. Find patterns others miss. Prioritize high-value opportunities.`;
}

// Helper: Validate business against LUCI criteria
export function evaluateBusinessForLuci(business: {
  sicCode?: string | null;
  employeeCount?: number | null;
  annualRevenue?: number | null;
  yearsInBusiness?: number | null;
  yearEstablished?: number | null;
  ownerName?: string | null;
}): {
  tags: string[];
  priority: "high" | "medium" | "low";
  score: number;
  reasons: string[];
} {
  const tags: string[] = [];
  const reasons: string[] = [];
  let score = 0;

  const sicPrefix = business.sicCode?.substring(0, 2) || "";

  // Blue collar check
  if (LUCI_AGENT.tagRules.blueCollar.sicPrefixes.includes(sicPrefix)) {
    tags.push("blue-collar");
    reasons.push("Blue collar industry (SIC " + sicPrefix + ")");
    score += 1;

    if (
      business.employeeCount &&
      business.employeeCount >= 5 &&
      business.employeeCount <= 50
    ) {
      tags.push("acquisition-target");
      reasons.push("Acquisition sweet spot: 5-50 employees");
      score += 2;
    }

    if (
      business.annualRevenue &&
      business.annualRevenue >= 500000 &&
      business.annualRevenue <= 10000000
    ) {
      tags.push("sweet-spot-revenue");
      reasons.push("Sweet spot revenue: $500K-$10M");
      score += 2;
    }
  }

  // Tech integration check
  if (LUCI_AGENT.tagRules.techIntegration.sicPrefixes.includes(sicPrefix)) {
    tags.push("tech-integration");
    reasons.push("Tech integration candidate (SIC " + sicPrefix + ")");
    score += 1;

    if (business.employeeCount && business.employeeCount >= 20) {
      tags.push("scale-ready");
      reasons.push("Scale ready: 20+ employees");
      score += 1;
    }
  }

  // Exit timing
  if (
    business.yearsInBusiness &&
    business.yearsInBusiness >= 5 &&
    business.yearsInBusiness <= 15
  ) {
    tags.push("exit-prep-timing");
    reasons.push("Prime exit window: 5-15 years old");
    score += 1;
  }

  // Mature ownership
  if (business.yearEstablished) {
    const age = new Date().getFullYear() - business.yearEstablished;
    if (age >= 20) {
      tags.push("mature-ownership");
      tags.push("potential-exit");
      reasons.push("Mature ownership: " + age + " years old");
      score += 2;
    }
    if (age >= 30) {
      tags.push("succession-planning");
      reasons.push("Succession planning likely: 30+ years");
      score += 1;
    }
  }

  // Expansion candidate
  if (
    business.employeeCount &&
    business.employeeCount >= 10 &&
    business.employeeCount <= 100
  ) {
    if (business.annualRevenue && business.annualRevenue >= 1000000) {
      tags.push("expansion-candidate");
      reasons.push("Expansion candidate: $1M+ revenue, 10-100 employees");
      score += 1;
    }
  }

  // Owner identified
  if (business.ownerName) {
    tags.push("owner-identified");
    reasons.push("Owner identified: can skip trace");
    score += 1;
  }

  // Calculate priority
  let priority: "high" | "medium" | "low" = "low";
  if (score >= LUCI_AGENT.priorityScoring.thresholds.high) {
    priority = "high";
  } else if (score >= LUCI_AGENT.priorityScoring.thresholds.medium) {
    priority = "medium";
  }

  return { tags, priority, score, reasons };
}

export default LUCI_AGENT;
