// Atlantic Coast Auto Transport - Carrier Partnership Templates
// Goal: Book 15-min calls/Zooms to discuss strategic partnership for moving cars
// Target Industries: Dealerships, Moving Companies, Auto Carriers

export const ATLANTIC_COAST_LIBRARY = {
  // ============ INITIAL OUTREACH (GIANNA - Day 0) ============
  initial: {
    agent: "GIANNA",
    timing: "Day 0",
    description: "First contact with potential carrier partners",
    templates: [
      {
        id: "ac_initial_1",
        name: "Direct Partnership",
        content:
          "Hi {first_name}, this is {agent} from Atlantic Coast Auto Transport. We're expanding our carrier network and looking for strategic partners in {state}. Got 15 min this week to explore how we can send you overflow loads?",
        mergeFields: ["first_name", "agent", "state"],
        charCount: 234,
      },
      {
        id: "ac_initial_2",
        name: "Volume Play",
        content:
          "Hey {first_name}, Atlantic Coast Auto Transport here. We move 500+ vehicles/month and need reliable partners like {company_name}. Quick 15-min call to see if there's a fit? When works?",
        mergeFields: ["first_name", "company_name"],
        charCount: 189,
      },
      {
        id: "ac_initial_3",
        name: "Geographic Focus",
        content:
          "Hi {first_name}, we're looking for carrier partners in the {state} region. Atlantic Coast Auto Transport - we have consistent auto transport loads. Worth a quick Zoom to discuss?",
        mergeFields: ["first_name", "state"],
        charCount: 182,
      },
      {
        id: "ac_initial_4",
        name: "Casual Intro",
        content:
          "{first_name} - saw {company_name} online. We're Atlantic Coast Auto Transport, always looking for solid partners to handle overflow. 15 min call this week to chat partnership?",
        mergeFields: ["first_name", "company_name"],
        charCount: 179,
      },
      {
        id: "ac_initial_5",
        name: "Value First",
        content:
          "Hi {first_name}, Atlantic Coast here. We pay fast, loads are consistent, and we take care of our partners. Looking for carriers in {state}. Quick call to see if we're a fit?",
        mergeFields: ["first_name", "state"],
        charCount: 178,
      },
    ],
  },

  // ============ FOLLOW-UP / NUDGE (CATHY - Day 3-5) ============
  nudge: {
    agent: "CATHY",
    timing: "Day 3-5",
    description: "Follow-up for non-responders with light humor",
    usesDifferentNumber: true,
    templates: [
      {
        id: "ac_nudge_1",
        name: "Soft Bump",
        content:
          "Hey {first_name}, following up on my message about partnering with Atlantic Coast. We've got loads moving through {state} regularly. Still interested in a quick chat?",
        mergeFields: ["first_name", "state"],
        charCount: 168,
      },
      {
        id: "ac_nudge_2",
        name: "FOMO Play",
        content:
          "{first_name} - just locked in 3 new carrier partners this week. Still have room for {company_name} if you're interested. 15 min call?",
        mergeFields: ["first_name", "company_name"],
        charCount: 138,
      },
      {
        id: "ac_nudge_3",
        name: "Direct Ask",
        content:
          "Hi {first_name}, circling back - would a partnership with Atlantic Coast Auto Transport make sense for {company_name}? Quick Zoom to find out?",
        mergeFields: ["first_name", "company_name"],
        charCount: 148,
      },
      {
        id: "ac_nudge_4",
        name: "Busy Acknowledge",
        content:
          "{first_name}, I know you're busy running {company_name}. Just need 15 min to see if our overflow loads are a fit for you. This week work?",
        mergeFields: ["first_name", "company_name"],
        charCount: 141,
      },
    ],
  },

  // ============ APPOINTMENT CONFIRM (SABRINA - As Scheduled) ============
  appointment: {
    agent: "SABRINA",
    timing: "As scheduled",
    description: "Appointment confirmation and reminders",
    templates: [
      {
        id: "ac_appt_1",
        name: "Confirm Call",
        content:
          "Hi {first_name}, confirming our call tomorrow at {time} to discuss the Atlantic Coast partnership. Talk soon!",
        mergeFields: ["first_name", "time"],
        charCount: 112,
      },
      {
        id: "ac_appt_2",
        name: "Day-Of Reminder",
        content:
          "Hey {first_name}, quick reminder - we're chatting today at {time} about moving cars together. See you on Zoom!",
        mergeFields: ["first_name", "time"],
        charCount: 110,
      },
      {
        id: "ac_appt_3",
        name: "Reschedule Offer",
        content:
          "{first_name}, if {time} doesn't work anymore, no problem - what time works better this week? Want to make sure we connect.",
        mergeFields: ["first_name", "time"],
        charCount: 125,
      },
    ],
  },

  // ============ RE-ENGAGEMENT / RETARGET (GIANNA - Day 14+) ============
  retarget: {
    agent: "GIANNA",
    timing: "Day 14+",
    description: "Re-engagement for cold/dead leads",
    templates: [
      {
        id: "ac_retarget_1",
        name: "Been A While",
        content:
          "{first_name}, it's been a minute. Atlantic Coast is still looking for partners in {state}. Things change - worth revisiting a quick call?",
        mergeFields: ["first_name", "state"],
        charCount: 143,
      },
      {
        id: "ac_retarget_2",
        name: "New Opportunity",
        content:
          "Hey {first_name}, we just landed a big contract with loads coming through {state}. Need carrier partners ASAP. 15 min to discuss?",
        mergeFields: ["first_name", "state"],
        charCount: 136,
      },
      {
        id: "ac_retarget_3",
        name: "Last Touch",
        content:
          "{first_name}, last reach out - if partnering with Atlantic Coast isn't a fit, no worries. But if you want consistent auto loads, I'm here.",
        mergeFields: ["first_name"],
        charCount: 144,
      },
    ],
  },
};

// ============ MERGE FIELDS CONFIGURATION ============
export const ATLANTIC_COAST_MERGE_FIELDS = {
  first_name: {
    source: "contact",
    field: "firstName",
    example: "John",
    required: true,
  },
  company_name: {
    source: "company",
    field: "name",
    example: "ABC Trucking",
    required: false,
  },
  state: {
    source: "location",
    field: "state",
    example: "Florida",
    required: false,
  },
  agent: {
    source: "system",
    field: "agentName",
    example: "Gianna",
    required: true,
    default: "Gianna",
  },
  time: {
    source: "appointment",
    field: "scheduledTime",
    example: "2pm EST",
    required: false,
  },
};

// ============ STAGE FLOW CONFIGURATION ============
export const ATLANTIC_COAST_STAGE_FLOW = {
  stages: [
    {
      id: "initial",
      name: "Initial Outreach",
      agent: "GIANNA",
      timing: { day: 0 },
      templates: ATLANTIC_COAST_LIBRARY.initial.templates,
    },
    {
      id: "nudge",
      name: "Follow-up Nudge",
      agent: "CATHY",
      timing: { day: 3, max: 5 },
      usesDifferentNumber: true,
      templates: ATLANTIC_COAST_LIBRARY.nudge.templates,
    },
    {
      id: "retarget",
      name: "Re-engagement",
      agent: "GIANNA",
      timing: { day: 14 },
      templates: ATLANTIC_COAST_LIBRARY.retarget.templates,
    },
    {
      id: "appointment",
      name: "Book Appointment",
      agent: "SABRINA",
      timing: { trigger: "manual" },
      templates: ATLANTIC_COAST_LIBRARY.appointment.templates,
    },
  ],

  // Flow rules
  rules: {
    noResponseAfterInitial: "nudge",
    noResponseAfterNudge: "retarget",
    positiveResponse: "appointment",
    optOut: "remove",
  },
};

// ============ INDUSTRY-SPECIFIC VARIATIONS ============
export const ATLANTIC_COAST_INDUSTRY_TEMPLATES = {
  // Dealership-specific openers
  dealership: {
    initial: [
      {
        id: "ac_dealer_1",
        name: "Dealer Overflow",
        content:
          "Hi {first_name}, Atlantic Coast Auto Transport here. We partner with dealerships like {company_name} to handle vehicle transport when your regular carriers are maxed. Worth a 15 min call to discuss backup capacity?",
        mergeFields: ["first_name", "company_name"],
      },
      {
        id: "ac_dealer_2",
        name: "Dealer Trade",
        content:
          "{first_name}, do you handle dealer trades at {company_name}? Atlantic Coast can move vehicles between your lots fast. Quick chat to see if we can help?",
        mergeFields: ["first_name", "company_name"],
      },
    ],
  },

  // Moving company-specific openers
  moving_company: {
    initial: [
      {
        id: "ac_moving_1",
        name: "Auto Add-On",
        content:
          "Hi {first_name}, Atlantic Coast here. When {company_name} handles a family move, do they need help transporting vehicles? We could be a great add-on service for your clients. 15 min to discuss?",
        mergeFields: ["first_name", "company_name"],
      },
      {
        id: "ac_moving_2",
        name: "Referral Partnership",
        content:
          "{first_name}, moving companies like {company_name} often get asked about car transport. We handle that and can set up a referral arrangement. Quick call to explore?",
        mergeFields: ["first_name", "company_name"],
      },
    ],
  },

  // Auto carrier-specific openers
  carrier: {
    initial: [
      {
        id: "ac_carrier_1",
        name: "Overflow Network",
        content:
          "Hey {first_name}, Atlantic Coast Auto Transport here. We're building out our carrier network in {state}. Got overflow loads that need moving. Interested in partnering?",
        mergeFields: ["first_name", "state"],
      },
      {
        id: "ac_carrier_2",
        name: "Consistent Loads",
        content:
          "{first_name}, looking for consistent loads in {state}? Atlantic Coast moves 500+ vehicles/month. Let's chat about getting you on our dispatch list. 15 min?",
        mergeFields: ["first_name", "state"],
      },
    ],
  },
};

// ============ FRANK'S PARTNERSHIP TEMPLATES (20) ============
// Generic high-value templates - no merge fields, signed by Frank
// Focus: High standards, reliability, margin for partners, 15 min call CTA
export const FRANK_PARTNERSHIP_TEMPLATES = {
  agent: "GIANNA",
  timing: "Day 0",
  description: "Frank-branded partnership outreach emphasizing high standards and margin",
  templates: [
    {
      id: "frank_1",
      name: "Standards + Margin",
      content: "We move cars at the highest standards for partners, with dependable service and real margin on every load. Open to a quick 15 min partnership call? – Frank.",
    },
    {
      id: "frank_2",
      name: "True Partner",
      content: "We move cars at the highest standards and act as a true partner, with reliable service and room for profit. Open to a 15 min call to connect? – Frank.",
    },
    {
      id: "frank_3",
      name: "Coverage + Margins",
      content: "We move cars at the highest standards, giving partners dependable coverage and solid margins. Open to a 15 min partnership chat this week? – Frank.",
    },
    {
      id: "frank_4",
      name: "Reliability Focus",
      content: "We move cars at the highest standards for partners who value reliability and margin. Open to a quick 15 min call to explore fit? – Frank.",
    },
    {
      id: "frank_5",
      name: "Profit Per Lane",
      content: "We move cars at the highest standards so partners get dependable service and profit on each lane. Open to a brief 15 min call? – Frank.",
    },
    {
      id: "frank_6",
      name: "Long-term Partners",
      content: "We move cars at the highest standards and focus on long-term partners, not one-offs, with room for you to make money. 15 min call? – Frank.",
    },
    {
      id: "frank_7",
      name: "Lock In Lanes",
      content: "We move cars at the highest standards, helping partners lock in reliable lanes and strong margins. Open to a 15 min intro call? – Frank.",
    },
    {
      id: "frank_8",
      name: "Earning Power",
      content: "We move cars at the highest standards for partners, blending dependable service with real earning power. Open to a quick 15 min chat? – Frank.",
    },
    {
      id: "frank_9",
      name: "Core Partner",
      content: "We move cars at the highest standards and aim to be a core transport partner, with reliability and profit built in. Open to 15 min? – Frank.",
    },
    {
      id: "frank_10",
      name: "Grow Margin",
      content: "We move cars at the highest standards so partners can count on service and still grow margin. Open to a short 15 min partnership call? – Frank.",
    },
    {
      id: "frank_11",
      name: "Steady Capacity",
      content: "We move cars at the highest standards, giving partners steady capacity and room to make money. Open to a 15 min call to compare options? – Frank.",
    },
    {
      id: "frank_12",
      name: "Dependable Runs",
      content: "We move cars at the highest standards for partners who need dependable runs and healthy profit. Open to a quick 15 min intro? – Frank.",
    },
    {
      id: "frank_13",
      name: "Unit Economics",
      content: "We move cars at the highest standards, supporting partners with reliable execution and strong unit economics. Open to a 15 min partnership chat? – Frank.",
    },
    {
      id: "frank_14",
      name: "Partner Lanes",
      content: "We move cars at the highest standards, building partner lanes with dependable service and profit on each move. 15 min to talk through it? – Frank.",
    },
    {
      id: "frank_15",
      name: "Predictable Service",
      content: "We move cars at the highest standards so partners get predictable service and margin that actually works. Open to a quick 15 min call? – Frank.",
    },
    {
      id: "frank_16",
      name: "Core Partners",
      content: "We move cars at the highest standards and are looking for a few core partners who value reliability and margin. Open to 15 min? – Frank.",
    },
    {
      id: "frank_17",
      name: "Handle The Grind",
      content: "We move cars at the highest standards, leaving room for partners to profit while we handle the grind. Open to a 15 min partnership call? – Frank.",
    },
    {
      id: "frank_18",
      name: "Partner Lane Treatment",
      content: "We move cars at the highest standards and treat every lane like a partner lane, with dependable service and profit. 15 min to see if we align? – Frank.",
    },
    {
      id: "frank_19",
      name: "Win On Price",
      content: "We move cars at the highest standards so partners can rely on us and still win on price. Open to a brief 15 min call? – Frank.",
    },
    {
      id: "frank_20",
      name: "Dependable + Margin",
      content: "We move cars at the highest standards, built around partners who want dependable service and margin. Open to a quick 15 min intro call? – Frank.",
    },
  ],
};

// ============ DATA SOURCES ============
// USBizData Automobile Dealers Database
// 409,121 records - SIC 5511, 5521 - Q4 2025
// Fields: Company, Contact, Email, Address, City, State, Zip, Phone, Website, Employees, Revenue
export const ATLANTIC_COAST_DATA_SOURCES = {
  dealerships: {
    source: "USBizData",
    name: "US Automobile Dealers Database",
    records: 409121,
    sicCodes: ["5511", "5521"],
    lastUpdate: "Q4 2025",
    fields: [
      "company_name",
      "contact_name",
      "email",
      "street_address",
      "city",
      "state",
      "zip_code",
      "county",
      "area_code",
      "phone_number",
      "website",
      "employees",
      "annual_revenue",
      "sic_code",
      "sic_description",
    ],
  },
};

// ============ COMPLIANCE CONFIGURATION ============
export const ATLANTIC_COAST_COMPLIANCE = {
  // SMS timing rules
  timing: {
    earliestSend: "08:00", // 8am local time
    latestSend: "21:00", // 9pm local time
    timezone: "recipient", // Use recipient's timezone
    blackoutDays: ["Sunday"], // Optional: skip Sundays
  },

  // Character limits
  limits: {
    sms: 160, // Standard SMS limit
    mms: 1600, // MMS limit if using images
  },

  // DNC handling
  dnc: {
    keywords: [
      "stop",
      "unsubscribe",
      "remove",
      "opt out",
      "cancel",
      "quit",
      "end",
    ],
    action: "immediate_remove",
    confirmationMessage:
      "You've been removed from our list. Reply START to re-subscribe.",
  },

  // Required disclosures (if any)
  disclosures: {
    initialMessage: false, // No disclosure required for B2B
    footer: null,
  },
};

// ============ KPI TRACKING ============
export const ATLANTIC_COAST_KPIS = {
  metrics: [
    { id: "response_rate", name: "Response Rate", target: 0.15 }, // 15%
    { id: "booking_rate", name: "Call Booking Rate", target: 0.1 }, // 10%
    { id: "show_rate", name: "Show Rate", target: 0.8 }, // 80%
    { id: "partnership_rate", name: "Partnership Conversion", target: 0.25 }, // 25%
  ],

  trackBy: ["template", "stage", "agent", "industry", "state"],
};

// Default export
export default ATLANTIC_COAST_LIBRARY;
