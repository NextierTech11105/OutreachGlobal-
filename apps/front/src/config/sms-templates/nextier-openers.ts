/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NEXTIER SMS OPENER TEMPLATES - GTM LIBRARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THE "BE LIKE WATER" TEMPLATE SYSTEM
 * Same AI Agents (LUCI → GIANNA → CATHY → SABRINA)
 * Different positioning per persona/vertical
 *
 * FLOW:
 *   1. LUCI fetches from USBizData → Skip traces → Scores leads
 *   2. Campaign PREP (batch selection) → PREVIEW (human review) → EXECUTE (autopilot)
 *   3. GIANNA sends initial blast via SignalHouse
 *   4. Inbound Response Center handles all replies
 *   5. CATHY nudges ghosts | SABRINA closes hot leads
 *
 * 160 CHAR MAX for SMS - Blunt, direct, value-first
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type TargetPersona =
  | "business_broker"
  | "real_estate_agent"
  | "real_estate_broker"
  | "ma_consultant"
  | "private_equity"
  | "roll_up_operator"
  | "business_owner_exit";

export type TemplateCategory =
  | "initial_opener"
  | "follow_up"
  | "value_drop"
  | "curiosity"
  | "social_proof"
  | "urgency"
  | "challenge";

export interface SmsTemplate {
  id: string;
  persona: TargetPersona;
  category: TemplateCategory;
  message: string;
  variables: string[];
  charCount: number;
  agent: "gianna" | "cathy" | "sabrina";
}

// ═══════════════════════════════════════════════════════════════════════════════
// GIANNA INITIAL OPENERS BY PERSONA
// ═══════════════════════════════════════════════════════════════════════════════

export const NEXTIER_OPENERS: Record<TargetPersona, SmsTemplate[]> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS BROKERS - Sell them the deal origination machine
  // ═══════════════════════════════════════════════════════════════════════════
  business_broker: [
    {
      id: "bb_opener_1",
      persona: "business_broker",
      category: "initial_opener",
      message:
        "{firstName}, I help business brokers find sellers before they list. AI-powered deal origination. Interested in seeing how it works?",
      variables: ["firstName"],
      charCount: 142,
      agent: "gianna",
    },
    {
      id: "bb_opener_2",
      persona: "business_broker",
      category: "value_drop",
      message:
        "Hey {firstName}. Most brokers wait for listings. I have a system that generates 20+ qualified seller leads/month. Want the details?",
      variables: ["firstName"],
      charCount: 140,
      agent: "gianna",
    },
    {
      id: "bb_opener_3",
      persona: "business_broker",
      category: "curiosity",
      message:
        "{firstName}, quick question - what if you had a pipeline of $1-10M business owners already thinking about exit? That's what we build.",
      variables: ["firstName"],
      charCount: 145,
      agent: "gianna",
    },
    {
      id: "bb_opener_4",
      persona: "business_broker",
      category: "social_proof",
      message:
        "{firstName}, just helped a broker in {state} close 3 deals from our lead pipeline. Different approach to deal flow. Worth a look?",
      variables: ["firstName", "state"],
      charCount: 139,
      agent: "gianna",
    },
    {
      id: "bb_opener_5",
      persona: "business_broker",
      category: "challenge",
      message:
        "Honest question {firstName} - are you generating your own deals or waiting for referrals? There's a better way. Interested?",
      variables: ["firstName"],
      charCount: 131,
      agent: "gianna",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL ESTATE AGENTS - Commercial/Investment focus
  // ═══════════════════════════════════════════════════════════════════════════
  real_estate_agent: [
    {
      id: "rea_opener_1",
      persona: "real_estate_agent",
      category: "initial_opener",
      message:
        "{firstName}, I find off-market commercial deals using AI. Skip traced owner data, direct outreach. Want to see the system?",
      variables: ["firstName"],
      charCount: 130,
      agent: "gianna",
    },
    {
      id: "rea_opener_2",
      persona: "real_estate_agent",
      category: "value_drop",
      message:
        "Hey {firstName}. What if you had 50 off-market property owners ready to talk each month? That's what our AI platform delivers.",
      variables: ["firstName"],
      charCount: 138,
      agent: "gianna",
    },
    {
      id: "rea_opener_3",
      persona: "real_estate_agent",
      category: "curiosity",
      message:
        "{firstName}, I noticed you work {city} market. I have a way to find motivated sellers before they list. Quick chat?",
      variables: ["firstName", "city"],
      charCount: 127,
      agent: "gianna",
    },
    {
      id: "rea_opener_4",
      persona: "real_estate_agent",
      category: "social_proof",
      message:
        "{firstName}, agents using our AI lead gen are closing 3-5x more off-market deals. Different game. Worth 15 mins?",
      variables: ["firstName"],
      charCount: 122,
      agent: "gianna",
    },
    {
      id: "rea_opener_5",
      persona: "real_estate_agent",
      category: "urgency",
      message:
        "{firstName}, Q1 is prime time for off-market deals. Our AI system is generating leads now. Want in before your competitors?",
      variables: ["firstName"],
      charCount: 135,
      agent: "gianna",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL ESTATE BROKERS - Multi-agent firms
  // ═══════════════════════════════════════════════════════════════════════════
  real_estate_broker: [
    {
      id: "reb_opener_1",
      persona: "real_estate_broker",
      category: "initial_opener",
      message:
        "{firstName}, I help brokerages generate proprietary deal flow using AI. Skip traced owners, automated outreach. Demo?",
      variables: ["firstName"],
      charCount: 127,
      agent: "gianna",
    },
    {
      id: "reb_opener_2",
      persona: "real_estate_broker",
      category: "value_drop",
      message:
        "Hey {firstName}. What if your agents had exclusive leads no one else is working? That's what our AI platform creates.",
      variables: ["firstName"],
      charCount: 131,
      agent: "gianna",
    },
    {
      id: "reb_opener_3",
      persona: "real_estate_broker",
      category: "curiosity",
      message:
        "{firstName}, running a brokerage in {city}? I built something that changes how you source deals. 15 min to show you?",
      variables: ["firstName", "city"],
      charCount: 128,
      agent: "gianna",
    },
    {
      id: "reb_opener_4",
      persona: "real_estate_broker",
      category: "social_proof",
      message:
        "{firstName}, brokerages using our AI are seeing 40% more deal flow. Proprietary leads, not shared. Interested?",
      variables: ["firstName"],
      charCount: 121,
      agent: "gianna",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // M&A CONSULTANTS - Mid-market advisory
  // ═══════════════════════════════════════════════════════════════════════════
  ma_consultant: [
    {
      id: "mac_opener_1",
      persona: "ma_consultant",
      category: "initial_opener",
      message:
        "{firstName}, I built an AI system that identifies $5-50M businesses ready for exit. Proprietary deal sourcing. Interested?",
      variables: ["firstName"],
      charCount: 131,
      agent: "gianna",
    },
    {
      id: "mac_opener_2",
      persona: "ma_consultant",
      category: "value_drop",
      message:
        "Hey {firstName}. Most M&A advisors wait for deals. Our AI finds them first. Skip traced owners, exit signals. Demo?",
      variables: ["firstName"],
      charCount: 126,
      agent: "gianna",
    },
    {
      id: "mac_opener_3",
      persona: "ma_consultant",
      category: "curiosity",
      message:
        "{firstName}, what if you had 30+ qualified seller conversations/month without cold calling? That's what we deliver.",
      variables: ["firstName"],
      charCount: 129,
      agent: "gianna",
    },
    {
      id: "mac_opener_4",
      persona: "ma_consultant",
      category: "social_proof",
      message:
        "{firstName}, M&A advisors using our platform are closing 2-3 more deals/year. Different approach to origination.",
      variables: ["firstName"],
      charCount: 127,
      agent: "gianna",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE EQUITY - Proprietary deal flow
  // ═══════════════════════════════════════════════════════════════════════════
  private_equity: [
    {
      id: "pe_opener_1",
      persona: "private_equity",
      category: "initial_opener",
      message:
        "{firstName}, I generate proprietary deal flow for PE firms. AI-powered sourcing, skip traced owners. Worth a conversation?",
      variables: ["firstName"],
      charCount: 133,
      agent: "gianna",
    },
    {
      id: "pe_opener_2",
      persona: "private_equity",
      category: "value_drop",
      message:
        "Hey {firstName}. Tired of competing on auctioned deals? Our AI finds founders before bankers do. Interested?",
      variables: ["firstName"],
      charCount: 120,
      agent: "gianna",
    },
    {
      id: "pe_opener_3",
      persona: "private_equity",
      category: "curiosity",
      message:
        "{firstName}, what if your deal team had 50+ off-market conversations/month? That's what our platform creates.",
      variables: ["firstName"],
      charCount: 124,
      agent: "gianna",
    },
    {
      id: "pe_opener_4",
      persona: "private_equity",
      category: "social_proof",
      message:
        "{firstName}, PE firms using our AI sourcing are seeing 3x proprietary deal flow. Different game. Quick demo?",
      variables: ["firstName"],
      charCount: 123,
      agent: "gianna",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLL-UP OPERATORS - Industry consolidation
  // ═══════════════════════════════════════════════════════════════════════════
  roll_up_operator: [
    {
      id: "ro_opener_1",
      persona: "roll_up_operator",
      category: "initial_opener",
      message:
        "{firstName}, I help roll-up operators find acquisition targets. AI identifies owners ready to exit. Want to see it?",
      variables: ["firstName"],
      charCount: 127,
      agent: "gianna",
    },
    {
      id: "ro_opener_2",
      persona: "roll_up_operator",
      category: "value_drop",
      message:
        "Hey {firstName}. Building a platform company? Our AI finds add-on targets in your sector. Skip traced owners, direct outreach.",
      variables: ["firstName"],
      charCount: 142,
      agent: "gianna",
    },
    {
      id: "ro_opener_3",
      persona: "roll_up_operator",
      category: "curiosity",
      message:
        "{firstName}, what if you had a pipeline of {industry} business owners ready to talk acquisition? That's what we build.",
      variables: ["firstName", "industry"],
      charCount: 137,
      agent: "gianna",
    },
    {
      id: "ro_opener_4",
      persona: "roll_up_operator",
      category: "social_proof",
      message:
        "{firstName}, roll-up operators using our AI are closing 5+ add-ons/year from our pipeline. Different approach.",
      variables: ["firstName"],
      charCount: 125,
      agent: "gianna",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS OWNERS ($1-10M) - Exit-ready targets
  // ═══════════════════════════════════════════════════════════════════════════
  business_owner_exit: [
    {
      id: "boe_opener_1",
      persona: "business_owner_exit",
      category: "initial_opener",
      message:
        "Hi {firstName}! This is Gianna. I came across {companyName} - are you still the owner? Would love to connect briefly.",
      variables: ["firstName", "companyName"],
      charCount: 121,
      agent: "gianna",
    },
    {
      id: "boe_opener_2",
      persona: "business_owner_exit",
      category: "value_drop",
      message:
        "{firstName}, quick question about {companyName} - have you ever thought about what it might be worth if you decided to exit?",
      variables: ["firstName", "companyName"],
      charCount: 130,
      agent: "gianna",
    },
    {
      id: "boe_opener_3",
      persona: "business_owner_exit",
      category: "curiosity",
      message:
        "Hey {firstName}. I work with business owners planning their next chapter. {companyName} caught my eye. Open to a quick chat?",
      variables: ["firstName", "companyName"],
      charCount: 135,
      agent: "gianna",
    },
    {
      id: "boe_opener_4",
      persona: "business_owner_exit",
      category: "social_proof",
      message:
        "{firstName}, just helped a {industry} owner like you get top dollar for their business. Worth knowing your options?",
      variables: ["firstName", "industry"],
      charCount: 127,
      agent: "gianna",
    },
    {
      id: "boe_opener_5",
      persona: "business_owner_exit",
      category: "urgency",
      message:
        "{firstName}, market conditions favor sellers right now. If you've thought about exiting {companyName}, let's talk timing.",
      variables: ["firstName", "companyName"],
      charCount: 134,
      agent: "gianna",
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATHY NUDGE TEMPLATES - Ghost Revival
// ═══════════════════════════════════════════════════════════════════════════════

export const CATHY_NUDGES: SmsTemplate[] = [
  {
    id: "cathy_nudge_1",
    persona: "business_owner_exit",
    category: "follow_up",
    message:
      "Hey {firstName}, Cathy here. Just circling back - did my last message get buried? No pressure, just curious if you're open to chat.",
    variables: ["firstName"],
    charCount: 133,
    agent: "cathy",
  },
  {
    id: "cathy_nudge_2",
    persona: "business_owner_exit",
    category: "follow_up",
    message:
      "{firstName}, I get it - you're busy running a business. Quick yes or no: worth a 10 min call about {companyName}'s value?",
    variables: ["firstName", "companyName"],
    charCount: 128,
    agent: "cathy",
  },
  {
    id: "cathy_nudge_3",
    persona: "business_owner_exit",
    category: "follow_up",
    message:
      "Not trying to bug you {firstName}. Just wanted to make sure my message didn't get lost. Still interested in chatting?",
    variables: ["firstName"],
    charCount: 125,
    agent: "cathy",
  },
  {
    id: "cathy_nudge_4",
    persona: "business_broker",
    category: "follow_up",
    message:
      "Hey {firstName}, Cathy following up. Most brokers who see our deal flow system want more info. You still interested?",
    variables: ["firstName"],
    charCount: 124,
    agent: "cathy",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SABRINA CLOSER TEMPLATES - Aggressive Booking
// ═══════════════════════════════════════════════════════════════════════════════

export const SABRINA_CLOSERS: SmsTemplate[] = [
  {
    id: "sabrina_close_1",
    persona: "business_owner_exit",
    category: "urgency",
    message:
      "{firstName}, Sabrina here. You mentioned interest in discussing {companyName}. I have Tuesday or Thursday open. Which works?",
    variables: ["firstName", "companyName"],
    charCount: 132,
    agent: "sabrina",
  },
  {
    id: "sabrina_close_2",
    persona: "business_owner_exit",
    category: "urgency",
    message:
      "Hey {firstName}, let's lock in that call. 15 mins to show you what {companyName} could be worth. Tomorrow 2pm or 4pm?",
    variables: ["firstName", "companyName"],
    charCount: 127,
    agent: "sabrina",
  },
  {
    id: "sabrina_close_3",
    persona: "business_broker",
    category: "urgency",
    message:
      "{firstName}, you asked about our deal origination system. I have a 15-min demo slot tomorrow. Want it?",
    variables: ["firstName"],
    charCount: 114,
    agent: "sabrina",
  },
  {
    id: "sabrina_close_4",
    persona: "private_equity",
    category: "urgency",
    message:
      "{firstName}, ready to show you how our AI generates proprietary deal flow. 20 min demo. When's good this week?",
    variables: ["firstName"],
    charCount: 121,
    agent: "sabrina",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE SELECTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getOpenersByPersona(persona: TargetPersona): SmsTemplate[] {
  return NEXTIER_OPENERS[persona] || [];
}

export function getRandomOpener(persona: TargetPersona): SmsTemplate | null {
  const openers = NEXTIER_OPENERS[persona];
  if (!openers || openers.length === 0) return null;
  return openers[Math.floor(Math.random() * openers.length)];
}

export function personalizeTemplate(
  template: SmsTemplate,
  variables: Record<string, string>,
): string {
  let message = template.message;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{${key}}`, "g"), value);
  }
  return message;
}

export function getAllTemplates(): SmsTemplate[] {
  const all: SmsTemplate[] = [];
  for (const persona of Object.keys(NEXTIER_OPENERS) as TargetPersona[]) {
    all.push(...NEXTIER_OPENERS[persona]);
  }
  all.push(...CATHY_NUDGES);
  all.push(...SABRINA_CLOSERS);
  return all;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GTM CONFIGURATION - How we sell to each persona
// ═══════════════════════════════════════════════════════════════════════════════

export const GTM_POSITIONING: Record<
  TargetPersona,
  {
    headline: string;
    valueProps: string[];
    objectionHandlers: Record<string, string>;
    closeStrategy: string;
  }
> = {
  business_broker: {
    headline: "Generate 20+ qualified seller leads per month on autopilot",
    valueProps: [
      "AI scans 50M+ businesses to find exit-ready owners",
      "Skip traced contact data - direct to owner mobile",
      "Automated outreach with human-like AI responses",
      "Proprietary deal flow - not shared with competitors",
    ],
    objectionHandlers: {
      "I get enough referrals":
        "Referrals are reactive. This is proactive deal origination. What if you had both?",
      "Sounds expensive":
        "Most brokers close 1 extra deal/quarter from our pipeline. That's $50-100K+ in commission. ROI is 10x+.",
      "I don't have time":
        "That's the point - it's automated. LUCI finds leads, GIANNA reaches out, you get hot conversations.",
    },
    closeStrategy:
      "15-min demo showing live deal pipeline in your target market",
  },
  real_estate_agent: {
    headline: "Find off-market deals before they hit the MLS",
    valueProps: [
      "AI identifies motivated sellers using distress signals",
      "Skip traced owner data - bypass listing agents",
      "Automated SMS/email outreach that converts",
      "Exclusive leads no one else is working",
    ],
    objectionHandlers: {
      "I work residential":
        "Our system works for commercial, investment, and high-value residential. Same engine.",
      "MLS is enough for me":
        "MLS is table stakes. Off-market is where the margins are. 3-5x commission on direct deals.",
      "I tried cold calling":
        "This isn't cold calling. AI warms them up first. You only talk to interested sellers.",
    },
    closeStrategy: "Show property owner pipeline in their market area",
  },
  real_estate_broker: {
    headline: "Give your agents exclusive lead flow that closes",
    valueProps: [
      "Proprietary deal pipeline for your brokerage only",
      "AI-powered lead distribution to top performers",
      "Track agent performance on our leads vs. others",
      "White-label as your brokerage's proprietary system",
    ],
    objectionHandlers: {
      "My agents have their own leads":
        "This supplements, not replaces. More leads = more closings = more splits.",
      "We use [competitor]":
        "Do they generate leads or just manage them? We create deal flow. Big difference.",
    },
    closeStrategy: "Demo showing brokerage-wide pipeline and agent leaderboard",
  },
  ma_consultant: {
    headline: "Source $5-50M deals without bankers or brokers",
    valueProps: [
      "AI identifies founders showing exit intent signals",
      "Direct outreach to owners - bypass intermediaries",
      "Lower multiples on proprietary vs. auctioned deals",
      "Build your own deal pipeline, not dependent on bankers",
    ],
    objectionHandlers: {
      "I have banker relationships":
        "Bankers bring you auctioned deals at peak multiples. We find the off-market gems.",
      "Too small for my fund":
        "We can filter by revenue band. $5M floor, $50M ceiling, whatever you need.",
    },
    closeStrategy: "Show sector-specific deal pipeline with owner contact data",
  },
  private_equity: {
    headline: "Proprietary deal flow that your competitors don't have",
    valueProps: [
      "AI-powered platform company sourcing",
      "Add-on acquisition target identification",
      "Direct founder outreach at scale",
      "Exit intent signals before owners engage bankers",
    ],
    objectionHandlers: {
      "We have BD team":
        "This multiplies their effectiveness. AI pre-qualifies, your team closes.",
      "We work through brokers":
        "That's reactive. This is proactive. Own your deal flow.",
    },
    closeStrategy: "Show thesis-specific pipeline (industry, size, geography)",
  },
  roll_up_operator: {
    headline: "Find acquisition targets in your sector on autopilot",
    valueProps: [
      "AI scans your target industry for exit-ready owners",
      "Skip traced contact data for direct outreach",
      "Automated nurture sequences that convert",
      "Build platform company faster with proprietary deal flow",
    ],
    objectionHandlers: {
      "My industry is niche":
        "Perfect. We filter by SIC code. Niche = less competition for deals.",
      "Owners don't want to sell":
        "80% of owners will sell for the right price. We find them at the right time.",
    },
    closeStrategy: "Demo with their specific industry filter applied",
  },
  business_owner_exit: {
    headline: "Maximize your business value before you exit",
    valueProps: [
      "Free valuation to know what you're working with",
      "12-month exit prep to increase sale price 20-30%",
      "Buyer matching when you're ready",
      "No pressure - information first, decisions later",
    ],
    objectionHandlers: {
      "Not ready to sell":
        "Most owners prep 2-3 years before exit. The earlier you know your number, the better.",
      "I know what it's worth":
        "Most owners undervalue by 15-20%. A fresh analysis might surprise you.",
      "I'll figure it out later":
        "Later = less time to maximize value. Even a quick valuation helps you plan.",
    },
    closeStrategy: "Free valuation report with no obligation",
  },
};
