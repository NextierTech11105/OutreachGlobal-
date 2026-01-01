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

// ============ INDUSTRY-SPECIFIC CARTRIDGES ============
// Full GIANNA → CATHY → SABRINA flow for each vertical
// Target: 15-min call with Frank Sr to discuss partnership

export const ATLANTIC_COAST_INDUSTRY_TEMPLATES = {
  // ============================================================
  // CAR DEALERSHIPS (409,121 records - SIC 5511, 5521)
  // Goal: Vehicle transport for dealer trades, auction pickups, customer deliveries
  // ============================================================
  dealership: {
    vertical: "dealership",
    description: "New & used car dealerships - dealer trades, auction runs, customer deliveries",
    dataSource: { records: 409121, sicCodes: ["5511", "5521"] },

    // GIANNA - Initial Outreach (Day 0)
    initial: {
      agent: "GIANNA",
      timing: "Day 0",
      templates: [
        {
          id: "ac_dealer_init_1",
          name: "Dealer Trade Partner",
          content:
            "Hi {first_name}, Atlantic Coast Auto Transport here. We help dealerships like {company_name} move vehicles fast - dealer trades, auctions, customer deliveries. 15 min with Frank to discuss?",
          mergeFields: ["first_name", "company_name"],
          charCount: 193,
        },
        {
          id: "ac_dealer_init_2",
          name: "Overflow Capacity",
          content:
            "{first_name}, when {company_name} needs cars moved fast, do you have reliable backup? We partner with dealerships for overflow transport. Quick call with Frank?",
          mergeFields: ["first_name", "company_name"],
          charCount: 160,
        },
        {
          id: "ac_dealer_init_3",
          name: "Auction Runs",
          content:
            "Hi {first_name}, Atlantic Coast here. We move 500+ vehicles/month for dealerships - auctions, trades, customer deliveries. 15 min to see if we can help {company_name}?",
          mergeFields: ["first_name", "company_name"],
          charCount: 172,
        },
        {
          id: "ac_dealer_init_4",
          name: "Customer Delivery",
          content:
            "{first_name}, customers at {company_name} ever need cars delivered? We handle that. Also dealer trades and auction pickups. Worth a 15 min chat with Frank?",
          mergeFields: ["first_name", "company_name"],
          charCount: 160,
        },
        {
          id: "ac_dealer_init_5",
          name: "Fast Turnaround",
          content:
            "Hey {first_name}, Atlantic Coast Auto Transport. We get cars where they need to go - fast. Partnering with dealerships in {state}. 15 min with Frank this week?",
          mergeFields: ["first_name", "state"],
          charCount: 160,
        },
        {
          id: "ac_dealer_init_6",
          name: "Trade Network",
          content:
            "{first_name}, we're the transport partner for dealerships doing dealer trades in {state}. Atlantic Coast - reliable, fast, fair pricing. Quick call to connect?",
          mergeFields: ["first_name", "state"],
          charCount: 159,
        },
        {
          id: "ac_dealer_init_7",
          name: "Wholesale Move",
          content:
            "Hi {first_name}, moving wholesale inventory for {company_name}? Atlantic Coast handles dealer-to-dealer transport. 15 min with Frank to explore partnership?",
          mergeFields: ["first_name", "company_name"],
          charCount: 157,
        },
        {
          id: "ac_dealer_init_8",
          name: "Reliable Partner",
          content:
            "{first_name}, dealerships need a reliable transport partner. Atlantic Coast - we show up, we deliver, we make you look good. 15 min call?",
          mergeFields: ["first_name"],
          charCount: 141,
        },
      ],
    },

    // CATHY - Follow-up Nudge (Day 3-5)
    nudge: {
      agent: "CATHY",
      timing: "Day 3-5",
      usesDifferentNumber: true,
      templates: [
        {
          id: "ac_dealer_nudge_1",
          name: "Checking In",
          content:
            "Hey {first_name}, following up on Atlantic Coast. Still looking for a transport partner for {company_name}? Frank's got a few minutes this week.",
          mergeFields: ["first_name", "company_name"],
          charCount: 150,
        },
        {
          id: "ac_dealer_nudge_2",
          name: "Trade Season",
          content:
            "{first_name}, dealer trade season is picking up. Atlantic Coast can handle your overflow. 15 min with Frank to get set up before you need us?",
          mergeFields: ["first_name"],
          charCount: 147,
        },
        {
          id: "ac_dealer_nudge_3",
          name: "Quick Question",
          content:
            "Quick question {first_name} - who handles vehicle transport for {company_name} right now? If you need backup capacity, we should chat.",
          mergeFields: ["first_name", "company_name"],
          charCount: 144,
        },
        {
          id: "ac_dealer_nudge_4",
          name: "No Pressure",
          content:
            "{first_name}, no pressure - just checking if {company_name} ever needs cars moved on short notice. That's what we do. Call when you're ready.",
          mergeFields: ["first_name", "company_name"],
          charCount: 152,
        },
        {
          id: "ac_dealer_nudge_5",
          name: "Busy Season",
          content:
            "Hey {first_name}, I know dealerships are slammed. When you need a transport partner for overflow, Atlantic Coast is here. 15 min to get on the roster?",
          mergeFields: ["first_name"],
          charCount: 155,
        },
      ],
    },

    // SABRINA - Closer/Booker
    closer: {
      agent: "SABRINA",
      timing: "After positive response",
      templates: [
        {
          id: "ac_dealer_close_1",
          name: "Book Frank",
          content:
            "Great {first_name}! Let's get you 15 min with Frank to discuss the partnership. What day works this week - Tues or Thurs?",
          mergeFields: ["first_name"],
          charCount: 124,
        },
        {
          id: "ac_dealer_close_2",
          name: "Confirm Details",
          content:
            "{first_name}, perfect. Frank will call you at this number. Is there a better time - morning or afternoon works for {company_name}?",
          mergeFields: ["first_name", "company_name"],
          charCount: 138,
        },
        {
          id: "ac_dealer_close_3",
          name: "Quick Setup",
          content:
            "Awesome {first_name}! Once you chat with Frank, we can have you set up as a partner within 24hrs. What time works best for that call?",
          mergeFields: ["first_name"],
          charCount: 139,
        },
      ],
    },

    // Breakup - Final touch
    breakup: {
      agent: "CATHY",
      timing: "Day 10+",
      templates: [
        {
          id: "ac_dealer_break_1",
          name: "Door Open",
          content:
            "{first_name}, last note from Atlantic Coast. If {company_name} ever needs a transport partner, we're here. No hard feelings either way!",
          mergeFields: ["first_name", "company_name"],
          charCount: 140,
        },
      ],
    },
  },

  // ============================================================
  // MOVING COMPANIES (306,647 records - SIC 4212, 4213, 4214)
  // Goal: Referral partnership - when customers need cars moved during relocation
  // ============================================================
  moving_company: {
    vertical: "moving_company",
    description: "Moving & storage companies - referral partnership for auto transport add-on",
    dataSource: { records: 306647, sicCodes: ["4212", "4213", "4214"] },

    // GIANNA - Initial Outreach (Day 0)
    initial: {
      agent: "GIANNA",
      timing: "Day 0",
      templates: [
        {
          id: "ac_moving_init_1",
          name: "Add-On Service",
          content:
            "Hi {first_name}, Atlantic Coast Auto Transport here. When {company_name} moves a family, do they ask about their cars? We can be your add-on partner. 15 min?",
          mergeFields: ["first_name", "company_name"],
          charCount: 160,
        },
        {
          id: "ac_moving_init_2",
          name: "Referral Revenue",
          content:
            "{first_name}, moving companies like {company_name} get asked about car transport all the time. We handle it + referral fees. Quick call with Frank?",
          mergeFields: ["first_name", "company_name"],
          charCount: 156,
        },
        {
          id: "ac_moving_init_3",
          name: "Complete Relocation",
          content:
            "Hi {first_name}, families want complete relocation - household AND vehicles. Atlantic Coast partners with moving companies for the auto piece. 15 min to explore?",
          mergeFields: ["first_name"],
          charCount: 160,
        },
        {
          id: "ac_moving_init_4",
          name: "Easy Handoff",
          content:
            "{first_name}, when customers at {company_name} need cars moved, we take it off your plate. Reliable, insured, you look good. Worth a chat with Frank?",
          mergeFields: ["first_name", "company_name"],
          charCount: 155,
        },
        {
          id: "ac_moving_init_5",
          name: "Partner Program",
          content:
            "Hey {first_name}, Atlantic Coast has a partner program for moving companies. Referral fees + white-glove service for your clients. 15 min to discuss?",
          mergeFields: ["first_name"],
          charCount: 155,
        },
        {
          id: "ac_moving_init_6",
          name: "Cross-Country",
          content:
            "{first_name}, does {company_name} handle long-distance moves? Clients often need cars shipped too. We partner on that - 15 min with Frank?",
          mergeFields: ["first_name", "company_name"],
          charCount: 145,
        },
        {
          id: "ac_moving_init_7",
          name: "Seamless Experience",
          content:
            "Hi {first_name}, give your clients a seamless move - household + vehicles all handled. Atlantic Coast partners with {company_name}-type operations. Quick call?",
          mergeFields: ["first_name", "company_name"],
          charCount: 159,
        },
        {
          id: "ac_moving_init_8",
          name: "Simple Referral",
          content:
            "{first_name}, simple deal - you refer car transport, we handle it perfectly, you get a fee. Atlantic Coast. 15 min to set it up?",
          mergeFields: ["first_name"],
          charCount: 131,
        },
      ],
    },

    // CATHY - Follow-up Nudge (Day 3-5)
    nudge: {
      agent: "CATHY",
      timing: "Day 3-5",
      usesDifferentNumber: true,
      templates: [
        {
          id: "ac_moving_nudge_1",
          name: "Checking In",
          content:
            "Hey {first_name}, following up from Atlantic Coast. Still interested in partnering on auto transport for {company_name} clients?",
          mergeFields: ["first_name", "company_name"],
          charCount: 131,
        },
        {
          id: "ac_moving_nudge_2",
          name: "Peak Season",
          content:
            "{first_name}, moving season is coming up. Good time to have a car transport partner lined up for {company_name}. 15 min with Frank?",
          mergeFields: ["first_name", "company_name"],
          charCount: 140,
        },
        {
          id: "ac_moving_nudge_3",
          name: "Easy Money",
          content:
            "Hey {first_name}, it's easy referral revenue. Customer needs car moved, you hand them to us, you get paid. Atlantic Coast makes you look good. Chat?",
          mergeFields: ["first_name"],
          charCount: 154,
        },
        {
          id: "ac_moving_nudge_4",
          name: "Quick Q",
          content:
            "{first_name}, quick question - how often do {company_name} customers ask about moving their cars? If it's ever, we should talk partnership.",
          mergeFields: ["first_name", "company_name"],
          charCount: 151,
        },
        {
          id: "ac_moving_nudge_5",
          name: "No Hassle",
          content:
            "Hey {first_name}, no hassle partnership - you refer, we deliver, everyone's happy. Atlantic Coast. Frank has 15 min this week if you're interested.",
          mergeFields: ["first_name"],
          charCount: 155,
        },
      ],
    },

    // SABRINA - Closer/Booker
    closer: {
      agent: "SABRINA",
      timing: "After positive response",
      templates: [
        {
          id: "ac_moving_close_1",
          name: "Book Frank",
          content:
            "Perfect {first_name}! Frank can walk you through the partnership program. Does Tues or Wed work better for a 15 min call?",
          mergeFields: ["first_name"],
          charCount: 125,
        },
        {
          id: "ac_moving_close_2",
          name: "Next Steps",
          content:
            "{first_name}, great! After the call with Frank, we'll get you set up with referral codes and materials. What time works for the call?",
          mergeFields: ["first_name"],
          charCount: 140,
        },
        {
          id: "ac_moving_close_3",
          name: "Easy Setup",
          content:
            "Awesome {first_name}! Partnership setup is quick - one call with Frank, then you're ready to refer. Morning or afternoon better?",
          mergeFields: ["first_name"],
          charCount: 134,
        },
      ],
    },

    // Breakup - Final touch
    breakup: {
      agent: "CATHY",
      timing: "Day 10+",
      templates: [
        {
          id: "ac_moving_break_1",
          name: "Door Open",
          content:
            "{first_name}, last message from Atlantic Coast. If {company_name} ever wants a car transport partner, we're here. Best of luck!",
          mergeFields: ["first_name", "company_name"],
          charCount: 133,
        },
      ],
    },
  },

  // ============================================================
  // AUTO CARRIERS (Trucking companies already moving vehicles)
  // Goal: Overflow capacity partnership
  // ============================================================
  carrier: {
    vertical: "carrier",
    description: "Trucking/carrier companies - overflow network partnership",
    dataSource: { records: 306647, sicCodes: ["4212", "4213", "4214"] },

    initial: {
      agent: "GIANNA",
      timing: "Day 0",
      templates: [
        {
          id: "ac_carrier_init_1",
          name: "Overflow Network",
          content:
            "Hey {first_name}, Atlantic Coast Auto Transport here. We're building our carrier network in {state}. Got overflow loads that need moving. Interested in partnering?",
          mergeFields: ["first_name", "state"],
          charCount: 160,
        },
        {
          id: "ac_carrier_init_2",
          name: "Consistent Loads",
          content:
            "{first_name}, looking for consistent loads in {state}? Atlantic Coast moves 500+ vehicles/month. Let's get you on our dispatch list. 15 min with Frank?",
          mergeFields: ["first_name", "state"],
          charCount: 157,
        },
        {
          id: "ac_carrier_init_3",
          name: "Fill Your Lanes",
          content:
            "Hi {first_name}, Atlantic Coast here. We can help {company_name} fill lanes and keep trucks moving. Fair rates, fast pay. Worth a 15 min call?",
          mergeFields: ["first_name", "company_name"],
          charCount: 147,
        },
        {
          id: "ac_carrier_init_4",
          name: "Network Expansion",
          content:
            "{first_name}, we're expanding our carrier network and {company_name} looks like a good fit. Reliable loads, good margins. Quick call with Frank?",
          mergeFields: ["first_name", "company_name"],
          charCount: 153,
        },
      ],
    },

    nudge: {
      agent: "CATHY",
      timing: "Day 3-5",
      usesDifferentNumber: true,
      templates: [
        {
          id: "ac_carrier_nudge_1",
          name: "Lanes Available",
          content:
            "Hey {first_name}, following up from Atlantic Coast. We've got lanes available through {state}. {company_name} interested in consistent loads?",
          mergeFields: ["first_name", "state", "company_name"],
          charCount: 148,
        },
        {
          id: "ac_carrier_nudge_2",
          name: "Fast Pay",
          content:
            "{first_name}, Atlantic Coast pays fast and keeps trucks moving. If {company_name} has capacity, let's talk partnership. 15 min?",
          mergeFields: ["first_name", "company_name"],
          charCount: 136,
        },
      ],
    },

    closer: {
      agent: "SABRINA",
      timing: "After positive response",
      templates: [
        {
          id: "ac_carrier_close_1",
          name: "Book Frank",
          content:
            "Great {first_name}! Frank will walk you through rates and lanes. What day works for a 15 min call - Tues or Thurs?",
          mergeFields: ["first_name"],
          charCount: 118,
        },
      ],
    },

    breakup: {
      agent: "CATHY",
      timing: "Day 10+",
      templates: [
        {
          id: "ac_carrier_break_1",
          name: "Door Open",
          content:
            "{first_name}, last touch from Atlantic Coast. If {company_name} ever needs overflow loads, we're here. Keep moving!",
          mergeFields: ["first_name", "company_name"],
          charCount: 121,
        },
      ],
    },
  },
};

// ============ FRANK'S PARTNERSHIP TEMPLATES (20) ============
// Generic high-value templates - no merge fields, signed by Frank
// Focus: High standards, reliability, margin for partners, 15 min call CTA
export const FRANK_PARTNERSHIP_TEMPLATES = {
  agent: "GIANNA",
  timing: "Day 0",
  description:
    "Frank-branded partnership outreach emphasizing high standards and margin",
  templates: [
    {
      id: "frank_1",
      name: "Standards + Margin",
      content:
        "We move cars at the highest standards for partners, with dependable service and real margin on every load. Open to a quick 15 min partnership call? – Frank.",
    },
    {
      id: "frank_2",
      name: "True Partner",
      content:
        "We move cars at the highest standards and act as a true partner, with reliable service and room for profit. Open to a 15 min call to connect? – Frank.",
    },
    {
      id: "frank_3",
      name: "Coverage + Margins",
      content:
        "We move cars at the highest standards, giving partners dependable coverage and solid margins. Open to a 15 min partnership chat this week? – Frank.",
    },
    {
      id: "frank_4",
      name: "Reliability Focus",
      content:
        "We move cars at the highest standards for partners who value reliability and margin. Open to a quick 15 min call to explore fit? – Frank.",
    },
    {
      id: "frank_5",
      name: "Profit Per Lane",
      content:
        "We move cars at the highest standards so partners get dependable service and profit on each lane. Open to a brief 15 min call? – Frank.",
    },
    {
      id: "frank_6",
      name: "Long-term Partners",
      content:
        "We move cars at the highest standards and focus on long-term partners, not one-offs, with room for you to make money. 15 min call? – Frank.",
    },
    {
      id: "frank_7",
      name: "Lock In Lanes",
      content:
        "We move cars at the highest standards, helping partners lock in reliable lanes and strong margins. Open to a 15 min intro call? – Frank.",
    },
    {
      id: "frank_8",
      name: "Earning Power",
      content:
        "We move cars at the highest standards for partners, blending dependable service with real earning power. Open to a quick 15 min chat? – Frank.",
    },
    {
      id: "frank_9",
      name: "Core Partner",
      content:
        "We move cars at the highest standards and aim to be a core transport partner, with reliability and profit built in. Open to 15 min? – Frank.",
    },
    {
      id: "frank_10",
      name: "Grow Margin",
      content:
        "We move cars at the highest standards so partners can count on service and still grow margin. Open to a short 15 min partnership call? – Frank.",
    },
    {
      id: "frank_11",
      name: "Steady Capacity",
      content:
        "We move cars at the highest standards, giving partners steady capacity and room to make money. Open to a 15 min call to compare options? – Frank.",
    },
    {
      id: "frank_12",
      name: "Dependable Runs",
      content:
        "We move cars at the highest standards for partners who need dependable runs and healthy profit. Open to a quick 15 min intro? – Frank.",
    },
    {
      id: "frank_13",
      name: "Unit Economics",
      content:
        "We move cars at the highest standards, supporting partners with reliable execution and strong unit economics. Open to a 15 min partnership chat? – Frank.",
    },
    {
      id: "frank_14",
      name: "Partner Lanes",
      content:
        "We move cars at the highest standards, building partner lanes with dependable service and profit on each move. 15 min to talk through it? – Frank.",
    },
    {
      id: "frank_15",
      name: "Predictable Service",
      content:
        "We move cars at the highest standards so partners get predictable service and margin that actually works. Open to a quick 15 min call? – Frank.",
    },
    {
      id: "frank_16",
      name: "Core Partners",
      content:
        "We move cars at the highest standards and are looking for a few core partners who value reliability and margin. Open to 15 min? – Frank.",
    },
    {
      id: "frank_17",
      name: "Handle The Grind",
      content:
        "We move cars at the highest standards, leaving room for partners to profit while we handle the grind. Open to a 15 min partnership call? – Frank.",
    },
    {
      id: "frank_18",
      name: "Partner Lane Treatment",
      content:
        "We move cars at the highest standards and treat every lane like a partner lane, with dependable service and profit. 15 min to see if we align? – Frank.",
    },
    {
      id: "frank_19",
      name: "Win On Price",
      content:
        "We move cars at the highest standards so partners can rely on us and still win on price. Open to a brief 15 min call? – Frank.",
    },
    {
      id: "frank_20",
      name: "Dependable + Margin",
      content:
        "We move cars at the highest standards, built around partners who want dependable service and margin. Open to a quick 15 min intro call? – Frank.",
    },
  ],
};

// ============ DATA SOURCES ============
// USBizData databases for Atlantic Coast carrier partnerships
// Frank Sr runs 15-min partnership calls - comparable to Nextier consulting model
export const ATLANTIC_COAST_DATA_SOURCES = {
  dealerships: {
    source: "USBizData",
    name: "US Automobile Dealers Database",
    records: 409121,
    sicCodes: ["5511", "5521"],
    lastUpdate: "Q4 2025",
    description: "Car dealerships - dealer trades & vehicle transport needs",
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
  movingCompanies: {
    source: "USBizData",
    name: "SIC 4214 - Local Trucking With Storage",
    records: 32641,
    sicCodes: ["4214"],
    lastUpdate: "2025",
    description:
      "Moving companies - referral partnerships for auto transport add-on",
    fields: [
      "company_name",
      "contact_name",
      "email",
      "street_address",
      "city",
      "state",
      "zip_code",
      "phone_number",
      "website",
      "employees",
      "annual_revenue",
    ],
  },
  truckingCompanies: {
    source: "USBizData",
    name: "US Trucking-Freight Company Database",
    records: 306647,
    sicCodes: ["4212", "4213", "4214"],
    lastUpdate: "Q4 2025",
    price: 27.0,
    description: "Trucking carriers - overflow capacity & network expansion",
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
