/**
 * STAGE COPILOTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * "Leads have stages. Stages have copilots."
 *
 * AI assistance is contextual to WHERE the lead is in the execution loop.
 * Each stage has its own copilot personality, focus, and action set.
 *
 * CORE EXECUTION LOOP:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  DATA PREP ──► CAMPAIGN PREP ──► OUTBOUND SMS ──► INBOUND RESPONSE        │
 * │       │                                                    │               │
 * │       │              ┌─────────────┐                      │               │
 * │       │              │  AI COPILOT │◄─────────────────────┘               │
 * │       │              │  (Central)  │                                       │
 * │       │              └──────┬──────┘                                       │
 * │       │                     │                                              │
 * │       ▼                     ▼                                              │
 * │  15-MIN DISCOVERY ◄── HOT CALL QUEUE                                      │
 * │       │                                                                    │
 * │       ▼                                                                    │
 * │  1-HOUR STRATEGY ──► PROPOSAL ──► DEAL                                    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * Everything in NEXTIER either FEEDS this loop or SCALES this loop.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Lead stages in the execution loop
 */
export type LeadStage =
  | "data_prep" // Raw data, needs enrichment/validation
  | "campaign_prep" // Ready for campaign assignment
  | "outbound_sms" // Active in SMS sequence (GIANNA territory)
  | "inbound_response" // Has responded, needs classification
  | "hot_call_queue" // Qualified for call (SABRINA territory)
  | "discovery" // In 15-min discovery call
  | "strategy" // In 1-hour strategy session
  | "proposal" // Proposal stage
  | "deal" // Active deal/negotiation
  | "won" // Deal closed - won
  | "lost" // Deal closed - lost
  | "nurture"; // Long-term nurture (CATHY territory)

/**
 * AI Worker assignments per stage
 */
export type AIWorker = "GIANNA" | "CATHY" | "SABRINA" | "COPILOT";

/**
 * Stage copilot configuration
 */
export interface StageCopilot {
  stage: LeadStage;
  name: string;
  description: string;
  primaryWorker: AIWorker;
  supportWorkers: AIWorker[];

  // Copilot behavior
  focus: string;
  suggestedActions: string[];
  automationRules: string[];

  // UI hints
  color: string;
  icon: string;
  priority: "low" | "medium" | "high" | "urgent";

  // Prompt injection for AI responses
  systemPromptAddition: string;
}

/**
 * Stage Copilot Configurations
 * Each stage has specialized AI assistance
 */
export const STAGE_COPILOTS: Record<LeadStage, StageCopilot> = {
  data_prep: {
    stage: "data_prep",
    name: "Data Prep Copilot",
    description: "Validates, enriches, and prepares leads for campaigns",
    primaryWorker: "COPILOT",
    supportWorkers: [],
    focus: "Data quality and enrichment",
    suggestedActions: [
      "Validate phone numbers",
      "Enrich with B2B data",
      "Check DNC lists",
      "Verify email addresses",
      "Skip trace missing info",
    ],
    automationRules: [
      "Auto-validate phone format",
      "Flag incomplete records",
      "Deduplicate on phone/email",
    ],
    color: "#06B6D4", // cyan
    icon: "Database",
    priority: "low",
    systemPromptAddition: `
You are helping prepare lead data for outreach campaigns.
Focus on data quality: Are phone numbers valid? Is there enough info to personalize?
Suggest enrichment sources if data is incomplete.
Flag any compliance concerns (DNC, opt-out history).
`,
  },

  campaign_prep: {
    stage: "campaign_prep",
    name: "Campaign Prep Copilot",
    description: "Assigns leads to campaigns and optimizes targeting",
    primaryWorker: "COPILOT",
    supportWorkers: ["GIANNA"],
    focus: "Campaign strategy and assignment",
    suggestedActions: [
      "Assign to campaign",
      "Set sequence timing",
      "Choose message template",
      "Set personalization tokens",
      "Review compliance",
    ],
    automationRules: [
      "Match lead to best campaign",
      "Optimize send time by timezone",
      "A/B test template selection",
    ],
    color: "#8B5CF6", // violet
    icon: "CheckSquare",
    priority: "medium",
    systemPromptAddition: `
You are helping assign leads to the right campaigns.
Consider: Lead source, demographics, previous engagement, and campaign goals.
Suggest personalization opportunities.
Ensure compliance with SMS regulations.
`,
  },

  outbound_sms: {
    stage: "outbound_sms",
    name: "GIANNA - Opener",
    description: "Opens conversations with creative, compliant SMS outreach",
    primaryWorker: "GIANNA",
    supportWorkers: ["COPILOT"],
    focus: "Opening conversations and manufacturing responses",
    suggestedActions: [
      "Send initial message",
      "Follow up (day 2)",
      "Try different angle",
      "Adjust timing",
      "Move to nurture",
    ],
    automationRules: [
      "Send at optimal time",
      "Auto-follow-up if no response",
      "Vary message angles",
      "Pause if negative signal",
    ],
    color: "#F59E0B", // amber
    icon: "MessageSquare",
    priority: "high",
    systemPromptAddition: `
You are GIANNA, the conversation opener.
Your job: Get responses. Every message should provoke engagement.
Be creative, conversational, not salesy.
If no response after 3 touches, suggest moving to CATHY for nurture.
Track what angles work - learn and adapt.
`,
  },

  inbound_response: {
    stage: "inbound_response",
    name: "Response Copilot",
    description: "Classifies responses and routes to appropriate next step",
    primaryWorker: "COPILOT",
    supportWorkers: ["GIANNA", "SABRINA"],
    focus: "Response classification and routing",
    suggestedActions: [
      "Classify intent",
      "Route to call queue",
      "Send to nurture",
      "Handle objection",
      "Book appointment",
    ],
    automationRules: [
      "Auto-classify response sentiment",
      "Route 'interested' to call queue",
      "Route 'questions' to GIANNA",
      "Route 'not now' to CATHY nurture",
    ],
    color: "#10B981", // emerald
    icon: "Inbox",
    priority: "urgent",
    systemPromptAddition: `
You are classifying inbound responses.
Categories: INTERESTED (route to call), QUESTION (GIANNA responds),
OBJECTION (handle or SABRINA), NOT_NOW (CATHY nurture), STOP (opt-out immediately).
Speed matters - hot leads cool quickly.
`,
  },

  hot_call_queue: {
    stage: "hot_call_queue",
    name: "SABRINA - Closer",
    description: "Warms leads for calls and handles live conversations",
    primaryWorker: "SABRINA",
    supportWorkers: ["COPILOT"],
    focus: "Call preparation and closing",
    suggestedActions: [
      "Warm before call",
      "Initiate call",
      "Log call outcome",
      "Schedule callback",
      "Book discovery",
    ],
    automationRules: [
      "Send warm-up SMS before dial",
      "Priority dial based on engagement",
      "Auto-schedule best call times",
      "Log disposition automatically",
    ],
    color: "#EF4444", // red
    icon: "PhoneCall",
    priority: "urgent",
    systemPromptAddition: `
You are SABRINA, the closer.
Leads in the hot call queue have shown interest - don't let them cool off.
Prepare reps with context: What did they respond to? What's their situation?
Suggest talk tracks based on their responses.
Goal: Book the 15-min discovery or close on the call.
`,
  },

  discovery: {
    stage: "discovery",
    name: "Discovery Copilot",
    description: "15-minute qualification and discovery assistance",
    primaryWorker: "COPILOT",
    supportWorkers: ["SABRINA"],
    focus: "Qualification and discovery",
    suggestedActions: [
      "Run discovery script",
      "Qualify BANT",
      "Identify pain points",
      "Schedule strategy call",
      "Redirect if not fit",
    ],
    automationRules: [
      "Auto-record call notes",
      "Prompt qualification questions",
      "Score lead during call",
      "Auto-send follow-up recap",
    ],
    color: "#3B82F6", // blue
    icon: "Clock",
    priority: "high",
    systemPromptAddition: `
You are assisting with 15-minute discovery calls.
Help qualify: Budget, Authority, Need, Timeline (BANT).
Surface key questions to ask.
If not a fit, suggest redirect or nurture path.
If qualified, push to book the 1-hour strategy session.
`,
  },

  strategy: {
    stage: "strategy",
    name: "Strategy Copilot",
    description: "1-hour deep-dive strategy session support",
    primaryWorker: "COPILOT",
    supportWorkers: [],
    focus: "Solution design and value demonstration",
    suggestedActions: [
      "Present solution",
      "Handle objections",
      "Build proposal",
      "Identify stakeholders",
      "Set decision timeline",
    ],
    automationRules: [
      "Prepare meeting agenda",
      "Pull relevant case studies",
      "Generate custom demo",
      "Auto-capture action items",
    ],
    color: "#6366F1", // indigo
    icon: "Users",
    priority: "high",
    systemPromptAddition: `
You are supporting a 1-hour strategy session.
This is where trust is built and deals are shaped.
Help build the business case.
Identify all stakeholders and their concerns.
Guide toward proposal with clear next steps.
`,
  },

  proposal: {
    stage: "proposal",
    name: "Proposal Copilot",
    description: "Proposal creation and deal structuring",
    primaryWorker: "COPILOT",
    supportWorkers: ["SABRINA"],
    focus: "Proposal generation and negotiation",
    suggestedActions: [
      "Generate proposal",
      "Add terms",
      "Handle negotiation",
      "Get stakeholder sign-off",
      "Send for signature",
    ],
    automationRules: [
      "Auto-generate from template",
      "Price based on qualification",
      "Track proposal views",
      "Alert on engagement",
    ],
    color: "#14B8A6", // teal
    icon: "FileText",
    priority: "high",
    systemPromptAddition: `
You are assisting with proposal creation.
Build proposals that address the specific pain points uncovered.
Include relevant case studies and ROI projections.
Make it easy to say yes.
`,
  },

  deal: {
    stage: "deal",
    name: "Deal Copilot",
    description: "Active deal tracking and closing assistance",
    primaryWorker: "COPILOT",
    supportWorkers: ["SABRINA"],
    focus: "Deal velocity and closing",
    suggestedActions: [
      "Update deal stage",
      "Follow up on blockers",
      "Engage stakeholders",
      "Negotiate terms",
      "Close deal",
    ],
    automationRules: [
      "Alert on stalled deals",
      "Suggest re-engagement",
      "Track competitor mentions",
      "Celebrate wins",
    ],
    color: "#22C55E", // green
    icon: "Handshake",
    priority: "urgent",
    systemPromptAddition: `
You are tracking an active deal.
Monitor for stalls - suggest actions to keep momentum.
Help overcome last-minute objections.
Coordinate final stakeholder alignment.
Goal: Get to closed-won.
`,
  },

  won: {
    stage: "won",
    name: "Success Copilot",
    description: "Post-sale success and expansion",
    primaryWorker: "COPILOT",
    supportWorkers: ["CATHY"],
    focus: "Onboarding and expansion",
    suggestedActions: [
      "Start onboarding",
      "Schedule kickoff",
      "Identify expansion",
      "Request referral",
      "Gather testimonial",
    ],
    automationRules: [
      "Trigger onboarding sequence",
      "Schedule success reviews",
      "Monitor for expansion signals",
    ],
    color: "#84CC16", // lime
    icon: "Trophy",
    priority: "medium",
    systemPromptAddition: `
This deal was won! Excellent.
Focus on: Smooth onboarding, quick time-to-value, expansion opportunities.
Don't forget to ask for referrals and testimonials.
`,
  },

  lost: {
    stage: "lost",
    name: "Lost Deal Copilot",
    description: "Lost deal analysis and future re-engagement",
    primaryWorker: "COPILOT",
    supportWorkers: ["CATHY"],
    focus: "Loss analysis and future opportunity",
    suggestedActions: [
      "Log loss reason",
      "Schedule re-engagement",
      "Add to nurture",
      "Analyze for patterns",
      "Update ICP",
    ],
    automationRules: [
      "Capture loss reason",
      "Add to 6-month nurture",
      "Alert if competitor news",
    ],
    color: "#64748B", // slate
    icon: "XCircle",
    priority: "low",
    systemPromptAddition: `
This deal was lost. Learn from it.
Capture why: Price? Timing? Fit? Competition?
Not all lost deals are forever - add to nurture for future re-engagement.
Look for patterns across lost deals.
`,
  },

  nurture: {
    stage: "nurture",
    name: "CATHY - Nurturer",
    description: "Long-term relationship building and re-engagement",
    primaryWorker: "CATHY",
    supportWorkers: ["GIANNA", "COPILOT"],
    focus: "Long-term nurture and re-engagement",
    suggestedActions: [
      "Add to drip sequence",
      "Share relevant content",
      "Check for timing change",
      "Re-qualify",
      "Move to active",
    ],
    automationRules: [
      "Monthly value touches",
      "Alert on engagement spike",
      "Re-qualify quarterly",
      "Share relevant content",
    ],
    color: "#A855F7", // purple
    icon: "Heart",
    priority: "low",
    systemPromptAddition: `
You are CATHY, the nurturer.
These leads aren't ready now, but might be later.
Stay valuable: Share insights, not sales pitches.
Watch for buying signals that indicate timing has changed.
Play the long game - relationships compound.
`,
  },
};

/**
 * Get copilot for a lead's current stage
 */
export function getCopilotForStage(stage: LeadStage): StageCopilot {
  return STAGE_COPILOTS[stage] || STAGE_COPILOTS.data_prep;
}

/**
 * Get primary AI worker for a stage
 */
export function getPrimaryWorkerForStage(stage: LeadStage): AIWorker {
  return STAGE_COPILOTS[stage]?.primaryWorker || "COPILOT";
}

/**
 * Get stage-specific system prompt addition
 */
export function getStagePromptAddition(stage: LeadStage): string {
  return STAGE_COPILOTS[stage]?.systemPromptAddition || "";
}

/**
 * Get suggested actions for a lead at a given stage
 */
export function getSuggestedActions(stage: LeadStage): string[] {
  return STAGE_COPILOTS[stage]?.suggestedActions || [];
}

/**
 * Determine next logical stage based on action taken
 */
export function getNextStage(
  currentStage: LeadStage,
  action:
    | "respond"
    | "qualify"
    | "book"
    | "propose"
    | "close"
    | "lose"
    | "nurture",
): LeadStage {
  const transitions: Record<
    string,
    Partial<Record<typeof action, LeadStage>>
  > = {
    data_prep: { respond: "campaign_prep" },
    campaign_prep: { respond: "outbound_sms" },
    outbound_sms: { respond: "inbound_response", nurture: "nurture" },
    inbound_response: { qualify: "hot_call_queue", nurture: "nurture" },
    hot_call_queue: { book: "discovery", nurture: "nurture" },
    discovery: { qualify: "strategy", nurture: "nurture" },
    strategy: { propose: "proposal" },
    proposal: { close: "deal" },
    deal: { close: "won", lose: "lost" },
    won: { nurture: "nurture" },
    lost: { nurture: "nurture" },
    nurture: { respond: "inbound_response", qualify: "hot_call_queue" },
  };

  return transitions[currentStage]?.[action] || currentStage;
}

/**
 * Get all stages that need urgent attention
 */
export function getUrgentStages(): LeadStage[] {
  return Object.entries(STAGE_COPILOTS)
    .filter(([, config]) => config.priority === "urgent")
    .map(([stage]) => stage as LeadStage);
}

/**
 * Format stage for display
 */
export function formatStageName(stage: LeadStage): string {
  return STAGE_COPILOTS[stage]?.name || stage.replace(/_/g, " ").toUpperCase();
}

/**
 * Get color for stage (for UI)
 */
export function getStageColor(stage: LeadStage): string {
  return STAGE_COPILOTS[stage]?.color || "#6B7280";
}

/**
 * Check if a stage is handled by a specific worker
 */
export function isWorkerStage(stage: LeadStage, worker: AIWorker): boolean {
  const copilot = STAGE_COPILOTS[stage];
  return (
    copilot?.primaryWorker === worker ||
    copilot?.supportWorkers.includes(worker)
  );
}

/**
 * Get all stages for a specific worker
 */
export function getWorkerStages(worker: AIWorker): LeadStage[] {
  return Object.entries(STAGE_COPILOTS)
    .filter(
      ([, config]) =>
        config.primaryWorker === worker ||
        config.supportWorkers.includes(worker),
    )
    .map(([stage]) => stage as LeadStage);
}
