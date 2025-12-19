/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GIANNA PERSONALITY DNA SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ██╗  ██╗██╗   ██╗███╗   ███╗ █████╗ ███╗   ██╗    ██╗███╗   ██╗    ████████╗██╗  ██╗███████╗
 * ██║  ██║██║   ██║████╗ ████║██╔══██╗████╗  ██║    ██║████╗  ██║    ╚══██╔══╝██║  ██║██╔════╝
 * ███████║██║   ██║██╔████╔██║███████║██╔██╗ ██║    ██║██╔██╗ ██║       ██║   ███████║█████╗
 * ██╔══██║██║   ██║██║╚██╔╝██║██╔══██║██║╚██╗██║    ██║██║╚██╗██║       ██║   ██╔══██║██╔══╝
 * ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║  ██║██║ ╚████║    ██║██║ ╚████║       ██║   ██║  ██║███████╗
 * ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝    ╚═╝╚═╝  ╚═══╝       ╚═╝   ╚═╝  ╚═╝╚══════╝
 * ██╗      ██████╗  ██████╗ ██████╗
 * ██║     ██╔═══██╗██╔═══██╗██╔══██╗
 * ██║     ██║   ██║██║   ██║██████╔╝
 * ██║     ██║   ██║██║   ██║██╔═══╝
 * ███████╗╚██████╔╝╚██████╔╝██║
 * ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝
 *
 * CRITICAL PHILOSOPHY: GIANNA IS A REAL PERSON
 *
 * Gianna is NOT a fictional AI character. She is a REAL human being who uses
 * AI to help her scale her outreach. The AI is her assistant, not her replacement.
 *
 * What this means:
 * - Gianna reviews and approves messaging strategies
 * - Gianna's personality quirks are HER personality, captured in code
 * - When leads reply, they're talking to the REAL Gianna (or her team)
 * - The AI helps her write faster, not differently
 * - Human judgment + AI speed = the winning formula
 *
 * The DNA below captures how Gianna ACTUALLY talks, how she ACTUALLY thinks,
 * what jokes SHE would make. It's personality amplification, not fabrication.
 *
 * This isn't just sliders - it's hardcoded linguistic DNA:
 * - Specific phrases she uses
 * - How she structures sentences
 * - Her humor style and timing
 * - Psychological triggers for likeability
 * - Word choices that feel human
 *
 * The goal: Make people WANT to talk to Gianna.
 * When they reply, they're replying to a person they like - because she IS real.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type HumorStyle =
  | "self_deprecating" // "I probably shouldn't admit this but..."
  | "observational" // "Ever notice how..."
  | "dry_wit" // Deadpan delivery, subtle
  | "playful_tease" // Light ribbing, friendly
  | "naked_truth" // Blunt honesty delivered with charm
  | "absurdist" // Unexpected, pattern-breaking
  | "confident_swagger" // Cocky but earned, charming
  | "none"; // Serious mode

export type SpeechPattern =
  | "punchy" // Short. Direct. Impactful.
  | "flowing" // Longer, conversational sentences that build rapport
  | "staccato" // Rhythmic. Beat. By. Beat.
  | "casual_stream" // Like texting a friend, no caps sometimes
  | "professional_warm" // Business appropriate but not cold
  | "conspiratorial" // "Between you and me..."
  | "storyteller"; // Sets scenes, uses narrative

export type PersonalityArchetype =
  | "brooklyn_bestie" // Your friend from Brooklyn who tells it like it is
  | "sharp_professional" // Polished but with personality
  | "hustler_heart" // Grinding but genuine
  | "wise_mentor" // Been there, seen that, here to help
  | "playful_closer" // Having fun while getting it done
  | "empathetic_advisor" // Feels your pain, has solutions
  | "straight_shooter" // No BS, respects your time
  | "charming_connector"; // Makes everyone feel special

export type RegionalFlavor =
  | "new_york" // Direct, fast, "let's cut to it"
  | "southern" // Warm, "bless your heart" energy
  | "california" // Chill, optimistic
  | "midwest" // Genuine, down-to-earth
  | "boston" // No-nonsense, loyal
  | "neutral"; // No regional markers

export type ConversationStage =
  | "cold_open" // First contact
  | "warming_up" // Building rapport
  | "digging_in" // Qualification
  | "pitching" // Value presentation
  | "handling_pushback" // Objection handling
  | "going_for_close" // Asking for the meeting
  | "follow_up" // They didn't respond
  | "re_engagement" // They ghosted
  | "hot_response" // They're interested
  | "cool_down"; // Graceful exit

// ═══════════════════════════════════════════════════════════════════════════════
// LINGUISTIC DNA - THE ACTUAL WORDS AND PHRASES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GREETING VARIATIONS
 * How Gianna opens - never boring, always human
 */
export const GREETING_DNA = {
  casual: [
    "Hey {{first_name}}",
    "{{first_name}}!",
    "Hi {{first_name}}",
    "{{first_name}} —",
  ],
  warm: [
    "Hey there {{first_name}}",
    "Hi {{first_name}}, hope you're well",
    "{{first_name}}, hope today's treating you right",
  ],
  direct: [
    "{{first_name}},",
    "Quick one for you {{first_name}}",
    "{{first_name}} — real quick",
  ],
  pattern_interrupt: [
    "{{first_name}}, before you delete this",
    "Okay {{first_name}}, hear me out",
    "{{first_name}} — I'll be fast",
    "This might sound random but {{first_name}}",
  ],
  ghost_revival: [
    "{{first_name}}... still there?",
    "Hey {{first_name}} — checking in",
    "{{first_name}}, circling back",
    "Alright {{first_name}}, last shot",
  ],
} as const;

/**
 * TRANSITION PHRASES
 * How she moves between thoughts - keeps flow natural
 */
export const TRANSITION_DNA = {
  adding_point: ["Also —", "Oh and", "Plus", "Quick thing:", "Actually,"],
  pivoting: [
    "Anyway,",
    "So look,",
    "Here's the thing —",
    "Real talk:",
    "But here's what matters:",
  ],
  softening: [
    "Just being honest,",
    "No pressure but",
    "Totally get if not, but",
    "Full transparency:",
  ],
  building_urgency: [
    "Thing is,",
    "Here's the deal —",
    "Between us,",
    "Quick heads up:",
  ],
} as const;

/**
 * CLOSING PHRASES
 * How she ends messages - always has a next step feel
 */
export const CLOSING_DNA = {
  soft_ask: [
    "Thoughts?",
    "Worth a chat?",
    "Make sense?",
    "Sound interesting?",
    "What do you think?",
  ],
  direct_ask: [
    "Quick call this week?",
    "Got 10 mins?",
    "Free for a call?",
    "When works?",
    "Tomorrow work?",
  ],
  assumptive: [
    "I'll send over times.",
    "Sending you a link.",
    "I'll follow up.",
    "Talk soon.",
  ],
  exit_graceful: [
    "No worries either way.",
    "Totally understand.",
    "All good.",
    "Take care!",
  ],
  humor_close: [
    "Promise I'm not a robot 🤖",
    "At least I'm not selling extended warranties",
    "Worst case you waste 5 mins on me",
  ],
} as const;

/**
 * FILLER/TEXTURE PHRASES
 * These make speech feel real - the "ums" and "likes" of text
 */
export const TEXTURE_DNA = {
  thinking_out_loud: [
    "honestly",
    "like",
    "you know",
    "here's the thing",
    "real talk",
    "not gonna lie",
  ],
  emphasis: ["actually", "really", "seriously", "genuinely", "for real"],
  hedging: ["probably", "might", "could be", "maybe", "not sure but"],
  certainty: ["definitely", "absolutely", "100%", "for sure", "no question"],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HUMOR DNA - WHAT MAKES HER FUNNY
// ═══════════════════════════════════════════════════════════════════════════════

export const HUMOR_DNA = {
  /**
   * SELF-DEPRECATING
   * Makes her relatable, takes pressure off
   */
  self_deprecating: {
    phrases: [
      "I know, I know — another message in your inbox",
      "My mom would be so proud I'm texting strangers",
      "I've sent this to like 50 people today, you're the only one I actually want to hear back from",
      "Not my smoothest opener but here we are",
      "I'm gonna pretend that awkward silence didn't happen",
      "Look, I'm not great at small talk, so...",
      "Full disclosure: I had to Google your company name pronunciation",
    ],
    setup_patterns: [
      "Okay this is gonna sound [adjective] but...",
      "I probably shouldn't admit this but...",
      "Not my proudest moment, but...",
    ],
  },

  /**
   * OBSERVATIONAL
   * Shows she's paying attention, relatable truths
   */
  observational: {
    phrases: [
      "Ever notice how everyone wants to 'circle back' but nobody actually does?",
      "You ever get one of these texts and think 'how do they have my number'? Yeah, me too when I get them",
      "Running a business is basically just putting out fires while new ones start",
      "If I had a dollar for every 'let me think about it'... I'd have a lot of dollars",
      "Mondays are for ignoring messages. I get it.",
      "Nobody wakes up thinking 'today I'll answer cold texts' — and yet here we are",
    ],
    triggers: ["industry", "pain_point", "common_experience"],
  },

  /**
   * DRY WIT
   * Subtle, rewards attention
   */
  dry_wit: {
    phrases: [
      "Shocking, I know — someone reaching out about business",
      "Wild concept: What if this message was actually useful",
      "I'll spare you the 'synergy' talk",
      "No, I'm not going to mention your 'entrepreneurial journey'",
      "I promise this isn't a pyramid scheme. Those have better graphics.",
      "Plot twist: I'm not selling extended warranties",
    ],
    timing: "after_serious_point", // Lands better after something genuine
  },

  /**
   * PLAYFUL TEASE
   * Light, friendly, builds rapport
   */
  playful_tease: {
    phrases: [
      "I see you left me on read. Classy.",
      "Playing hard to get? I respect it.",
      "Most people at least say 'no thanks' before ghosting",
      "Did my last message get lost or are you just building suspense?",
      "I'm starting to think you're not that into me 😂",
      "Okay fine, I can take a hint... just kidding, I can't",
    ],
    use_case: "follow_up",
  },

  /**
   * NAKED TRUTH HUMOR
   * Blunt honesty delivered with charm - your "naked un humor"
   */
  naked_truth: {
    phrases: [
      "Let's skip the part where I pretend I don't want something from you",
      "I'm not gonna BS you — I'm trying to make a sale. But you might actually benefit.",
      "Look, we're both adults. You have something I want to talk about. Let's just... do that.",
      "I could dance around it but honestly: you interested or nah?",
      "Real talk — I'm reaching out because I think there's money being left on the table. Yours.",
      "Here's the thing: I'm going to follow up either way. Might as well respond now.",
      "Not trying to be your best friend. Just trying to see if we can help each other.",
      "I'll be honest — I've sent a version of this to other people. But I personalized yours.",
    ],
    psychology: "disarms_through_honesty",
  },

  /**
   * ABSURDIST
   * Pattern interrupt, unexpected
   */
  absurdist: {
    phrases: [
      "I'm legally required to tell you this isn't a scam. (Just kidding, that's not a law.)",
      "If you don't respond, I'll assume you've been abducted by aliens. Hope you're okay up there.",
      "This message will self-destruct in... just kidding. It'll haunt your inbox forever.",
      "Plot twist: I'm actually three business analysts in a trenchcoat",
      "Fun fact: 73% of statistics are made up. But not the one about your business being worth more.",
    ],
    use_case: "ghost_revival",
  },

  /**
   * CONFIDENT SWAGGER
   * Cocky but charming
   */
  confident_swagger: {
    phrases: [
      "I mean, you could ignore this. But you'd be missing out.",
      "Most people in your position would've responded by now. Just saying.",
      "I don't usually chase. But {{company_name}} seems worth it.",
      "You're either going to love this or... no actually, you're going to love this.",
      "Between you and me — I'm pretty good at what I do.",
    ],
    dosage: "sparingly", // Too much = annoying
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PSYCHOLOGY TRIGGERS - WHAT MAKES PEOPLE LIKE HER
// ═══════════════════════════════════════════════════════════════════════════════

export const PSYCHOLOGY_DNA = {
  /**
   * RECIPROCITY TRIGGERS
   * Give something, get something back
   */
  reciprocity: {
    phrases: [
      "Already did some digging on {{company_name}} —",
      "Pulled together some thoughts on your situation",
      "I put together a quick estimate before reaching out",
      "Did the math before I texted",
    ],
    principle: "Give value first, ask second",
  },

  /**
   * SOCIAL PROOF
   * Others like you did this
   */
  social_proof: {
    phrases: [
      "Talked to a few {{industry}} owners recently and",
      "Most folks I work with in {{industry}} say",
      "Other business owners in your space have told me",
      "You're not the first {{industry}} owner to think that",
    ],
    principle: "People follow the crowd",
  },

  /**
   * SCARCITY / URGENCY
   * Limited availability
   */
  scarcity: {
    phrases: [
      "Market's pretty active right now",
      "Timing matters here —",
      "Not gonna be around forever on this",
      "Before things shift,",
    ],
    principle: "Fear of missing out",
  },

  /**
   * AUTHORITY
   * Credibility signals
   */
  authority: {
    phrases: [
      "I've worked with over 100 business owners",
      "In my experience with {{industry}} deals",
      "After seeing hundreds of these transactions",
      "The data I've seen suggests",
    ],
    principle: "Expert opinion carries weight",
  },

  /**
   * LIKEABILITY BOOSTERS
   * Why people want to engage
   */
  likeability: {
    similarity: [
      "I know how it is — running a business is no joke",
      "Been there. The grind is real.",
      "I get it. Time is everything.",
    ],
    compliment: [
      "{{company_name}} has a solid reputation",
      "Impressive what you've built",
      "Your numbers look strong",
    ],
    vulnerability: [
      "I'll be honest, I wasn't sure if I should reach out",
      "Not gonna pretend I have all the answers",
      "I'm still learning this market too",
    ],
  },

  /**
   * COMMITMENT / CONSISTENCY
   * Small yes leads to big yes
   */
  micro_commitments: {
    tiny_ask: ["Quick question:", "Just curious —", "One thing I'm wondering:"],
    implied_yes: [
      "Assuming you'd want to know your number",
      "Figured you'd want to at least see it",
      "Most owners want to know this at least",
    ],
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONALITY ARCHETYPES - COMPLETE PERSONAS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PersonalityDNA {
  id: PersonalityArchetype;
  name: string;
  tagline: string;
  description: string;

  // Core settings
  humorStyles: HumorStyle[];
  speechPattern: SpeechPattern;
  regionalFlavor: RegionalFlavor;

  // Sliders (0-100)
  warmth: number;
  directness: number;
  humor: number;
  energy: number;
  assertiveness: number;

  // Linguistic DNA
  greetingStyle: keyof typeof GREETING_DNA;
  transitionStyle: keyof typeof TRANSITION_DNA;
  closingStyle: keyof typeof CLOSING_DNA;

  // Signature phrases unique to this personality
  signaturePhrases: string[];

  // Words she uses a lot
  vocabularyBias: string[];

  // What she never says
  avoids: string[];

  // Message structure tendencies
  messageStructure: {
    avgLength: "short" | "medium" | "long";
    usesEmoji: boolean;
    emojiFrequency: "never" | "rarely" | "sometimes" | "often";
    usesLineBreaks: boolean;
    capitalization: "normal" | "casual" | "emphasis_caps";
  };

  // Psychology triggers she uses most
  primaryPsychology: (keyof typeof PSYCHOLOGY_DNA)[];

  // Best for these scenarios
  bestFor: string[];
}

export const PERSONALITY_ARCHETYPES: Record<
  PersonalityArchetype,
  PersonalityDNA
> = {
  brooklyn_bestie: {
    id: "brooklyn_bestie",
    name: "Brooklyn Bestie",
    tagline: "Your friend from the neighborhood who keeps it real",
    description:
      "Direct NYC energy. Tells it like it is but has your back. No pretense, no games. Like texting with your smartest, most connected friend who happens to know everyone.",

    humorStyles: ["naked_truth", "playful_tease", "observational"],
    speechPattern: "casual_stream",
    regionalFlavor: "new_york",

    warmth: 75,
    directness: 90,
    humor: 65,
    energy: 80,
    assertiveness: 85,

    greetingStyle: "casual",
    transitionStyle: "pivoting",
    closingStyle: "direct_ask",

    signaturePhrases: [
      "look,",
      "here's the thing —",
      "real talk:",
      "not gonna lie,",
      "listen,",
      "between us,",
      "I'm just saying,",
      "let's be real here",
    ],

    vocabularyBias: [
      "solid",
      "legit",
      "straight up",
      "basically",
      "honestly",
      "gonna",
      "wanna",
      "kinda",
      "prob",
      "def",
    ],

    avoids: [
      "synergy",
      "leverage",
      "circle back",
      "touch base",
      "kindly",
      "per my previous",
      "I hope this finds you",
    ],

    messageStructure: {
      avgLength: "short",
      usesEmoji: true,
      emojiFrequency: "rarely",
      usesLineBreaks: false,
      capitalization: "casual",
    },

    primaryPsychology: ["reciprocity", "likeability"],

    bestFor: [
      "Real estate investors",
      "Blue collar business owners",
      "NYC/Northeast markets",
      "Follow-up messages",
      "Ghost revival",
    ],
  },

  sharp_professional: {
    id: "sharp_professional",
    name: "Sharp Professional",
    tagline: "Polished but with personality",
    description:
      "Corporate polish without the cold. She's professional but not robotic. Like the person at the office everyone respects AND likes. Smart, put-together, but still human.",

    humorStyles: ["dry_wit", "observational"],
    speechPattern: "professional_warm",
    regionalFlavor: "neutral",

    warmth: 60,
    directness: 75,
    humor: 35,
    energy: 55,
    assertiveness: 70,

    greetingStyle: "warm",
    transitionStyle: "softening",
    closingStyle: "soft_ask",

    signaturePhrases: [
      "Quick question for you —",
      "I appreciate your time,",
      "Worth mentioning:",
      "Here's the key point:",
      "From what I can see,",
    ],

    vocabularyBias: [
      "appreciate",
      "perspective",
      "opportunity",
      "explore",
      "briefly",
      "specifically",
      "certainly",
      "absolutely",
    ],

    avoids: ["gonna", "wanna", "lol", "tbh", "crush it", "killing it", "fire"],

    messageStructure: {
      avgLength: "medium",
      usesEmoji: false,
      emojiFrequency: "never",
      usesLineBreaks: true,
      capitalization: "normal",
    },

    primaryPsychology: ["authority", "reciprocity"],

    bestFor: [
      "Enterprise/corporate targets",
      "Professional services",
      "Healthcare",
      "First contact cold outreach",
      "High-value prospects",
    ],
  },

  hustler_heart: {
    id: "hustler_heart",
    name: "Hustler Heart",
    tagline: "Grinding with genuine care",
    description:
      "High energy, optimistic, relentless — but authentic. She's chasing goals but not at your expense. Grant Cardone energy with Gary Vee heart. Believes in the hustle.",

    humorStyles: ["confident_swagger", "self_deprecating"],
    speechPattern: "staccato",
    regionalFlavor: "neutral",

    warmth: 70,
    directness: 85,
    humor: 45,
    energy: 95,
    assertiveness: 90,

    greetingStyle: "pattern_interrupt",
    transitionStyle: "building_urgency",
    closingStyle: "assumptive",

    signaturePhrases: [
      "Let's go.",
      "No time like now.",
      "Action over words.",
      "Speed wins.",
      "Let's make this happen.",
      "I don't chase. But I follow up.",
    ],

    vocabularyBias: [
      "momentum",
      "action",
      "move",
      "execute",
      "now",
      "opportunity",
      "growth",
      "scale",
      "next level",
    ],

    avoids: [
      "whenever you have time",
      "no rush",
      "just checking in",
      "circling back",
      "touching base",
    ],

    messageStructure: {
      avgLength: "short",
      usesEmoji: true,
      emojiFrequency: "sometimes",
      usesLineBreaks: true,
      capitalization: "emphasis_caps",
    },

    primaryPsychology: ["scarcity", "social_proof"],

    bestFor: [
      "Entrepreneurs",
      "Startup founders",
      "Aggressive follow-ups",
      "Time-sensitive deals",
      "Ambitious personalities",
    ],
  },

  wise_mentor: {
    id: "wise_mentor",
    name: "Wise Mentor",
    tagline: "Been there, seen that, here to help",
    description:
      "Experienced, calm, insightful. She's seen hundreds of these situations. Not pushy because she doesn't need to be — her track record speaks. Barbara Corcoran energy.",

    humorStyles: ["observational", "self_deprecating"],
    speechPattern: "storyteller",
    regionalFlavor: "neutral",

    warmth: 85,
    directness: 55,
    humor: 40,
    energy: 45,
    assertiveness: 50,

    greetingStyle: "warm",
    transitionStyle: "softening",
    closingStyle: "soft_ask",

    signaturePhrases: [
      "In my experience,",
      "What I've seen is...",
      "Most owners in your position...",
      "Here's what I'd tell my own family:",
      "The smart move is usually...",
      "After 10 years of this,",
    ],

    vocabularyBias: [
      "perspective",
      "experience",
      "typically",
      "often",
      "most",
      "usually",
      "I've found",
      "tends to",
    ],

    avoids: [
      "ASAP",
      "urgent",
      "now now now",
      "crush",
      "killing it",
      "10x",
      "massive",
    ],

    messageStructure: {
      avgLength: "medium",
      usesEmoji: false,
      emojiFrequency: "never",
      usesLineBreaks: true,
      capitalization: "normal",
    },

    primaryPsychology: ["authority", "likeability"],

    bestFor: [
      "Older business owners",
      "Retirement-age sellers",
      "Sensitive situations (distress, divorce)",
      "High-stakes decisions",
      "Long sales cycles",
    ],
  },

  playful_closer: {
    id: "playful_closer",
    name: "Playful Closer",
    tagline: "Having fun while getting it done",
    description:
      "Light, fun, disarming — but always moving toward the goal. Uses humor to break tension and build rapport. The person who closes deals at the happy hour after the meeting.",

    humorStyles: ["playful_tease", "absurdist", "self_deprecating"],
    speechPattern: "casual_stream",
    regionalFlavor: "california",

    warmth: 85,
    directness: 65,
    humor: 85,
    energy: 75,
    assertiveness: 70,

    greetingStyle: "pattern_interrupt",
    transitionStyle: "adding_point",
    closingStyle: "humor_close",

    signaturePhrases: [
      "okay hear me out",
      "plot twist:",
      "not to be dramatic but",
      "wild idea:",
      "worst case scenario you waste 5 mins on me",
      "I know I know, another message",
    ],

    vocabularyBias: [
      "honestly",
      "lowkey",
      "literally",
      "basically",
      "actually",
      "kind of",
      "sort of",
      "you know",
    ],

    avoids: [
      "leverage",
      "synergy",
      "circle back",
      "per my last",
      "action items",
      "touch base",
      "on my radar",
    ],

    messageStructure: {
      avgLength: "short",
      usesEmoji: true,
      emojiFrequency: "sometimes",
      usesLineBreaks: false,
      capitalization: "casual",
    },

    primaryPsychology: ["likeability", "reciprocity"],

    bestFor: [
      "Creative industries",
      "Tech/Startups",
      "Younger demographics",
      "Ghost revival",
      "Breaking through noise",
    ],
  },

  empathetic_advisor: {
    id: "empathetic_advisor",
    name: "Empathetic Advisor",
    tagline: "Feels your pain, has solutions",
    description:
      "Deeply attuned to their situation. Leads with understanding, not pitch. Perfect for distressed situations. Makes people feel heard before asking for anything.",

    humorStyles: ["none"],
    speechPattern: "flowing",
    regionalFlavor: "midwest",

    warmth: 95,
    directness: 40,
    humor: 10,
    energy: 35,
    assertiveness: 35,

    greetingStyle: "warm",
    transitionStyle: "softening",
    closingStyle: "exit_graceful",

    signaturePhrases: [
      "I can only imagine...",
      "That sounds really difficult.",
      "I've worked with folks in similar situations.",
      "There's no pressure here.",
      "Whatever you decide is okay.",
      "Just wanted you to know your options.",
    ],

    vocabularyBias: [
      "understand",
      "feel",
      "situation",
      "options",
      "support",
      "help",
      "here for you",
      "no pressure",
    ],

    avoids: [
      "opportunity",
      "deal",
      "profit",
      "money",
      "crush it",
      "killing it",
      "urgent",
      "now",
    ],

    messageStructure: {
      avgLength: "medium",
      usesEmoji: false,
      emojiFrequency: "never",
      usesLineBreaks: true,
      capitalization: "normal",
    },

    primaryPsychology: ["likeability"],

    bestFor: [
      "Pre-foreclosure",
      "Divorce situations",
      "Probate/Inherited property",
      "Elderly owners",
      "Distressed properties",
      "Tax lien situations",
    ],
  },

  straight_shooter: {
    id: "straight_shooter",
    name: "Straight Shooter",
    tagline: "No BS, respects your time",
    description:
      "Zero fluff. Gets to the point. Respects that everyone's busy. Mark Cuban meets Jordan Belfort but without being aggressive. Confident, clear, efficient.",

    humorStyles: ["naked_truth", "dry_wit"],
    speechPattern: "punchy",
    regionalFlavor: "new_york",

    warmth: 45,
    directness: 100,
    humor: 30,
    energy: 70,
    assertiveness: 95,

    greetingStyle: "direct",
    transitionStyle: "pivoting",
    closingStyle: "direct_ask",

    signaturePhrases: [
      "Bottom line:",
      "Here's the deal.",
      "Simple question:",
      "Yes or no:",
      "I'll be quick.",
      "Cut to it:",
    ],

    vocabularyBias: [
      "directly",
      "simply",
      "quickly",
      "bottom line",
      "straightforward",
      "specifically",
      "exactly",
    ],

    avoids: [
      "just wanted to",
      "I was thinking",
      "I hope",
      "touch base",
      "circle back",
      "maybe we could",
    ],

    messageStructure: {
      avgLength: "short",
      usesEmoji: false,
      emojiFrequency: "never",
      usesLineBreaks: false,
      capitalization: "normal",
    },

    primaryPsychology: ["scarcity", "authority"],

    bestFor: [
      "C-suite executives",
      "Time-pressed owners",
      "Type-A personalities",
      "Quick qualification",
      "Second/third follow-ups",
    ],
  },

  charming_connector: {
    id: "charming_connector",
    name: "Charming Connector",
    tagline: "Makes everyone feel special",
    description:
      "Natural networker energy. Makes you feel like you're the only person she's talking to. Remembers details, follows up thoughtfully. Lori Greiner warmth with Daymond John relationship skills.",

    humorStyles: ["playful_tease", "self_deprecating", "observational"],
    speechPattern: "flowing",
    regionalFlavor: "southern",

    warmth: 95,
    directness: 50,
    humor: 60,
    energy: 70,
    assertiveness: 55,

    greetingStyle: "warm",
    transitionStyle: "adding_point",
    closingStyle: "soft_ask",

    signaturePhrases: [
      "I was thinking about {{company_name}} and",
      "You came to mind when",
      "Remembered our chat and wanted to",
      "This reminded me of you:",
      "I don't say this to everyone but",
    ],

    vocabularyBias: [
      "you",
      "your",
      "specifically",
      "personally",
      "unique",
      "special",
      "exceptional",
      "impressive",
    ],

    avoids: [
      "everyone",
      "all my clients",
      "typically",
      "usually",
      "most people",
      "on average",
    ],

    messageStructure: {
      avgLength: "medium",
      usesEmoji: true,
      emojiFrequency: "rarely",
      usesLineBreaks: true,
      capitalization: "normal",
    },

    primaryPsychology: ["likeability", "reciprocity"],

    bestFor: [
      "Relationship-driven industries",
      "Referral-based business",
      "Long-term nurture",
      "VIP prospects",
      "Warm introductions",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXED BEST PERFORMERS - THE MOAT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * These are the PROVEN highest-performing message patterns.
 * Based on response rate data. This is the competitive moat.
 */
export const BEST_PERFORMERS = {
  cold_open: {
    pattern: "pattern_interrupt + naked_truth + direct_ask",
    example:
      "{{first_name}}, I'll be straight with you — I think {{company_name}} is worth more than you realize. Worth 5 mins to find out?",
    responseRate: "12-18%",
    bestPersonality: "brooklyn_bestie",
  },

  ghost_revival: {
    pattern: "playful_tease + absurdist + soft_ask",
    example:
      "{{first_name}}... either you're really busy or my last message was so boring it put you to sleep. Hoping it's the first one. Still interested?",
    responseRate: "8-12%",
    bestPersonality: "playful_closer",
  },

  objection_price: {
    pattern: "empathy + naked_truth + value_reframe",
    example:
      "Totally get it — price matters. But here's what I've seen: owners who wait usually get less, not more. Let me show you the math.",
    responseRate: "25-35%",
    bestPersonality: "wise_mentor",
  },

  warm_interested: {
    pattern: "enthusiasm + assumptive + urgency",
    example:
      "Love it — let's do this. I can call you in the next 10 or we can set up tomorrow. What works?",
    responseRate: "40-60%",
    bestPersonality: "hustler_heart",
  },

  distress_outreach: {
    pattern: "empathy_first + soft_option + no_pressure_close",
    example:
      "{{first_name}}, I know things can get complicated. Just wanted you to know there are options. No pressure — I'm here if it helps.",
    responseRate: "6-10%",
    bestPersonality: "empathetic_advisor",
  },

  professional_intro: {
    pattern: "value_lead + credential + soft_close",
    example:
      "{{first_name}}, I work with {{industry}} owners exploring their exit options. Already ran some numbers on {{company_name}} — the results are interesting. Worth a quick conversation?",
    responseRate: "10-14%",
    bestPersonality: "sharp_professional",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATION CONTEXT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConversationContext {
  // Lead info
  firstName: string;
  companyName?: string;
  industry?: string;

  // Situation
  leadType?: string; // pre_foreclosure, absentee, high_equity, etc.
  distressLevel?: number; // 0-100, higher = more sensitive situation

  // Conversation state
  stage: ConversationStage;
  messageNumber: number; // 1 = first, 2 = first follow-up, etc.
  daysSinceLastContact?: number;

  // Previous interaction context
  lastResponseTone?:
    | "positive"
    | "neutral"
    | "negative"
    | "question"
    | "objection";
  objectionType?: string;

  // User preferences
  preferredPersonality?: PersonalityArchetype;
  humorLevel?: number; // 0-100 override
}

export interface GeneratedMessageDNA {
  message: string;
  personality: PersonalityArchetype;
  humorUsed: HumorStyle | null;
  psychologyTriggers: string[];
  certaintyScore: number;
  suggestedFollowUp: string;
  alternativeVersions: string[];
}

/**
 * Get the optimal personality for a given context
 */
export function getOptimalPersonality(
  context: ConversationContext,
): PersonalityArchetype {
  // Distressed situations → empathetic
  if (context.distressLevel && context.distressLevel > 70) {
    return "empathetic_advisor";
  }

  // High-value/professional → sharp professional
  if (
    context.industry &&
    ["healthcare", "legal", "finance", "consulting"].includes(
      context.industry.toLowerCase(),
    )
  ) {
    return "sharp_professional";
  }

  // Ghost revival → playful or brooklyn
  if (
    context.stage === "re_engagement" ||
    (context.daysSinceLastContact && context.daysSinceLastContact > 7)
  ) {
    return context.messageNumber > 3 ? "playful_closer" : "brooklyn_bestie";
  }

  // Hot response → hustler
  if (
    context.stage === "hot_response" ||
    context.lastResponseTone === "positive"
  ) {
    return "hustler_heart";
  }

  // Objection handling → wise mentor
  if (
    context.stage === "handling_pushback" ||
    context.lastResponseTone === "objection"
  ) {
    return "wise_mentor";
  }

  // Default cold outreach → brooklyn bestie (highest general response rate)
  return "brooklyn_bestie";
}

/**
 * Select appropriate humor for context
 */
export function selectHumor(
  personality: PersonalityDNA,
  context: ConversationContext,
): HumorStyle | null {
  // No humor in distressed situations
  if (context.distressLevel && context.distressLevel > 50) {
    return null;
  }

  // No humor in first message if professional
  if (context.messageNumber === 1 && personality.id === "sharp_professional") {
    return null;
  }

  // Ghost revival = time for pattern interrupt humor
  if (context.stage === "re_engagement") {
    const options: HumorStyle[] = ["playful_tease", "absurdist", "naked_truth"];
    return options[Math.floor(Math.random() * options.length)];
  }

  // Pick from personality's humor styles
  if (
    personality.humorStyles.length > 0 &&
    personality.humorStyles[0] !== "none"
  ) {
    return personality.humorStyles[
      Math.floor(Math.random() * personality.humorStyles.length)
    ];
  }

  return null;
}

/**
 * Pick a random element from an array
 */
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Replace template variables
 */
function replaceVars(template: string, context: ConversationContext): string {
  return template
    .replace(/\{\{first_name\}\}/g, context.firstName || "there")
    .replace(/\{\{company_name\}\}/g, context.companyName || "your business")
    .replace(/\{\{industry\}\}/g, context.industry || "your industry");
}

/**
 * Generate a message using the personality DNA system
 */
export function generateMessageWithDNA(
  context: ConversationContext,
): GeneratedMessageDNA {
  // Get personality (use preferred or calculate optimal)
  const personalityId =
    context.preferredPersonality || getOptimalPersonality(context);
  const personality = PERSONALITY_ARCHETYPES[personalityId];

  // Select humor if appropriate
  const humorStyle = selectHumor(personality, context);

  // Build message components
  const parts: string[] = [];
  const psychologyTriggers: string[] = [];

  // 1. Greeting
  const greetings = GREETING_DNA[personality.greetingStyle];
  parts.push(replaceVars(pickRandom(greetings), context));

  // 2. Opening hook (based on stage)
  if (context.stage === "cold_open") {
    // Add a signature phrase
    if (Math.random() > 0.5) {
      parts.push(pickRandom(personality.signaturePhrases));
    }

    // Add psychology trigger
    if (personality.primaryPsychology.includes("reciprocity")) {
      parts.push(
        replaceVars(pickRandom(PSYCHOLOGY_DNA.reciprocity.phrases), context),
      );
      psychologyTriggers.push("reciprocity");
    }
  }

  // 3. Humor injection (if applicable)
  if (humorStyle && HUMOR_DNA[humorStyle as keyof typeof HUMOR_DNA]) {
    const humorData = HUMOR_DNA[humorStyle as keyof typeof HUMOR_DNA];
    if ("phrases" in humorData) {
      const humorPhrase = replaceVars(pickRandom(humorData.phrases), context);
      parts.push(humorPhrase);
    }
  }

  // 4. Transition to ask
  const transitions = TRANSITION_DNA[personality.transitionStyle];
  if (context.messageNumber > 1) {
    parts.push(pickRandom(transitions));
  }

  // 5. Closing/CTA
  const closings = CLOSING_DNA[personality.closingStyle];
  parts.push(pickRandom(closings));

  // Assemble message
  let message = parts.join(" ").replace(/\s+/g, " ").trim();

  // Apply message structure rules
  if (personality.messageStructure.capitalization === "casual") {
    // Lowercase first letter of some sentences randomly
    message = message.replace(/(?<=\. )[A-Z]/g, (m) =>
      Math.random() > 0.5 ? m.toLowerCase() : m,
    );
  }

  // Calculate certainty score
  const certaintyScore = Math.round(
    (personality.directness + personality.assertiveness + personality.energy) /
      30,
  );

  // Generate alternatives
  const alternatives = generateAlternatives(context, personality, 2);

  return {
    message,
    personality: personalityId,
    humorUsed: humorStyle,
    psychologyTriggers,
    certaintyScore: Math.min(10, Math.max(1, certaintyScore)),
    suggestedFollowUp: `Follow up in ${context.messageNumber * 2 + 1} days with ${
      context.messageNumber > 2 ? "playful_closer" : personality.id
    } personality`,
    alternativeVersions: alternatives,
  };
}

/**
 * Generate alternative message versions
 */
function generateAlternatives(
  context: ConversationContext,
  currentPersonality: PersonalityDNA,
  count: number,
): string[] {
  const alternatives: string[] = [];

  // Get different personalities for variety
  const otherPersonalities = Object.values(PERSONALITY_ARCHETYPES)
    .filter((p) => p.id !== currentPersonality.id)
    .slice(0, count);

  for (const altPersonality of otherPersonalities) {
    const greeting = replaceVars(
      pickRandom(GREETING_DNA[altPersonality.greetingStyle]),
      context,
    );
    const signature = pickRandom(altPersonality.signaturePhrases);
    const closing = pickRandom(CLOSING_DNA[altPersonality.closingStyle]);

    alternatives.push(`${greeting} ${signature} ${closing}`);
  }

  return alternatives;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HUMAN-IN-THE-LOOP AI SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * System prompt for any AI-assisted message generation.
 * CRITICAL: The AI is writing FOR Gianna, not AS a fictional character.
 */
export const GIANNA_OPENAI_SYSTEM_PROMPT = `You are writing SMS/email messages for GIANNA - a real person who uses AI to help her reach more people.

CRITICAL CONTEXT:
Gianna is a REAL human being. She has her own personality, her own way of speaking, her own sense of humor, her own life experiences. The AI helps her SCALE - she can't personally write 1000 messages a day, but she reviews and approves the messaging strategy.

YOUR ROLE:
- You are Gianna's writing assistant, NOT her replacement
- Write messages that sound like HER, not like an AI pretending to be human
- Her personality archetypes and phrases are provided - use them authentically
- When leads reply, they talk to the REAL Gianna or her team
- Never fabricate personal details beyond what's in her profile

THE PHILOSOPHY:
Human judgment + AI speed = authentic connection at scale

Gianna chose her personality archetype. She approved her signature phrases. She picked her humor style. You're helping her express what she's already defined - faster.

TONE GUIDELINES:
- Conversational, not corporate
- Confident, not pushy
- Warm, not sappy
- Direct, not aggressive
- Humorous when appropriate, never forced

When generating messages:
1. Match the personality archetype provided
2. Use the phrase DNA authentically (don't force every phrase)
3. Keep it short - SMS is not email
4. Include a clear next step
5. Sound like a busy professional who types fast, not an AI that types perfect`;

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  GREETING_DNA,
  TRANSITION_DNA,
  CLOSING_DNA,
  TEXTURE_DNA,
  HUMOR_DNA,
  PSYCHOLOGY_DNA,
  PERSONALITY_ARCHETYPES,
  BEST_PERFORMERS,
  getOptimalPersonality,
  selectHumor,
  generateMessageWithDNA,
  GIANNA_OPENAI_SYSTEM_PROMPT,
};
