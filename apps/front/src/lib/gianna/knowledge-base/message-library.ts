// GIANNA MESSAGE LIBRARY - 160 CHAR MASTERPIECES
// Blunt NY Direct | Numbers Game | Two Captures: Valuation Report OR 15-Min Strategy
// Human-in-loop for first 3 rebuttals | Agent learns from feedback

export const CAPTURE_GOALS = {
  valuation_report: {
    name: "Free Property Valuation Report",
    cta: "Want me to run the numbers on your property?",
    value_prop: "See what your property is actually worth in today's market",
  },
  strategy_session: {
    name: "15-Min AI Strategy Session",
    cta: "Got 15 mins this week?",
    value_prop: "Discover how AI can 10x your business efficiency",
  },
};

// ============ INITIAL OPENER LIBRARY - 160 CHAR MAX ============
// Categories: Property/Real Estate, Business/Blue Collar, AI/Tech, General
export const OPENER_LIBRARY = {
  // === PROPERTY/REAL ESTATE OPENERS (50) ===
  property: [
    // Blunt value drops
    "{firstName}, your property at {address} - I ran numbers. You're sitting on more equity than you think. Want the report?",
    "{firstName}, quick math on {address}: current market says you're undervaluing it. Free analysis if you want it.",
    "Hey {firstName}. Properties like yours at {address} are moving fast. Want to know what yours is worth? Free report.",
    "{firstName}, I help property owners see what they're actually sitting on. {address} caught my eye. Numbers?",
    "Look {firstName}, {address} in this market? You should know your options. Free valuation - interested?",

    // FOMO/Competition
    "{firstName}, 3 properties on your block sold last month. You know what yours is worth? I'll tell you free.",
    "Your neighbor just got their property valued. {firstName}, want to see how {address} compares?",
    "{firstName}, investors are circling properties like {address}. Know your number before they lowball you.",
    "Heads up {firstName} - market's shifting. Smart owners are getting valuations now. Want yours?",
    "{firstName}, everyone on {street} got letters from investors. Know your real value first. Free report.",

    // Direct/Blunt
    "{firstName}. {address}. I can tell you in 2 mins if you're sitting on gold or not. Want the truth?",
    "No BS {firstName} - I'll tell you exactly what {address} is worth today. Free. Interested?",
    "{firstName}, I don't waste time. Your property could be worth more than you think. Want to know?",
    "Straight up {firstName} - I run numbers on properties. Yours looked interesting. Free valuation?",
    "{firstName}, two options: wonder what your property's worth, or I tell you for free. Which one?",

    // Curiosity gap
    "{firstName}, something interesting about {address}... want me to send over what I found?",
    "Hey {firstName}, ran {address} through our system. Results surprised me. Want to see?",
    "{firstName}, there's a number attached to {address} you should know. Free to share if interested.",
    "Quick question {firstName} - you know what happened to property values on {street} this year?",
    "{firstName}, I found something about {address} while researching your area. Worth a look?",

    // Social proof
    "{firstName}, just helped 3 owners on {street} understand their equity. Your turn?",
    "Owner down the block from {address} was shocked at their valuation. {firstName}, want yours?",
    "{firstName}, most owners undervalue by 15-20%. Free report shows you the real number.",
    "Fun fact {firstName}: 80% of owners I talk to don't know their true property value. You one of them?",
    "{firstName}, I've valued 50+ properties in {city} this month. Haven't done {address} yet. Want in?",

    // Urgency
    "{firstName}, market data expires fast. Get your {address} valuation while numbers are current.",
    "Interest rates just moved. {firstName}, that changes your {address} value. Want updated numbers?",
    "{firstName}, Q4 is when buyers get serious. Know your {address} value before they come knocking.",
    "Market's hot right now {firstName}. Perfect time to know what {address} could get you.",
    "{firstName}, timing matters in real estate. Right now is a good time to know your number.",

    // Pain point
    "{firstName}, tired of guessing what {address} is worth? I'll just tell you. Free.",
    "Stop wondering {firstName}. I'll give you the exact value of {address} in one report.",
    "{firstName}, uncertainty sucks. Know exactly what you're working with at {address}. Free report.",
    "Hey {firstName}, rather than guess - want actual numbers on {address}?",
    "{firstName}, investors know your property's value. Shouldn't you?",

    // Challenge
    "{firstName}, bet you don't know what {address} would sell for today. Want to find out?",
    "Most owners are wrong about their property value {firstName}. Are you?",
    "{firstName}, think you know what {address} is worth? Let me check your math. Free.",
    "Quick test {firstName} - what do you think {address} is worth? I'll tell you if you're close.",
    "{firstName}, I'll prove you're undervaluing {address}. Free report. Deal?",

    // Casual/Friendly
    "Hey {firstName}, ran across {address} in my research. Cool property. Want to know the value?",
    "{firstName}, quick question about {address} - you ever get it appraised recently?",
    "Morning {firstName}! Doing free valuations in {city} this week. {address} on the list?",
    "{firstName}, I'm Gianna. I tell property owners what their places are really worth. Want in?",
    "Hey {firstName}, I specialize in {city} property values. {address} looked interesting.",

    // Multi-property
    "{firstName}, you own multiple properties right? I can value them all. Start with {address}?",
    "For landlords like you {firstName} - knowing your portfolio value is power. Free analysis?",
    "{firstName}, smart investors know their numbers. Want your {address} numbers?",
    "Hey {firstName}, I work with property owners who like knowing exactly where they stand.",
    "{firstName}, you seem like someone who'd want the facts on {address}. Am I right?",
  ],

  // === BUSINESS/BLUE COLLAR OPENERS (50) ===
  business: [
    // Value bomb
    "{firstName}, businesses like {companyName} are leaving 10+ hours/week on the table. Want to see where?",
    "Hey {firstName}, I help {industry} owners find hidden time. {companyName} caught my eye.",
    "{firstName}, what if I told you {companyName} could run smoother without hiring anyone?",
    "Quick thought {firstName} - most {industry} owners are doing things the hard way. You?",
    "{firstName}, I've saved {industry} businesses 15 hrs/week. {companyName} next?",

    // AI angle
    "{firstName}, AI isn't replacing {industry} - it's making owners like you more money. Curious?",
    "Hey {firstName}, other {industry} owners are using AI now. {companyName} should too. Quick chat?",
    "{firstName}, AI for {industry} is real. Not robots - just smart automation. 15 mins to explain?",
    "Look {firstName}, AI isn't sci-fi anymore. It's making {industry} owners rich. Want to know how?",
    "{firstName}, the {industry} owners who figure out AI first win. 15 min strategy session?",

    // Pain points
    "{firstName}, tired of the phone ringing 24/7? AI can handle it. Seriously.",
    "Hey {firstName}, what's eating most of your time at {companyName}? Bet AI can fix it.",
    "{firstName}, scheduling, follow-ups, paperwork - AI handles all of it. Want to see?",
    "Every {industry} owner I talk to {firstName} says the same thing: 'not enough hours.' Sound familiar?",
    "{firstName}, you didn't start {companyName} to do paperwork. Let AI do it.",

    // Numbers game
    "{firstName}, I'll show you exactly how much time {companyName} is wasting. Free analysis.",
    "Quick math {firstName}: 10 hrs/week x 50 weeks = 500 hours/year. That's what AI saves.",
    "{firstName}, what's your time worth? Most {industry} owners say $100+/hr. You're losing thousands.",
    "Hey {firstName}, I quantify waste. For {companyName}, I'm guessing 12+ hrs/week. Close?",
    "{firstName}, numbers don't lie. {companyName} is probably bleeding time. Want proof?",

    // FOMO
    "{firstName}, your competitors are automating. {companyName} should too. Quick chat?",
    "While you're reading this {firstName}, another {industry} owner just automated their business.",
    "Hey {firstName}, {industry} is changing fast. Owners who adapt are crushing it. You adapting?",
    "{firstName}, 3 {industry} businesses in {city} automated last month. You're next?",
    "The smart {industry} owners are already doing this {firstName}. You gonna catch up?",

    // Direct challenge
    "{firstName}, you've been running {companyName} the hard way. Want to see the easy way?",
    "Honest question {firstName} - is {companyName} running you, or you running it?",
    "Hey {firstName}, you're working too hard. AI can fix that. 15 mins to show you.",
    "{firstName}, I can make {companyName} more profitable with one conversation. Interested?",
    "No offense {firstName}, but {companyName} is probably inefficient. Want me to prove it?",

    // Succession/Exit
    "{firstName}, when you're ready to sell {companyName}, buyers want automation. Start now.",
    "Hey {firstName}, AI-enabled businesses sell for more. {companyName}'s future value = higher.",
    "{firstName}, thinking about retirement? {companyName} needs to run without you. AI helps.",
    "Exit planning {firstName} - {companyName} is worth more automated. Let's talk strategy.",
    "{firstName}, what's {companyName} worth today? What if AI doubled that? 15 mins.",

    // Casual
    "Hey {firstName}, I help {industry} owners work smarter. {companyName} doing ok?",
    "{firstName}, quick question - how much time you spending on stuff that isn't making money?",
    "Morning {firstName}! Saw {companyName} - cool business. Ever think about automating?",
    "{firstName}, I'm Gianna. I make {industry} businesses run smoother. Coffee chat?",
    "Hey {firstName}, most {industry} owners hate admin work. You? AI can help.",

    // Specific industries
    "{firstName}, HVAC scheduling is a nightmare. Unless you use AI. Want to see?",
    "Hey {firstName}, plumbing dispatch + AI = no more scheduling headaches. Interested?",
    "{firstName}, construction estimating takes forever. AI cuts that in half. Demo?",
    "Landscaping routes eating your profits {firstName}? AI optimizes them. Quick chat?",
    "{firstName}, auto shop workflow can run itself with AI. {companyName} ready?",
  ],

  // === GENERAL/UNIVERSAL OPENERS (30) ===
  general: [
    // Pattern interrupt
    "Not a sales call {firstName}. Just curious if you've looked at AI for your business yet.",
    "{firstName}, this is different from usual calls. 15 mins, I show you something interesting.",
    "Hey {firstName}, ignore this if you want - but I think you'll regret it. Quick question?",
    "{firstName}, I know you're busy. That's exactly why you need to hear this. 2 mins?",
    "Look {firstName}, I could give you a pitch or I could just show you the numbers. Which?",

    // Confidence
    "{firstName}, I've got 15 mins that could change how you think about your business. In?",
    "Hey {firstName}, I don't waste time - mine or yours. Got something worth seeing.",
    "{firstName}, I'm going to be straight with you. This is worth your time. Period.",
    "Most people ignore messages like this {firstName}. The smart ones don't. You smart?",
    "{firstName}, I'm betting you're curious. Let's find out if I'm right. Quick call?",

    // Numbers
    "{firstName}, 15 minutes. Free. No pitch. Just strategy. What's the downside?",
    "Quick ROI check {firstName}: 15 mins now could = 15 hrs/week saved. Math works.",
    "{firstName}, I've done this 100+ times. 92% said it was worth their time. You next?",
    "Hey {firstName}, 15 mins, 0 cost, potentially huge upside. Why wouldn't you?",
    "{firstName}, worst case: you waste 15 mins. Best case: everything changes. Risk it?",

    // Humor/Leslie Nielsen
    "{firstName}, I promise I won't try to sell you a timeshare. Just smart automation stuff.",
    "Don't worry {firstName}, this isn't one of those calls. Unless you want it to be.",
    "Hey {firstName}, either I'm about to waste your time or blow your mind. Only one way to find out.",
    "{firstName}, my calendar says I should call you. My calendar is usually right. Chat?",
    "Quick question {firstName}: you like making money while sleeping? Cool. Let's talk.",

    // Scarcity
    "{firstName}, I only do a few of these calls per week. This week you're on my list.",
    "Hey {firstName}, clearing my schedule next week for strategy calls. You want one?",
    "{firstName}, limited slots for free strategy sessions. Grabbing one?",
    "I'm selective {firstName}. Your business made the cut. Want to know why?",
    "{firstName}, I don't offer this to everyone. You seem like someone who gets it.",

    // Final push
    "{firstName}, you either want to grow or you don't. I can help with option A.",
    "Last message {firstName} - either this interests you or it doesn't. Let me know.",
    "Hey {firstName}, some people are ready for this, some aren't. Which are you?",
    "{firstName}, I could chase you or you could just call me back. Your move.",
    "Simple question {firstName}: want to win or not? 15 mins. Let's go.",
  ],

  // === NY DIRECT/AGGRESSIVE OPENERS (30) ===
  ny_direct: [
    "{firstName}. Your property. Your call. Want the numbers or not?",
    "Hey {firstName} - {address}. I know what it's worth. Do you? Let's find out.",
    "{firstName}, not gonna dance around it. Your property could be worth a lot. Call me.",
    "Look {firstName}, I do this all day. {address} is interesting. You interested?",
    "{firstName}. 60 seconds. Tell me about {companyName}. I'll tell you how to fix it.",

    "No small talk {firstName}. Your business is leaking money. I'll show you where.",
    "Hey {firstName}, I'm Gianna. I fix businesses. Yours probably needs it.",
    "{firstName}, you're either growing or dying. Which one is {companyName}?",
    "Straight up {firstName} - I can help you make more money. Want to hear how?",
    "{firstName}, I don't BS. You're leaving money on the table. Let's fix that.",

    "Coffee's for closers {firstName}. You closing enough deals? I can help.",
    "Hey {firstName}, winners move fast. You moving fast enough? Quick chat.",
    "{firstName}, in this market, hesitation kills. Let's make sure you're not hesitating.",
    "Time is money {firstName}. You're wasting both without AI. Fix that?",
    "{firstName}, your competitors are already doing this. You falling behind?",

    "Simple math {firstName}: AI = more money, less time. Want to see how?",
    "Hey {firstName}, I don't do maybes. You in or you out?",
    "{firstName}, I've got 15 mins and a lot of value to drop. You ready?",
    "Cut the BS {firstName} - your business needs this. Let me prove it.",
    "{firstName}, either you're serious or you're not. I work with serious people.",

    "This is New York {firstName}. We move fast. You moving?",
    "Hey {firstName}, no fluff. Your property. Your money. Let's talk numbers.",
    "{firstName}, I'm not here to waste your time. Are you wasting mine?",
    "Direct question {firstName}: you want to make more money or not?",
    "{firstName}, I've seen your business. I know what's wrong. Want to know too?",

    "Here's the deal {firstName} - 15 mins, I change how you think about business.",
    "Hey {firstName}, I close deals. I can teach you. Interested?",
    "{firstName}, you're reading this. That means you're curious. Let's talk.",
    "No games {firstName}. You, me, 15 mins, better business. Deal?",
    "{firstName}, fortune favors the bold. Be bold. Call me.",
  ],
};

// ============ REBUTTAL LIBRARY - HUMAN-IN-LOOP FOR FIRST 3 ============
export const REBUTTAL_LIBRARY = {
  // Category: "Not Interested"
  not_interested: {
    human_in_loop: true, // First 3 rebuttals need human approval
    rebuttals: [
      {
        id: "ni_1",
        trigger: ["not interested", "no thanks", "pass", "not for me"],
        responses: [
          "Fair enough {firstName}. Quick though - is that because you've already got this handled, or because you haven't had time to look into it?",
          "Respect that {firstName}. Just curious - what would make you interested? Trying to understand.",
          "Got it. Before I go - what's the one thing about {companyName} that keeps you up at night? Just curious.",
        ],
        learned_best: null, // AI learns which works best
      },
      {
        id: "ni_2",
        trigger: ["still not interested", "no", "stop"],
        responses: [
          "No worries {firstName}. I'll check back in 6 months - market changes fast. Good luck.",
          "Understood. If anything changes, you've got my number. {companyName} has potential.",
          "All good. Just know - the offer stands whenever you're ready. Take care {firstName}.",
        ],
        learned_best: null,
      },
      {
        id: "ni_3",
        trigger: ["stop messaging", "leave me alone", "unsubscribe"],
        responses: [
          "Done. Removing you now. Good luck with everything {firstName}.",
          "Got it, you're off the list. If you change your mind down the road, just text back.",
          "Understood. You won't hear from me again. Best of luck.",
        ],
        learned_best: null,
        action: "add_to_dnc",
      },
    ],
  },

  // Category: "Too Busy"
  too_busy: {
    human_in_loop: true,
    rebuttals: [
      {
        id: "tb_1",
        trigger: ["too busy", "no time", "slammed", "crazy right now"],
        responses: [
          "That's exactly why you need this {firstName}. 15 mins now = 15 hrs/week back. Worth it?",
          "Busy is good - means you've built something. But busy also means you need automation. Quick 15?",
          "I get it {firstName}, you're running hard. What if I told you AI could handle 30% of what's keeping you busy?",
        ],
        learned_best: null,
      },
      {
        id: "tb_2",
        trigger: ["still too busy", "maybe later", "next month"],
        responses: [
          "I'll make it easy - what's ONE time that works? Even early morning or late. Your call.",
          "Here's the thing {firstName} - you'll be just as busy next month. 15 mins to change that?",
          "No pressure. I'll reach back in 2 weeks. In the meantime - think about where your time goes.",
        ],
        learned_best: null,
      },
    ],
  },

  // Category: "Already Have Solution"
  already_have: {
    human_in_loop: true,
    rebuttals: [
      {
        id: "ah_1",
        trigger: [
          "already have",
          "using something",
          "got covered",
          "have a system",
        ],
        responses: [
          "Cool - what are you using? Always curious what's working. Most people are only at 30% of what's possible.",
          "Nice. Is it actually saving you time though? Or just different work? Be honest.",
          "Good. So you're probably at Stage 1. Want to see what Stage 2 and 3 look like? Free peek.",
        ],
        learned_best: null,
      },
      {
        id: "ah_2",
        trigger: ["it works fine", "happy with it", "don't need more"],
        responses: [
          "Works fine vs works great = thousands of dollars. Just saying. Offer's open if you want a comparison.",
          "Happy is good. Ecstatic is better. Let me know if you ever want to level up.",
          "Fair. But 'fine' in business usually means 'leaving money on the table.' Your call {firstName}.",
        ],
        learned_best: null,
      },
    ],
  },

  // Category: "Cost/Money"
  cost_concerns: {
    human_in_loop: true,
    rebuttals: [
      {
        id: "cc_1",
        trigger: ["how much", "cost", "expensive", "money", "afford"],
        responses: [
          "The strategy session is free {firstName}. Zero cost. We figure out if it makes sense, then talk numbers IF you want.",
          "Funny thing - most clients say it pays for itself in week one. But let's not get ahead of ourselves. Free chat first?",
          "I hear you. Here's the thing - it either makes you money or it doesn't. I'll show you the math. Free.",
        ],
        learned_best: null,
      },
      {
        id: "cc_2",
        trigger: ["can't afford", "budget", "tight right now"],
        responses: [
          "Totally get it. That's why the strategy session is free. See what's possible first, decide later.",
          "Budget constraints are real. What if I could show you how to find the budget by saving elsewhere?",
          "I'm not here to sell you something you can't afford. I'm here to show you ROI. Big difference.",
        ],
        learned_best: null,
      },
    ],
  },

  // Category: "Skeptical"
  skeptical: {
    human_in_loop: true,
    rebuttals: [
      {
        id: "sk_1",
        trigger: [
          "sounds too good",
          "scam",
          "bs",
          "don't believe",
          "yeah right",
        ],
        responses: [
          "Healthy skepticism {firstName}. I like it. Here's the thing - I can prove it. 15 mins, no pitch, just proof.",
          "I'd be skeptical too. That's why I show, not tell. Free strategy session = you see exactly how it works.",
          "Fair. You know what convinced my most skeptical client? Results. Let me show you some. No strings.",
        ],
        learned_best: null,
      },
    ],
  },
};

// ============ LEARNING SYSTEM - AGENT IMPROVES FROM FEEDBACK ============
export interface MessagePerformance {
  messageId: string;
  template: string;
  category: string;
  sent: number;
  responses: number;
  positive_responses: number;
  conversions: number; // Led to call booking
  response_rate: number;
  conversion_rate: number;
  last_used: string;
  user_feedback: "good" | "bad" | "neutral" | null;
  user_modified?: string; // User's improved version
}

export interface RebuttalPerformance {
  rebuttalId: string;
  responses_used: number;
  successful_continues: number; // Kept conversation going
  conversions: number;
  success_rate: number;
  best_response_index: number | null; // Which response works best
}

// Learning configuration
export const LEARNING_CONFIG = {
  // After X uses, start preferring high performers
  min_samples_for_learning: 10,

  // Weight for response rate vs conversion rate
  weights: {
    response_rate: 0.3,
    conversion_rate: 0.7,
  },

  // Promote message to "proven" after hitting these thresholds
  promotion_thresholds: {
    min_sends: 20,
    min_response_rate: 0.15, // 15%
    min_conversion_rate: 0.05, // 5%
  },

  // Demote message after poor performance
  demotion_thresholds: {
    min_sends: 20,
    max_response_rate: 0.05, // Below 5%
  },

  // Human-in-loop settings
  human_in_loop: {
    required_for_new_rebuttals: true,
    max_rebuttals_before_auto: 3, // After 3, AI can handle
    approval_timeout_hours: 24, // Auto-proceed after 24h
  },
};

// Function to get best performing openers
export function getBestOpeners(
  category: keyof typeof OPENER_LIBRARY,
  performance: MessagePerformance[],
  count: number = 5,
): string[] {
  const categoryMessages = OPENER_LIBRARY[category];

  // If no performance data, return random selection
  if (!performance.length) {
    return categoryMessages.sort(() => Math.random() - 0.5).slice(0, count);
  }

  // Sort by weighted score
  const scored = categoryMessages.map((msg) => {
    const perf = performance.find((p) => p.template === msg);
    if (!perf || perf.sent < LEARNING_CONFIG.min_samples_for_learning) {
      return { msg, score: 0.5 }; // Default score for unproven messages
    }
    const score =
      perf.response_rate * LEARNING_CONFIG.weights.response_rate +
      perf.conversion_rate * LEARNING_CONFIG.weights.conversion_rate;
    return { msg, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.msg);
}

// Function to record user feedback
export function recordFeedback(data: {
  messageId: string;
  feedback: "good" | "bad" | "neutral";
  userModification?: string;
  resulted_in_response?: boolean;
  resulted_in_booking?: boolean;
}): void {
  // In production: save to database
  console.log("[Learning] Feedback recorded:", data);

  // If user modified the message and it worked, add to library
  if (data.userModification && data.feedback === "good") {
    console.log(
      "[Learning] User improvement added to library:",
      data.userModification,
    );
  }
}

export default OPENER_LIBRARY;
