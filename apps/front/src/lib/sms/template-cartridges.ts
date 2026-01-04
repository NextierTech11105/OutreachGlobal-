/**
 * TEMPLATE CARTRIDGE SYSTEM
 * =========================
 * Modular template packs that only get injected when activated.
 *
 * Cartridges are self-contained template packages for specific:
 * - Industries (real estate, blue collar, consulting)
 * - Use cases (exit, expansion, lead gen)
 * - Audiences (B2B, B2C, enterprise)
 *
 * Usage:
 * 1. Import the cartridge manager
 * 2. Activate cartridges by ID
 * 3. Get combined templates from active cartridges only
 *
 * Example:
 *   cartridgeManager.activate("business-brokering");
 *   cartridgeManager.activate("blue-collar");
 *   const templates = cartridgeManager.getActiveTemplates();
 */

import type {
  SMSTemplate,
  AIWorker,
  CampaignStage,
} from "./campaign-templates";

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TemplateCartridge {
  id: string;
  name: string;
  description: string;
  audience: string;
  industries: string[];
  templates: SMSTemplate[];
  active: boolean;
  sicCodes?: string[];
  keywords?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: M&A ADVISORY
// For business owners considering acquisition, sale, or strategic growth
// ═══════════════════════════════════════════════════════════════════════════════

export const BUSINESS_BROKERING_CARTRIDGE: TemplateCartridge = {
  id: "business-brokering",
  name: "M&A Advisory",
  description:
    "High-converting templates for acquisition, exit planning, and strategic growth advisory",
  audience: "Business Owners, CEOs, Founders exploring strategic options",
  industries: [
    "professional services",
    "manufacturing",
    "technology",
    "healthcare",
  ],
  active: false,
  sicCodes: ["8742", "8748", "6282"],
  keywords: ["acquisition", "exit", "valuation", "strategic", "m&a", "growth"],
  templates: [
    {
      id: "bb-1",
      name: "Strategic Options",
      message:
        "{{name}} — quick question: are you building to scale or building to sell? Different playbooks for each. Which one fits you?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["qualification", "strategic", "m&a"],
      variables: ["name"],
      charCount: 124,
    },
    {
      id: "bb-2",
      name: "Acquisition Interest",
      message:
        "{{name}}, I advise owners on strategic moves — acquisitions, partnerships, exits. What's on your radar right now?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["advisory", "strategic", "m&a"],
      variables: ["name"],
      charCount: 118,
    },
    {
      id: "bb-3",
      name: "Market Timing",
      message:
        "{{name}}, market conditions favor sellers right now. Have you thought about what that means for {{businessName}}?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["market", "timing", "exit"],
      variables: ["name", "businessName"],
      charCount: 115,
    },
    {
      id: "bb-4",
      name: "Confidential Assessment",
      message:
        "{{name}} — I run confidential business assessments for owners exploring their options. Interested in yours?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["valuation", "confidential", "m&a"],
      variables: ["name"],
      charCount: 112,
    },
    {
      id: "bb-5",
      name: "Growth Capital",
      message:
        "{{name}}, looking to accelerate growth or take chips off the table? Both require knowing your real number. Want it?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["growth", "capital", "valuation"],
      variables: ["name"],
      charCount: 120,
    },
    {
      id: "bb-6",
      name: "Buyer Landscape",
      message:
        "{{name}}, I track who's buying in your space. Want to know what acquirers are paying for companies like yours?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["buyers", "market-intel", "m&a"],
      variables: ["name"],
      charCount: 116,
    },
    {
      id: "bb-7",
      name: "Exit Readiness",
      message:
        "{{name}}, most owners aren't exit-ready when opportunity knocks. Quick check: would {{businessName}} pass buyer due diligence today?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["exit-planning", "readiness", "m&a"],
      variables: ["name", "businessName"],
      charCount: 132,
    },
    {
      id: "bb-8",
      name: "Strategic Advisor",
      message:
        "{{name}}, I'm a strategic advisor — not a broker. I help owners maximize value whether they sell or scale. Coffee?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["advisory", "positioning", "m&a"],
      variables: ["name"],
      charCount: 118,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: TECHNOLOGY VALUE-ADD
// Revenue operations, automation, and tech-enabled growth
// ═══════════════════════════════════════════════════════════════════════════════

export const CRM_CONSULTANTS_CARTRIDGE: TemplateCartridge = {
  id: "crm-consultants",
  name: "Technology Value-Add",
  description:
    "Templates for revenue operations, automation, and technology-enabled business growth",
  audience: "Business Owners, Operations Leaders, Growth-Focused Executives",
  industries: ["professional services", "technology", "b2b services"],
  active: false,
  sicCodes: ["7371", "7372", "8742"],
  keywords: [
    "automation",
    "revenue operations",
    "technology",
    "efficiency",
    "growth",
  ],
  templates: [
    {
      id: "crm-1",
      name: "Revenue Leakage",
      message:
        "{{name}}, most businesses lose 15-20% of revenue to broken processes. Quick question: do you know where yours are leaking?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["revenue", "operations", "value-add"],
      variables: ["name"],
      charCount: 128,
    },
    {
      id: "crm-2",
      name: "Operational Efficiency",
      message:
        "{{name}}, I help businesses cut operational waste and increase margins. What's your biggest bottleneck right now?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["operations", "efficiency", "value-add"],
      variables: ["name"],
      charCount: 118,
    },
    {
      id: "crm-3",
      name: "Growth Infrastructure",
      message:
        "{{name}}, scaling without breaking requires the right infrastructure. Is {{businessName}} set up to double in 12 months?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["growth", "scaling", "infrastructure"],
      variables: ["name", "businessName"],
      charCount: 120,
    },
    {
      id: "crm-4",
      name: "Automation ROI",
      message:
        "{{name}}, how much of your team's time goes to tasks a machine could handle? I help owners reclaim that time. Interested?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["automation", "roi", "efficiency"],
      variables: ["name"],
      charCount: 124,
    },
    {
      id: "crm-5",
      name: "Tech Stack Audit",
      message:
        "{{name}}, paying for tools you don't use? Most businesses are. Want a quick audit of what's working and what's waste?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["technology", "audit", "cost-savings"],
      variables: ["name"],
      charCount: 122,
    },
    {
      id: "crm-6",
      name: "Process Optimization",
      message:
        "{{name}}, I optimize business processes for owners who want to work less and earn more. That sound like you?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["process", "optimization", "value-add"],
      variables: ["name"],
      charCount: 112,
    },
    {
      id: "crm-7",
      name: "Data Intelligence",
      message:
        "{{name}}, are you making decisions on gut or data? I help businesses unlock insights they're already sitting on. Worth a chat?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["data", "intelligence", "value-add"],
      variables: ["name"],
      charCount: 130,
    },
    {
      id: "crm-8",
      name: "Systems Integration",
      message:
        "{{name}}, how many disconnected systems is your team juggling? I connect the dots so nothing falls through. Interested?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["systems", "integration", "efficiency"],
      variables: ["name"],
      charCount: 124,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: BLUE COLLAR BUSINESSES
// Service-based business owners - sell Nextier to them
// ═══════════════════════════════════════════════════════════════════════════════

export const BLUE_COLLAR_CARTRIDGE: TemplateCartridge = {
  id: "blue-collar",
  name: "Blue Collar Businesses",
  description:
    "Outreach templates to sell Nextier to service-based business owners",
  audience:
    "HVAC, Plumbing, Electrical, Landscaping, Contracting Business Owners",
  industries: [
    "construction",
    "home services",
    "field services",
    "contracting",
  ],
  active: false,
  sicCodes: ["1711", "1721", "1731", "1761", "0781"],
  keywords: [
    "contractor",
    "plumber",
    "electrician",
    "hvac",
    "landscaping",
    "service business",
  ],
  templates: [
    {
      id: "bc-1",
      name: "Lead Flow",
      message:
        "{{name}}, tired of waiting on referrals? I help service business owners build consistent lead flow. Want to see how?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["leads", "growth", "blue-collar"],
      variables: ["name"],
      charCount: 118,
    },
    {
      id: "bc-2",
      name: "Booking System",
      message:
        "{{name}}, most contractors lose jobs because they're too slow to follow up. I fix that problem. Interested?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["automation", "follow-up", "blue-collar"],
      variables: ["name"],
      charCount: 110,
    },
    {
      id: "bc-3",
      name: "Missed Calls",
      message:
        "{{name}}, how many calls does {{businessName}} miss while you're on a job? I help owners capture every lead. Worth a look?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["leads", "capture", "blue-collar"],
      variables: ["name", "businessName"],
      charCount: 122,
    },
    {
      id: "bc-4",
      name: "Reputation Builder",
      message:
        "{{name}}, reviews drive the business but asking is awkward. I automate the ask and watch the 5-stars pile up. Interested?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["reviews", "reputation", "blue-collar"],
      variables: ["name"],
      charCount: 124,
    },
    {
      id: "bc-5",
      name: "Stop Chasing",
      message:
        "{{name}}, you're too good at what you do to waste time chasing quotes. Let me show you how to flip that script.",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["efficiency", "sales", "blue-collar"],
      variables: ["name"],
      charCount: 114,
    },
    {
      id: "bc-6",
      name: "Weekend Freedom",
      message:
        "{{name}}, what if your phone stopped ringing on weekends but the jobs kept coming? That's what I build. Want to see?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["automation", "lifestyle", "blue-collar"],
      variables: ["name"],
      charCount: 118,
    },
    {
      id: "bc-7",
      name: "Competitor Edge",
      message:
        "{{name}}, your competitors are using tech to book faster. I can put you ahead of them in 30 days. Worth 15 minutes?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["competition", "technology", "blue-collar"],
      variables: ["name"],
      charCount: 120,
    },
    {
      id: "bc-8",
      name: "Grow or Stabilize",
      message:
        "{{name}}, looking to grow the crew or just want steadier work for the one you've got? Either way, I can help. Chat?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["growth", "stability", "blue-collar"],
      variables: ["name"],
      charCount: 118,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: REAL ESTATE AGENT CLIENT LIBRARY
// Templates for Nextier Real Estate Agent clients to use with their prospects
// INACTIVE until a real estate agent signs up as a client
// ═══════════════════════════════════════════════════════════════════════════════

export const REAL_ESTATE_CARTRIDGE: TemplateCartridge = {
  id: "real-estate",
  name: "Real Estate Agent Library",
  description:
    "Template library for Real Estate Agent clients - unlocked when they sign up",
  audience: "Homebuyers, Sellers, Sphere of Influence",
  industries: ["real estate", "residential", "property"],
  active: false, // INACTIVE - Only activate for real estate agent clients
  sicCodes: ["6531"],
  keywords: ["homeowner", "buyer", "seller", "listing", "property", "sphere"],
  templates: [
    // --- SELLER PROSPECTING ---
    {
      id: "re-seller-1",
      name: "Seller - Market Update",
      message:
        "{{name}}, homes in {{neighborhood}} are selling fast. Your neighbor just got ${{price}} over asking. Curious what yours could get?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["seller", "market-update"],
      variables: ["name", "neighborhood", "price"],
      charCount: 124,
    },
    {
      id: "re-seller-2",
      name: "Seller - Free Valuation",
      message:
        "{{name}}, thinking about selling? I can get you a free market analysis of {{address}} — no strings. Want it?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["seller", "valuation"],
      variables: ["name", "address"],
      charCount: 112,
    },
    {
      id: "re-seller-3",
      name: "Seller - Buyer Demand",
      message:
        "{{name}}, I have buyers looking in your area right now. Ever thought about what your home could sell for?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["seller", "buyer-demand"],
      variables: ["name"],
      charCount: 108,
    },
    // --- BUYER PROSPECTING ---
    {
      id: "re-buyer-1",
      name: "Buyer - Off-Market",
      message:
        "{{name}}, I have access to off-market listings in {{area}} before they hit Zillow. Want first look?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["buyer", "off-market"],
      variables: ["name", "area"],
      charCount: 102,
    },
    {
      id: "re-buyer-2",
      name: "Buyer - Rate Drop",
      message:
        "{{name}}, rates just dropped. If you've been waiting to buy, now might be the time. Want to chat strategy?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["buyer", "rates"],
      variables: ["name"],
      charCount: 110,
    },
    // --- SPHERE OF INFLUENCE ---
    {
      id: "re-sphere-1",
      name: "Sphere - Check In",
      message:
        "{{name}}, just checking in! How's everything going? If you or anyone you know is thinking about moving, I'm here to help.",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["sphere", "referral"],
      variables: ["name"],
      charCount: 124,
    },
    {
      id: "re-sphere-2",
      name: "Sphere - Referral Ask",
      message:
        "{{name}}, hope all is well! Quick question — know anyone thinking about buying or selling? I'd love to help them out.",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["sphere", "referral-ask"],
      variables: ["name"],
      charCount: 120,
    },
    {
      id: "re-sphere-3",
      name: "Sphere - Home Anniversary",
      message:
        "{{name}}, happy home anniversary! It's been {{years}} years since you moved in. Ever wonder what it's worth now?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["sphere", "anniversary"],
      variables: ["name", "years"],
      charCount: 116,
    },
    // --- JUST LISTED / JUST SOLD ---
    {
      id: "re-listed-1",
      name: "Just Listed - Neighbor Alert",
      message:
        "{{name}}, I just listed a home on your street at {{address}}. If you're curious what this means for your home value, let me know!",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["listed", "neighbor"],
      variables: ["name", "address"],
      charCount: 134,
    },
    {
      id: "re-sold-1",
      name: "Just Sold - Neighbor Alert",
      message:
        "{{name}}, the home at {{address}} just sold for ${{price}}! Want to know what this means for your property value?",
      stage: "initial" as CampaignStage,
      worker: "GIANNA" as AIWorker,
      tags: ["sold", "neighbor"],
      variables: ["name", "address", "price"],
      charCount: 118,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: CATHY NUDGE TEMPLATES
// Follow-up nudges with humor (Leslie Nielsen / Henny Youngman style)
// ═══════════════════════════════════════════════════════════════════════════════

export const CATHY_NUDGE_CARTRIDGE: TemplateCartridge = {
  id: "cathy-nudge",
  name: "CATHY Nudge Templates",
  description:
    "Follow-up nudge templates with escalating humor for re-engagement",
  audience: "Leads who haven't responded - ghosted or dormant",
  industries: ["all"],
  active: true, // Always active for internal use
  keywords: ["nudge", "follow-up", "humor", "re-engage"],
  templates: [
    // MILD (Attempts 1-2)
    {
      id: "cathy-nudge-mild-1",
      name: "Mild - First Followup",
      message:
        "Hey {{firstName}}, just checking in! Did my last message get lost in the void? 😅",
      stage: "followup" as CampaignStage,
      worker: "CATHY" as AIWorker,
      tags: ["nudge", "mild", "first-followup"],
      variables: ["firstName"],
      charCount: 82,
    },
    {
      id: "cathy-nudge-mild-2",
      name: "Mild - General",
      message:
        "{{firstName}} — hope you're having a good week! Still interested in chatting about your property?",
      stage: "followup" as CampaignStage,
      worker: "CATHY" as AIWorker,
      tags: ["nudge", "mild", "general"],
      variables: ["firstName"],
      charCount: 98,
    },
    {
      id: "cathy-nudge-mild-3",
      name: "Mild - Quick Check",
      message:
        "Quick follow-up {{firstName}} — I know inboxes get crazy. Worth a chat?",
      stage: "followup" as CampaignStage,
      worker: "CATHY" as AIWorker,
      tags: ["nudge", "mild", "general"],
      variables: ["firstName"],
      charCount: 72,
    },
    // MEDIUM (Attempts 3-4)
    {
      id: "cathy-nudge-med-1",
      name: "Medium - Ghosted",
      message:
        "{{firstName}}... still there? I promise I'm more interesting than my messages make me seem 😂",
      stage: "followup" as CampaignStage,
      worker: "CATHY" as AIWorker,
      tags: ["nudge", "medium", "ghosted"],
      variables: ["firstName"],
      charCount: 96,
    },
    {
      id: "cathy-nudge-med-2",
      name: "Medium - Pizza",
      message:
        "{{firstName}} — at this point I should probably send flowers. Or pizza. Pizza usually works.",
      stage: "followup" as CampaignStage,
      worker: "CATHY" as AIWorker,
      tags: ["nudge", "medium", "ghosted"],
      variables: ["firstName"],
      charCount: 98,
    },
    {
      id: "cathy-nudge-med-3",
      name: "Medium - Mother-in-law",
      message:
        "I've had better luck reaching my mother-in-law, {{firstName}}. And she ignores me on purpose!",
      stage: "followup" as CampaignStage,
      worker: "CATHY" as AIWorker,
      tags: ["nudge", "medium", "ghosted"],
      variables: ["firstName"],
      charCount: 96,
    },
    {
      id: "cathy-nudge-med-4",
      name: "Medium - Third Time",
      message:
        "Third time's the charm, right? That's what I told my third husband. {{firstName}}, got 5 mins?",
      stage: "followup" as CampaignStage,
      worker: "CATHY" as AIWorker,
      tags: ["nudge", "medium", "third-attempt"],
      variables: ["firstName"],
      charCount: 98,
    },
    // SPICY (Attempts 5+)
    {
      id: "cathy-nudge-spicy-1",
      name: "Spicy - Last Shot",
      message:
        "{{firstName}}, either you're really busy or I'm really boring. Hoping it's the first one! 😅 Last shot — worth a quick call?",
      stage: "followup" as CampaignStage,
      worker: "CATHY" as AIWorker,
      tags: ["nudge", "spicy", "final-attempt"],
      variables: ["firstName"],
      charCount: 122,
    },
    {
      id: "cathy-nudge-spicy-2",
      name: "Spicy - Aliens",
      message:
        "{{firstName}} — if you don't respond, I'll assume you've been abducted by aliens. Blink twice if you need help... or just text back?",
      stage: "followup" as CampaignStage,
      worker: "CATHY" as AIWorker,
      tags: ["nudge", "spicy", "ghosted"],
      variables: ["firstName"],
      charCount: 138,
    },
    {
      id: "cathy-nudge-spicy-3",
      name: "Spicy - No Warranty",
      message:
        "Not gonna lie {{firstName}}, I'm running out of clever things to say. At least I'm not selling extended warranties. 10 mins?",
      stage: "followup" as CampaignStage,
      worker: "CATHY" as AIWorker,
      tags: ["nudge", "spicy", "final-attempt"],
      variables: ["firstName"],
      charCount: 122,
    },
    {
      id: "cathy-nudge-spicy-4",
      name: "Spicy - Kids Jealous",
      message:
        "{{firstName}}, I've now texted you more than I text my kids. They're jealous. Can we at least have a quick chat so I feel productive?",
      stage: "followup" as CampaignStage,
      worker: "CATHY" as AIWorker,
      tags: ["nudge", "spicy", "persistent"],
      variables: ["firstName"],
      charCount: 140,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: SABRINA OBJECTION HANDLING
// Agree-Overcome-Close responses to common objections
// ═══════════════════════════════════════════════════════════════════════════════

export const SABRINA_OBJECTION_CARTRIDGE: TemplateCartridge = {
  id: "sabrina-objection",
  name: "SABRINA Objection Handling",
  description:
    "Agree-Overcome-Close responses for common sales objections",
  audience: "Leads with objections - too busy, not interested, need to think",
  industries: ["all"],
  active: true,
  keywords: ["objection", "rebuttal", "closing", "agree-overcome-close"],
  templates: [
    // TOO BUSY
    {
      id: "sabrina-obj-busy-1",
      name: "Busy - 10 Minutes",
      message:
        "Totally get it, your time is valuable. What if we did just 10 mins? I'll make it worth it. Would 7am before your day gets crazy work, or is 8pm easier?",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "too-busy", "rebuttal"],
      variables: [],
      charCount: 158,
    },
    {
      id: "sabrina-obj-busy-2",
      name: "Busy - Short Calls",
      message:
        "I hear you — everyone's calendar is packed these days. That's exactly why I keep these calls short and focused. How about a quick call Thursday or Friday? I'll work around your schedule.",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "too-busy", "rebuttal"],
      variables: [],
      charCount: 192,
    },
    // NOT INTERESTED
    {
      id: "sabrina-obj-interest-1",
      name: "Not Interested - Curious",
      message:
        "No pressure at all, I respect that. Curious though — what would need to change for it to make sense? Even just 5 mins to share what I'm seeing in your area?",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "not-interested", "rebuttal"],
      variables: [],
      charCount: 164,
    },
    {
      id: "sabrina-obj-interest-2",
      name: "Not Interested - Numbers",
      message:
        "Totally fair. Most folks I talk to felt the same way... until they saw the numbers. 10 mins, no commitment. If it's not relevant, you've lost nothing. Worth a shot?",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "not-interested", "rebuttal"],
      variables: [],
      charCount: 172,
    },
    // NEED TO THINK
    {
      id: "sabrina-obj-think-1",
      name: "Think - Questions",
      message:
        "Makes sense — big decisions deserve thought. What questions can I answer now to help you decide? Or we could chat through it together? Sometimes talking helps clarify.",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "need-to-think", "rebuttal"],
      variables: [],
      charCount: 182,
    },
    {
      id: "sabrina-obj-think-2",
      name: "Think - One Thing",
      message:
        "Absolutely, take your time. While you're thinking, let me share one thing that might help... Quick call this week to walk through the details?",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "need-to-think", "rebuttal"],
      variables: [],
      charCount: 148,
    },
    // BAD TIMING
    {
      id: "sabrina-obj-timing-1",
      name: "Bad Timing - When Better",
      message:
        "I get it — timing is everything. When would be better timing? I'll set a reminder to reach out. Should I check back in a month, or after the holidays?",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "bad-timing", "rebuttal"],
      variables: [],
      charCount: 158,
    },
    {
      id: "sabrina-obj-timing-2",
      name: "Bad Timing - Market",
      message:
        "Totally understand, there's always a lot going on. The thing is, market conditions keep changing. Better to know your options now. Even a quick 15-min call to get the lay of the land?",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "bad-timing", "rebuttal"],
      variables: [],
      charCount: 190,
    },
    // ALREADY HAVE SOMEONE
    {
      id: "sabrina-obj-have-1",
      name: "Already Have - Second Opinion",
      message:
        "Great that you're already working with someone! Just curious — are they showing you all your options? No harm in a second opinion. 10 mins, and I'll show you what else is out there.",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "already-have", "rebuttal"],
      variables: [],
      charCount: 190,
    },
    // TOO EXPENSIVE
    {
      id: "sabrina-obj-cost-1",
      name: "Too Expensive - Free Call",
      message:
        "I hear you, cost matters. Here's the thing — this call is free, and it might save you money. Let's at least look at the numbers together. What's a good time?",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "too-expensive", "rebuttal"],
      variables: [],
      charCount: 166,
    },
    // SPOUSE DECISION
    {
      id: "sabrina-obj-spouse-1",
      name: "Spouse - Together",
      message:
        "Totally understand — important to be on the same page. Would it help if we all hopped on together? I can do evenings or weekends too. When works for both of you?",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "spouse-decision", "rebuttal"],
      variables: [],
      charCount: 168,
    },
    // UNKNOWN / GENERAL
    {
      id: "sabrina-obj-unknown-1",
      name: "Unknown - Hesitation",
      message:
        "I appreciate you being upfront. Mind if I ask — what's the hesitation? Maybe a quick chat would clear things up. No pressure, just perspective.",
      stage: "objection" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["objection", "unknown", "rebuttal"],
      variables: [],
      charCount: 152,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE: SABRINA BOOKING
// Appointment confirmation and reminder templates
// ═══════════════════════════════════════════════════════════════════════════════

export const SABRINA_BOOKING_CARTRIDGE: TemplateCartridge = {
  id: "sabrina-booking",
  name: "SABRINA Booking Templates",
  description:
    "Appointment confirmation, reminder, and follow-up templates",
  audience: "Leads being booked for calls or appointments",
  industries: ["all"],
  active: true,
  keywords: ["booking", "appointment", "confirmation", "reminder"],
  templates: [
    {
      id: "sabrina-book-confirm",
      name: "Booking Confirmation",
      message:
        "{{firstName}} — you're all set for {{date}} at {{time}}! 📅\n\nI'll call you then. Here's what we'll cover:\n- Quick look at your property/business situation\n- 3 options you might not know about\n- No pressure, just ideas\n\nSee you soon!\n— Sabrina",
      stage: "booking" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["booking", "confirmation"],
      variables: ["firstName", "date", "time"],
      charCount: 248,
    },
    {
      id: "sabrina-book-reminder",
      name: "Booking Reminder",
      message:
        "Hey {{firstName}}! Just a friendly reminder about our call tomorrow at {{time}}. Looking forward to chatting! — Sabrina",
      stage: "booking" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["booking", "reminder"],
      variables: ["firstName", "time"],
      charCount: 118,
    },
    {
      id: "sabrina-book-followup",
      name: "Post-Call Followup",
      message:
        "{{firstName}} — thanks for the great conversation! As promised, here's the next step: {{nextStep}}. Let me know if you have any questions!",
      stage: "booking" as CampaignStage,
      worker: "SABRINA" as AIWorker,
      tags: ["booking", "followup"],
      variables: ["firstName", "nextStep"],
      charCount: 142,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE LIBRARY (All available cartridges)
// ═══════════════════════════════════════════════════════════════════════════════

export const CARTRIDGE_LIBRARY: TemplateCartridge[] = [
  BUSINESS_BROKERING_CARTRIDGE,
  CRM_CONSULTANTS_CARTRIDGE,
  BLUE_COLLAR_CARTRIDGE,
  REAL_ESTATE_CARTRIDGE,
  CATHY_NUDGE_CARTRIDGE,
  SABRINA_OBJECTION_CARTRIDGE,
  SABRINA_BOOKING_CARTRIDGE,
];

// Alias for convenience
export const ALL_CARTRIDGES = CARTRIDGE_LIBRARY;

// ═══════════════════════════════════════════════════════════════════════════════
// CARTRIDGE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class CartridgeManager {
  private cartridges: Map<string, TemplateCartridge> = new Map();

  constructor() {
    // Load all cartridges into map
    for (const cartridge of CARTRIDGE_LIBRARY) {
      this.cartridges.set(cartridge.id, { ...cartridge });
    }
  }

  /**
   * Activate a cartridge by ID
   */
  activate(cartridgeId: string): boolean {
    const cartridge = this.cartridges.get(cartridgeId);
    if (cartridge) {
      cartridge.active = true;
      console.log(`[CartridgeManager] Activated: ${cartridge.name}`);
      return true;
    }
    console.warn(`[CartridgeManager] Cartridge not found: ${cartridgeId}`);
    return false;
  }

  /**
   * Deactivate a cartridge by ID
   */
  deactivate(cartridgeId: string): boolean {
    const cartridge = this.cartridges.get(cartridgeId);
    if (cartridge) {
      cartridge.active = false;
      console.log(`[CartridgeManager] Deactivated: ${cartridge.name}`);
      return true;
    }
    return false;
  }

  /**
   * Get all active cartridges
   */
  getActiveCartridges(): TemplateCartridge[] {
    return Array.from(this.cartridges.values()).filter((c) => c.active);
  }

  /**
   * Get combined templates from all active cartridges
   */
  getActiveTemplates(): SMSTemplate[] {
    const active = this.getActiveCartridges();
    return active.flatMap((c) => c.templates);
  }

  /**
   * Get cartridge by ID
   */
  getCartridge(cartridgeId: string): TemplateCartridge | undefined {
    return this.cartridges.get(cartridgeId);
  }

  /**
   * List all available cartridges
   */
  listCartridges(): Array<{
    id: string;
    name: string;
    active: boolean;
    templateCount: number;
  }> {
    return Array.from(this.cartridges.values()).map((c) => ({
      id: c.id,
      name: c.name,
      active: c.active,
      templateCount: c.templates.length,
    }));
  }

  /**
   * Activate multiple cartridges by IDs
   */
  activateMany(cartridgeIds: string[]): void {
    for (const id of cartridgeIds) {
      this.activate(id);
    }
  }

  /**
   * Deactivate all cartridges
   */
  deactivateAll(): void {
    for (const cartridge of this.cartridges.values()) {
      cartridge.active = false;
    }
    console.log("[CartridgeManager] All cartridges deactivated");
  }

  /**
   * Get templates by industry keyword
   */
  getTemplatesForIndustry(industry: string): SMSTemplate[] {
    const matching: SMSTemplate[] = [];
    const lowerIndustry = industry.toLowerCase();

    for (const cartridge of this.cartridges.values()) {
      if (
        cartridge.industries.some((i) =>
          i.toLowerCase().includes(lowerIndustry),
        ) ||
        cartridge.keywords?.some((k) => k.toLowerCase().includes(lowerIndustry))
      ) {
        matching.push(...cartridge.templates);
      }
    }

    return matching;
  }

  /**
   * Auto-activate cartridges based on industry
   */
  autoActivateForIndustry(industry: string): string[] {
    const activated: string[] = [];
    const lowerIndustry = industry.toLowerCase();

    for (const cartridge of this.cartridges.values()) {
      if (
        cartridge.industries.some((i) =>
          i.toLowerCase().includes(lowerIndustry),
        ) ||
        cartridge.keywords?.some((k) => k.toLowerCase().includes(lowerIndustry))
      ) {
        cartridge.active = true;
        activated.push(cartridge.id);
      }
    }

    console.log(
      `[CartridgeManager] Auto-activated for "${industry}":`,
      activated,
    );
    return activated;
  }

  /**
   * Reset to default state (only Nextier-focused cartridges active)
   */
  resetToDefault(): void {
    this.deactivateAll();
    // Default active: business brokering, crm consultants, blue collar
    this.activate("business-brokering");
    this.activate("crm-consultants");
    this.activate("blue-collar");
    console.log("[CartridgeManager] Reset to default (Nextier focus)");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKSPACE CARTRIDGE CONFIGURATION
// Each workspace/team has its own cartridge configuration
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkspaceCartridgeConfig {
  teamId: string;
  activeCartridgeIds: string[];
  customTemplates?: SMSTemplate[];
  createdAt: Date;
  updatedAt: Date;
}

class WorkspaceCartridgeManager {
  private workspaceConfigs: Map<string, WorkspaceCartridgeConfig> = new Map();
  private globalManager: CartridgeManager;

  constructor() {
    this.globalManager = new CartridgeManager();
  }

  /**
   * Get or create workspace configuration
   */
  getWorkspaceConfig(teamId: string): WorkspaceCartridgeConfig {
    let config = this.workspaceConfigs.get(teamId);
    if (!config) {
      // Create default config for new workspace
      config = {
        teamId,
        activeCartridgeIds: [
          "business-brokering",
          "crm-consultants",
          "blue-collar",
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.workspaceConfigs.set(teamId, config);
    }
    return config;
  }

  /**
   * Activate cartridge for a workspace
   */
  activateForWorkspace(teamId: string, cartridgeId: string): boolean {
    const config = this.getWorkspaceConfig(teamId);
    if (!config.activeCartridgeIds.includes(cartridgeId)) {
      const cartridge = this.globalManager.getCartridge(cartridgeId);
      if (cartridge) {
        config.activeCartridgeIds.push(cartridgeId);
        config.updatedAt = new Date();
        console.log(`[WorkspaceCartridge] ${teamId}: Activated ${cartridgeId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Deactivate cartridge for a workspace
   */
  deactivateForWorkspace(teamId: string, cartridgeId: string): boolean {
    const config = this.getWorkspaceConfig(teamId);
    const index = config.activeCartridgeIds.indexOf(cartridgeId);
    if (index > -1) {
      config.activeCartridgeIds.splice(index, 1);
      config.updatedAt = new Date();
      console.log(`[WorkspaceCartridge] ${teamId}: Deactivated ${cartridgeId}`);
      return true;
    }
    return false;
  }

  /**
   * Get active templates for a workspace
   */
  getTemplatesForWorkspace(teamId: string): SMSTemplate[] {
    const config = this.getWorkspaceConfig(teamId);
    const templates: SMSTemplate[] = [];

    for (const cartridgeId of config.activeCartridgeIds) {
      const cartridge = this.globalManager.getCartridge(cartridgeId);
      if (cartridge) {
        templates.push(...cartridge.templates);
      }
    }

    // Add any custom workspace templates
    if (config.customTemplates) {
      templates.push(...config.customTemplates);
    }

    return templates;
  }

  /**
   * Add custom template to workspace
   */
  addCustomTemplate(teamId: string, template: SMSTemplate): void {
    const config = this.getWorkspaceConfig(teamId);
    if (!config.customTemplates) {
      config.customTemplates = [];
    }
    config.customTemplates.push(template);
    config.updatedAt = new Date();
  }

  /**
   * Set workspace to specific industry preset
   */
  setIndustryPreset(
    teamId: string,
    industry: "consulting" | "blue-collar" | "professional-services",
  ): void {
    const config = this.getWorkspaceConfig(teamId);

    switch (industry) {
      case "consulting":
        config.activeCartridgeIds = ["crm-consultants", "business-brokering"];
        break;
      case "blue-collar":
        config.activeCartridgeIds = ["blue-collar", "business-brokering"];
        break;
      case "professional-services":
        config.activeCartridgeIds = ["business-brokering", "crm-consultants"];
        break;
    }

    config.updatedAt = new Date();
    console.log(`[WorkspaceCartridge] ${teamId}: Set preset ${industry}`);
  }

  /**
   * List active cartridges for workspace
   */
  listActiveForWorkspace(teamId: string): Array<{ id: string; name: string }> {
    const config = this.getWorkspaceConfig(teamId);
    return config.activeCartridgeIds
      .map((id) => {
        const cartridge = this.globalManager.getCartridge(id);
        return cartridge ? { id: cartridge.id, name: cartridge.name } : null;
      })
      .filter((c): c is { id: string; name: string } => c !== null);
  }

  /**
   * Get all available cartridges (for UI selection)
   */
  getAvailableCartridges(): Array<{
    id: string;
    name: string;
    description: string;
    templateCount: number;
  }> {
    return this.globalManager.listCartridges().map((c) => {
      const full = this.globalManager.getCartridge(c.id);
      return {
        id: c.id,
        name: c.name,
        description: full?.description || "",
        templateCount: c.templateCount,
      };
    });
  }
}

// Export singleton instances
export const cartridgeManager = new CartridgeManager();
export const workspaceCartridgeManager = new WorkspaceCartridgeManager();

// Initialize with Nextier defaults (no real estate)
cartridgeManager.resetToDefault();
