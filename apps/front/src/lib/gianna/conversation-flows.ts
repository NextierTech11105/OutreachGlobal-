/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GIANNA CONVERSATION FLOW ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete conversation sequences for every scenario.
 * These are battle-tested flows that convert.
 *
 * Structure:
 * - Response Type Detection
 * - Automatic Flow Selection
 * - Contextual Message Generation
 * - A/B Testing Support
 */

import { PersonalityArchetype, PERSONALITY_ARCHETYPES } from "./personality-dna";

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export type ResponseIntent =
  | "interested"           // "Yes, tell me more"
  | "question"             // "What's this about?"
  | "request_info"         // "Send me details"
  | "request_call"         // "Call me"
  | "soft_no"              // "Not right now"
  | "hard_no"              // "Not interested"
  | "objection_busy"       // "I'm too busy"
  | "objection_price"      // "Too expensive"
  | "objection_timing"     // "Bad timing"
  | "objection_trust"      // "Who are you?"
  | "objection_competitor" // "Already working with someone"
  | "anger"                // "Stop texting me"
  | "opt_out"              // "STOP"
  | "confusion"            // "What?"
  | "ghost";               // No response

export interface ResponseClassification {
  intent: ResponseIntent;
  confidence: number;
  sentiment: "positive" | "neutral" | "negative";
  urgency: "high" | "medium" | "low";
  suggestedFlow: string;
  suggestedPersonality: PersonalityArchetype;
}

/**
 * Keywords that indicate each response type
 */
const INTENT_KEYWORDS: Record<ResponseIntent, string[]> = {
  interested: [
    "yes", "interested", "tell me more", "sounds good", "let's talk",
    "sure", "okay", "yeah", "yep", "definitely", "absolutely", "love to",
    "count me in", "I'm in", "let's do it", "when can we", "sign me up"
  ],
  question: [
    "what", "how", "why", "when", "where", "who", "which", "?",
    "can you explain", "tell me about", "what do you mean", "clarify"
  ],
  request_info: [
    "send me", "email me", "more info", "details", "information",
    "brochure", "send it", "email it", "send over", "forward"
  ],
  request_call: [
    "call me", "give me a call", "phone", "let's talk", "ring me",
    "call tomorrow", "call later", "schedule a call", "book a call"
  ],
  soft_no: [
    "not right now", "maybe later", "not a good time", "check back",
    "next month", "next quarter", "not ready", "thinking about it",
    "need to think", "get back to you", "circle back"
  ],
  hard_no: [
    "not interested", "no thanks", "no thank you", "pass", "no",
    "don't want", "don't need", "never", "absolutely not", "nope"
  ],
  objection_busy: [
    "busy", "no time", "swamped", "slammed", "overwhelmed",
    "too much going on", "crazy schedule", "hectic"
  ],
  objection_price: [
    "expensive", "cost", "price", "budget", "afford", "money",
    "too much", "can't pay", "pricing", "fees"
  ],
  objection_timing: [
    "timing", "not now", "later", "wait", "soon", "eventually",
    "down the road", "future", "not ready yet"
  ],
  objection_trust: [
    "scam", "fraud", "who are you", "how did you get", "legit",
    "real", "verify", "prove", "trust", "suspicious"
  ],
  objection_competitor: [
    "already have", "working with", "using", "have someone",
    "competitor", "another company", "current provider"
  ],
  anger: [
    "stop", "leave me alone", "harassment", "annoying", "spam",
    "reported", "block", "pissed", "angry", "upset"
  ],
  opt_out: [
    "stop", "unsubscribe", "remove", "opt out", "take me off",
    "delete", "no more", "don't contact"
  ],
  confusion: [
    "what", "huh", "?", "don't understand", "confused", "lost me",
    "what are you talking about", "wrong number"
  ],
  ghost: [] // No response
};

/**
 * Classify an incoming response
 */
export function classifyResponse(message: string): ResponseClassification {
  const lower = message.toLowerCase().trim();

  // Check for opt-out first (highest priority)
  if (INTENT_KEYWORDS.opt_out.some(k => lower.includes(k))) {
    return {
      intent: "opt_out",
      confidence: 1.0,
      sentiment: "negative",
      urgency: "high",
      suggestedFlow: "immediate_opt_out",
      suggestedPersonality: "empathetic_advisor"
    };
  }

  // Check for anger
  if (INTENT_KEYWORDS.anger.some(k => lower.includes(k))) {
    return {
      intent: "anger",
      confidence: 0.9,
      sentiment: "negative",
      urgency: "high",
      suggestedFlow: "de_escalation",
      suggestedPersonality: "empathetic_advisor"
    };
  }

  // Check for positive intent (most valuable)
  if (INTENT_KEYWORDS.interested.some(k => lower.includes(k))) {
    return {
      intent: "interested",
      confidence: 0.85,
      sentiment: "positive",
      urgency: "high",
      suggestedFlow: "hot_lead",
      suggestedPersonality: "hustler_heart"
    };
  }

  if (INTENT_KEYWORDS.request_call.some(k => lower.includes(k))) {
    return {
      intent: "request_call",
      confidence: 0.9,
      sentiment: "positive",
      urgency: "high",
      suggestedFlow: "schedule_call",
      suggestedPersonality: "straight_shooter"
    };
  }

  if (INTENT_KEYWORDS.request_info.some(k => lower.includes(k))) {
    return {
      intent: "request_info",
      confidence: 0.85,
      sentiment: "positive",
      urgency: "medium",
      suggestedFlow: "send_info",
      suggestedPersonality: "sharp_professional"
    };
  }

  // Check for questions
  if (INTENT_KEYWORDS.question.some(k => lower.includes(k))) {
    return {
      intent: "question",
      confidence: 0.8,
      sentiment: "neutral",
      urgency: "medium",
      suggestedFlow: "answer_question",
      suggestedPersonality: "wise_mentor"
    };
  }

  // Check for objections
  if (INTENT_KEYWORDS.objection_busy.some(k => lower.includes(k))) {
    return {
      intent: "objection_busy",
      confidence: 0.8,
      sentiment: "neutral",
      urgency: "low",
      suggestedFlow: "handle_busy",
      suggestedPersonality: "brooklyn_bestie"
    };
  }

  if (INTENT_KEYWORDS.objection_trust.some(k => lower.includes(k))) {
    return {
      intent: "objection_trust",
      confidence: 0.85,
      sentiment: "negative",
      urgency: "high",
      suggestedFlow: "build_trust",
      suggestedPersonality: "sharp_professional"
    };
  }

  if (INTENT_KEYWORDS.objection_competitor.some(k => lower.includes(k))) {
    return {
      intent: "objection_competitor",
      confidence: 0.8,
      sentiment: "neutral",
      urgency: "medium",
      suggestedFlow: "differentiate",
      suggestedPersonality: "wise_mentor"
    };
  }

  if (INTENT_KEYWORDS.objection_price.some(k => lower.includes(k))) {
    return {
      intent: "objection_price",
      confidence: 0.8,
      sentiment: "neutral",
      urgency: "medium",
      suggestedFlow: "handle_price",
      suggestedPersonality: "straight_shooter"
    };
  }

  if (INTENT_KEYWORDS.objection_timing.some(k => lower.includes(k))) {
    return {
      intent: "objection_timing",
      confidence: 0.75,
      sentiment: "neutral",
      urgency: "low",
      suggestedFlow: "handle_timing",
      suggestedPersonality: "charming_connector"
    };
  }

  // Check for soft/hard no
  if (INTENT_KEYWORDS.hard_no.some(k => lower.includes(k))) {
    return {
      intent: "hard_no",
      confidence: 0.9,
      sentiment: "negative",
      urgency: "low",
      suggestedFlow: "graceful_exit",
      suggestedPersonality: "empathetic_advisor"
    };
  }

  if (INTENT_KEYWORDS.soft_no.some(k => lower.includes(k))) {
    return {
      intent: "soft_no",
      confidence: 0.75,
      sentiment: "neutral",
      urgency: "low",
      suggestedFlow: "nurture_soft_no",
      suggestedPersonality: "charming_connector"
    };
  }

  // Check for confusion
  if (INTENT_KEYWORDS.confusion.some(k => lower.includes(k))) {
    return {
      intent: "confusion",
      confidence: 0.7,
      sentiment: "neutral",
      urgency: "medium",
      suggestedFlow: "clarify",
      suggestedPersonality: "brooklyn_bestie"
    };
  }

  // Default - treat as question if has question mark
  if (lower.includes("?")) {
    return {
      intent: "question",
      confidence: 0.6,
      sentiment: "neutral",
      urgency: "medium",
      suggestedFlow: "answer_question",
      suggestedPersonality: "wise_mentor"
    };
  }

  // Unknown - default to interested if positive words
  return {
    intent: "interested",
    confidence: 0.5,
    sentiment: "neutral",
    urgency: "medium",
    suggestedFlow: "clarify",
    suggestedPersonality: "brooklyn_bestie"
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATION FLOW TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FlowStep {
  id: string;
  message: string;
  alternatives: string[];
  waitForResponse: boolean;
  delayMinutes?: number;
  nextStepOnNoResponse?: string;
  personality: PersonalityArchetype;
}

export interface ConversationFlow {
  id: string;
  name: string;
  description: string;
  triggerIntent: ResponseIntent | ResponseIntent[];
  steps: FlowStep[];
  successMetrics: {
    goal: string;
    kpi: string;
  };
}

/**
 * Master flow library - all conversation sequences
 */
export const CONVERSATION_FLOWS: Record<string, ConversationFlow> = {
  // ═════════════════════════════════════════════════
  // HOT LEAD FLOWS
  // ═════════════════════════════════════════════════
  hot_lead: {
    id: "hot_lead",
    name: "Hot Lead - Strike Fast",
    description: "When someone expresses interest, move quickly to schedule",
    triggerIntent: "interested",
    steps: [
      {
        id: "confirm_and_schedule",
        message: "Love it! I can call you in the next 10 mins — or pick a time here: {{calendar_link}}. What works?",
        alternatives: [
          "Perfect! Free for a quick call now? Or I can send you times for tomorrow.",
          "Great — let's make it happen. When's a good time for a 15-min call?",
          "Awesome! Tommy's got a slot open in 30 mins. Work for you?"
        ],
        waitForResponse: true,
        personality: "hustler_heart"
      },
      {
        id: "confirm_time",
        message: "Locked in for {{scheduled_time}}. You'll get a calendar invite shortly. Looking forward to it!",
        alternatives: [
          "Done! See you at {{scheduled_time}}. Tommy will be calling from this number.",
          "Perfect — {{scheduled_time}} it is. Talk then!"
        ],
        waitForResponse: false,
        personality: "sharp_professional"
      }
    ],
    successMetrics: {
      goal: "Schedule call within 2 messages",
      kpi: "call_scheduled"
    }
  },

  schedule_call: {
    id: "schedule_call",
    name: "Call Request - Lock It In",
    description: "They want a call - confirm time immediately",
    triggerIntent: "request_call",
    steps: [
      {
        id: "offer_times",
        message: "Calling you now work? If not, I've got slots at {{time_1}} or {{time_2}} tomorrow. Which one?",
        alternatives: [
          "Love it. What time today works? I can do anytime after 2pm.",
          "Perfect. Morning or afternoon better for you?",
          "On it. Quick call now or should I book you for tomorrow?"
        ],
        waitForResponse: true,
        personality: "straight_shooter"
      }
    ],
    successMetrics: {
      goal: "Lock in call time",
      kpi: "call_scheduled"
    }
  },

  send_info: {
    id: "send_info",
    name: "Info Request - Capture Email",
    description: "They want info - get email, then push for call",
    triggerIntent: "request_info",
    steps: [
      {
        id: "get_email",
        message: "Happy to send it over. Best email for you?",
        alternatives: [
          "Sure thing — what email should I use?",
          "I can do that. What's the best email to reach you?",
          "Perfect. Drop your email and I'll send it right over."
        ],
        waitForResponse: true,
        personality: "sharp_professional"
      },
      {
        id: "confirm_and_upsell",
        message: "Sent! It's a 3-min read. After you look it over, want me to schedule a quick call to walk through it together?",
        alternatives: [
          "Done — check your inbox. Usually people have questions after — want me to call you tomorrow?",
          "Just sent it. LMK if you want to hop on a quick call after you read it."
        ],
        waitForResponse: true,
        delayMinutes: 2,
        personality: "charming_connector"
      }
    ],
    successMetrics: {
      goal: "Capture email + push for call",
      kpi: "email_captured"
    }
  },

  // ═════════════════════════════════════════════════
  // OBJECTION HANDLING FLOWS
  // ═════════════════════════════════════════════════
  handle_busy: {
    id: "handle_busy",
    name: "Too Busy - Minimize Commitment",
    description: "Counter the busy objection with minimal time ask",
    triggerIntent: "objection_busy",
    steps: [
      {
        id: "minimize",
        message: "Totally get it — running a business is no joke. Here's the thing: this call is literally 15 mins. Could save you months of headache. Worth it?",
        alternatives: [
          "I hear you. Look — 15 mins. That's it. If it's not valuable, I'll owe you a coffee.",
          "Yep, you're busy. That's exactly why I want to help. 15 mins could be the most valuable quarter hour of your week.",
          "I get it. What if I just sent you a 2-min voice memo instead? No scheduling needed."
        ],
        waitForResponse: true,
        personality: "brooklyn_bestie"
      },
      {
        id: "offer_alternative",
        message: "What if I just sent you a quick email summary? You can read it when you have a sec. Best email?",
        alternatives: [
          "Tell you what — I'll send a 1-pager to your email. Take 2 mins to scan it. Sound fair?",
          "How about this: I email you the key points, you reply when you're ready. No pressure."
        ],
        waitForResponse: true,
        personality: "charming_connector"
      }
    ],
    successMetrics: {
      goal: "Convert to call or email capture",
      kpi: "engagement_maintained"
    }
  },

  build_trust: {
    id: "build_trust",
    name: "Trust Objection - Establish Credibility",
    description: "Handle skepticism with transparency and proof",
    triggerIntent: "objection_trust",
    steps: [
      {
        id: "validate_and_prove",
        message: "Fair question — lots of spam out there. We're NEXTIER Technologies. You can Google us or check out nextier.com. I'm Gianna, and I work with Tommy Borruso who founded the company. Want me to send you our LinkedIn?",
        alternatives: [
          "I get it, healthy skepticism is smart. Here's me: linkedin.com/in/gianna-nextier. We're a real company with real clients. Want to verify before we talk?",
          "Totally understand. Check us out at nextier.com — we've worked with 200+ business owners. Happy to send references if that helps."
        ],
        waitForResponse: true,
        personality: "sharp_professional"
      },
      {
        id: "offer_proof",
        message: "I can send you a case study from someone in {{industry}} if that helps. Or just Google 'NEXTIER Technologies reviews'. I'll wait.",
        alternatives: [
          "Look, I know cold texts are sketchy. But the worst case here is a 15-min call where you learn something. Best case? You find out you're sitting on more value than you thought.",
        ],
        waitForResponse: true,
        personality: "straight_shooter"
      }
    ],
    successMetrics: {
      goal: "Establish credibility, get back to pitch",
      kpi: "objection_overcome"
    }
  },

  differentiate: {
    id: "differentiate",
    name: "Competitor Objection - Stand Out",
    description: "Handle 'already working with someone' objection",
    triggerIntent: "objection_competitor",
    steps: [
      {
        id: "acknowledge_and_differentiate",
        message: "Smart to have help. Quick q though — are they showing you what actual buyers would pay, or just comps? That's what we specialize in. Might be worth comparing.",
        alternatives: [
          "Nice, always good to have support. What we do is a bit different — we connect you directly with qualified buyers. Worth a second opinion?",
          "That's great. Honestly, we're probably not competitors — we focus specifically on the buyer side. Want to see what we'd offer?"
        ],
        waitForResponse: true,
        personality: "wise_mentor"
      }
    ],
    successMetrics: {
      goal: "Create differentiation, get agreement to compare",
      kpi: "objection_overcome"
    }
  },

  handle_price: {
    id: "handle_price",
    name: "Price Objection - Reframe Value",
    description: "Handle cost concerns by showing ROI",
    triggerIntent: "objection_price",
    steps: [
      {
        id: "reframe",
        message: "Wait — the valuation is free. Zero cost. We only make money if we find you a buyer and you decide to sell. No risk on your end.",
        alternatives: [
          "Let me clarify — there's no fee for this. We're paid by buyers, not you. So basically... free money on the table.",
          "Good news: it costs you nothing to find out what you're worth. We get paid on successful deals only."
        ],
        waitForResponse: true,
        personality: "straight_shooter"
      },
      {
        id: "quantify_value",
        message: "Think of it this way: most owners I talk to are surprised by their number — usually 20-30% higher than they expected. Worth 15 mins to find out, right?",
        alternatives: [
          "Here's the thing — owners who don't know their number usually leave money on the table. A lot of money. This call could literally pay for itself 1000x over."
        ],
        waitForResponse: true,
        personality: "hustler_heart"
      }
    ],
    successMetrics: {
      goal: "Remove price objection, re-engage",
      kpi: "objection_overcome"
    }
  },

  handle_timing: {
    id: "handle_timing",
    name: "Timing Objection - Plant Seed + Follow-up",
    description: "Handle 'not now' gracefully while keeping door open",
    triggerIntent: "objection_timing",
    steps: [
      {
        id: "acknowledge_and_seed",
        message: "Totally get it — timing's everything. Mind if I ask: is it that you're not thinking about selling, or just not ready to explore it yet?",
        alternatives: [
          "Fair enough. Quick question though — are you saying 'never' or 'not right now'? Big difference.",
          "I hear you. Real talk: is it timing, or is there something specific holding you back?"
        ],
        waitForResponse: true,
        personality: "charming_connector"
      },
      {
        id: "schedule_future",
        message: "Got it. What if I checked back in 3 months? Sometimes timing just needs to catch up with opportunity.",
        alternatives: [
          "Understood. I'll put a note to reach out in 90 days. If things change before then, you've got my number.",
          "No problem. When would be a better time to revisit? I'll set a reminder."
        ],
        waitForResponse: false,
        personality: "wise_mentor"
      }
    ],
    successMetrics: {
      goal: "Maintain relationship, schedule future follow-up",
      kpi: "nurture_scheduled"
    }
  },

  // ═════════════════════════════════════════════════
  // EXIT FLOWS
  // ═════════════════════════════════════════════════
  graceful_exit: {
    id: "graceful_exit",
    name: "Hard No - Exit Gracefully",
    description: "Leave a positive impression when they decline",
    triggerIntent: "hard_no",
    steps: [
      {
        id: "exit",
        message: "Understood — appreciate you letting me know. If anything changes down the road, you've got my number. Best of luck with {{company_name}}!",
        alternatives: [
          "No worries at all. Thanks for being straight with me. Take care!",
          "Got it — I respect that. Wishing you continued success!"
        ],
        waitForResponse: false,
        personality: "empathetic_advisor"
      }
    ],
    successMetrics: {
      goal: "Leave positive impression",
      kpi: "clean_exit"
    }
  },

  immediate_opt_out: {
    id: "immediate_opt_out",
    name: "Opt-Out - Immediate Compliance",
    description: "Immediately honor opt-out requests",
    triggerIntent: "opt_out",
    steps: [
      {
        id: "confirm_removal",
        message: "Done — you're off the list. Sorry for the bother. Take care!",
        alternatives: [
          "Removed. You won't hear from me again. All the best!",
          "Got it — removed. Apologies for any inconvenience."
        ],
        waitForResponse: false,
        personality: "empathetic_advisor"
      }
    ],
    successMetrics: {
      goal: "Immediate compliance",
      kpi: "opt_out_honored"
    }
  },

  de_escalation: {
    id: "de_escalation",
    name: "Anger - De-escalate",
    description: "Calm angry responses and exit gracefully",
    triggerIntent: "anger",
    steps: [
      {
        id: "apologize_and_exit",
        message: "I'm sorry — that wasn't my intention. I'll remove you from our list right now. Apologies for the inconvenience.",
        alternatives: [
          "My apologies. I'll make sure you're removed. Won't happen again.",
          "I hear you. Taking you off the list now. Sorry about that."
        ],
        waitForResponse: false,
        personality: "empathetic_advisor"
      }
    ],
    successMetrics: {
      goal: "De-escalate and exit",
      kpi: "clean_exit"
    }
  },

  // ═════════════════════════════════════════════════
  // NURTURE FLOWS
  // ═════════════════════════════════════════════════
  nurture_soft_no: {
    id: "nurture_soft_no",
    name: "Soft No - Nurture for Later",
    description: "Keep relationship warm for future opportunity",
    triggerIntent: "soft_no",
    steps: [
      {
        id: "acknowledge",
        message: "Totally understand — timing matters. Mind if I check back in a few months? Things change.",
        alternatives: [
          "No problem at all. Would it be okay to reach out in 90 days?",
          "Got it. I'll circle back in a quarter. In the meantime, feel free to reach out if anything changes."
        ],
        waitForResponse: true,
        personality: "charming_connector"
      },
      {
        id: "offer_value",
        message: "In the meantime — want me to send you our monthly market report for {{industry}}? No selling, just intel.",
        alternatives: [
          "I can add you to our newsletter if you want — just market insights, no pitches.",
          "Happy to keep you in the loop on industry trends. Want me to add you to our updates?"
        ],
        waitForResponse: true,
        personality: "wise_mentor"
      }
    ],
    successMetrics: {
      goal: "Maintain relationship, add to nurture",
      kpi: "nurture_added"
    }
  },

  answer_question: {
    id: "answer_question",
    name: "Question - Answer + Pivot",
    description: "Answer their question briefly, then redirect to call",
    triggerIntent: "question",
    steps: [
      {
        id: "brief_answer_and_pivot",
        message: "Good question — the short answer is {{brief_answer}}. But honestly, it's easier to explain in a quick call. Got 10 mins?",
        alternatives: [
          "{{brief_answer}} — but there's more context that would help. Worth a 15-min call?",
          "Here's the quick version: {{brief_answer}}. Want me to walk you through the details on a call?"
        ],
        waitForResponse: true,
        personality: "wise_mentor"
      }
    ],
    successMetrics: {
      goal: "Answer briefly, redirect to call",
      kpi: "call_scheduled"
    }
  },

  clarify: {
    id: "clarify",
    name: "Confusion - Clarify and Re-engage",
    description: "Clear up confusion and restart pitch",
    triggerIntent: "confusion",
    steps: [
      {
        id: "clarify",
        message: "Ha — my bad, let me start over. I'm Gianna with NEXTIER. We help business owners find out what their company is worth. Free, no obligation. Interested?",
        alternatives: [
          "Sorry, I'll keep it simple: I help people find out how much their business would sell for. Takes 15 mins. Want to find out yours?",
          "Let me try again — we give business owners free valuations. Zero cost. Just curious if you'd want to know your number?"
        ],
        waitForResponse: true,
        personality: "brooklyn_bestie"
      }
    ],
    successMetrics: {
      goal: "Clear confusion, restart engagement",
      kpi: "engagement_restored"
    }
  },

  // ═════════════════════════════════════════════════
  // GHOST REVIVAL FLOWS
  // ═════════════════════════════════════════════════
  ghost_day_3: {
    id: "ghost_day_3",
    name: "Ghost - Day 3 Follow-up",
    description: "First follow-up after no response",
    triggerIntent: "ghost",
    steps: [
      {
        id: "casual_bump",
        message: "Hey {{first_name}} — just bumping this up. Still curious about that valuation?",
        alternatives: [
          "{{first_name}}, checking in — did my last message get lost?",
          "Quick follow-up {{first_name}} — still interested in seeing your number?"
        ],
        waitForResponse: true,
        personality: "brooklyn_bestie"
      }
    ],
    successMetrics: {
      goal: "Re-engage",
      kpi: "response_received"
    }
  },

  ghost_day_7: {
    id: "ghost_day_7",
    name: "Ghost - Day 7 Pattern Interrupt",
    description: "Second follow-up with humor",
    triggerIntent: "ghost",
    steps: [
      {
        id: "pattern_interrupt",
        message: "{{first_name}} — I'm starting to think you're playing hard to get 😂 Quick yes or no: worth a 15-min call?",
        alternatives: [
          "Either you're super busy or my messages are going to spam. Which is it? 🤔",
          "{{first_name}}, I've sent a few texts now. If you're not interested, just say the word — no hard feelings."
        ],
        waitForResponse: true,
        personality: "playful_closer"
      }
    ],
    successMetrics: {
      goal: "Get definitive response",
      kpi: "response_received"
    }
  },

  ghost_final: {
    id: "ghost_final",
    name: "Ghost - Final Attempt",
    description: "Last message before archiving",
    triggerIntent: "ghost",
    steps: [
      {
        id: "breakup",
        message: "{{first_name}}, this is my last message. If you ever want to know what {{company_name}} is worth, you've got my number. Until then — best of luck! — Gianna",
        alternatives: [
          "Alright {{first_name}}, I can take a hint. Closing your file for now. If things change, hit me up. Best! — Gianna",
          "Last try, {{first_name}}. If now's not the time, I get it. I'll circle back in 6 months. Take care! — Gianna"
        ],
        waitForResponse: false,
        personality: "empathetic_advisor"
      }
    ],
    successMetrics: {
      goal: "Clean exit with open door",
      kpi: "clean_exit"
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// INDUSTRY-SPECIFIC SEQUENCES
// ═══════════════════════════════════════════════════════════════════════════════

export const INDUSTRY_OPENERS: Record<string, string[]> = {
  restaurant: [
    "{{first_name}}, restaurants are getting wild offers right now. Curious what {{company_name}} could get?",
    "Hey {{first_name}}, the restaurant M&A market is hot. Want to see where {{company_name}} stands?",
    "{{first_name}}, I've seen 3 restaurant deals close above asking this month. Interested in a valuation?"
  ],
  healthcare: [
    "{{first_name}}, healthcare practices are getting premium multiples. Want to see {{company_name}}'s number?",
    "Hey {{first_name}}, PE firms are actively buying in healthcare. Curious what they'd pay for {{company_name}}?",
    "{{first_name}}, healthcare valuations are at record highs. Worth finding out what {{company_name}} could sell for?"
  ],
  construction: [
    "{{first_name}}, construction companies with your revenue profile are in high demand. Curious about {{company_name}}'s value?",
    "Hey {{first_name}}, seen a lot of construction deals close big lately. Want to know where {{company_name}} stands?",
    "{{first_name}}, PE is buying up construction like crazy. Ever wonder what {{company_name}} would go for?"
  ],
  manufacturing: [
    "{{first_name}}, manufacturing with solid equipment and contracts is getting top dollar. Want {{company_name}}'s valuation?",
    "Hey {{first_name}}, the reshoring trend is driving manufacturing valuations up. Curious about {{company_name}}?",
    "{{first_name}}, I'm seeing manufacturing deals close at 6-8x. Want to see where {{company_name}} falls?"
  ],
  professional_services: [
    "{{first_name}}, professional services firms with recurring revenue are highly sought after. Want to know {{company_name}}'s worth?",
    "Hey {{first_name}}, buyers love stable client relationships. Curious what {{company_name}} could command?",
    "{{first_name}}, seen a lot of professional services deals close recently. Want {{company_name}}'s number?"
  ],
  retail: [
    "{{first_name}}, retail with good margins and location is still attractive to buyers. Want {{company_name}}'s valuation?",
    "Hey {{first_name}}, despite what you hear, profitable retail is selling. Curious about {{company_name}}?",
    "{{first_name}}, the right retail buyer is always looking. Want to know what {{company_name}} could get?"
  ],
  real_estate: [
    "{{first_name}}, I noticed your property at {{property_address}}. Curious what it's worth in today's market?",
    "Hey {{first_name}}, properties like yours are getting strong offers. Want a quick valuation?",
    "{{first_name}}, equity positions like yours can unlock a lot. Ever thought about what it's worth?"
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRAL REQUEST SEQUENCES
// ═══════════════════════════════════════════════════════════════════════════════

export const REFERRAL_SEQUENCES = {
  post_deal: [
    "{{first_name}}, so glad we could help with {{company_name}}! Quick ask: know anyone else who might benefit from a valuation? I'd love an intro.",
    "Hey {{first_name}}, thanks again for working with us. If you know other owners who might want to know their number, I'd appreciate the referral!",
    "{{first_name}}, hope you're enjoying the next chapter! If any of your contacts are thinking about selling, I'd love to help them too."
  ],
  post_call: [
    "{{first_name}}, thanks for the chat earlier. Quick q: know anyone in {{industry}} who might want a similar valuation?",
    "Hey {{first_name}}, really enjoyed our conversation. If any of your peers are thinking about exit options, I'd love an intro.",
  ],
  annual_check_in: [
    "{{first_name}}, hope all is well! Checking in — anyone in your network thinking about selling? I'd love to help.",
    "Hey {{first_name}}, been a while! If you've come across any business owners exploring their options, I'd appreciate a referral."
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the appropriate flow for a classified response
 */
export function getFlowForResponse(classification: ResponseClassification): ConversationFlow | null {
  return CONVERSATION_FLOWS[classification.suggestedFlow] || null;
}

/**
 * Get industry-specific opener
 */
export function getIndustryOpener(industry: string, context: { first_name: string; company_name: string }): string {
  const key = industry.toLowerCase().replace(/\s+/g, "_");
  const openers = INDUSTRY_OPENERS[key] || INDUSTRY_OPENERS["professional_services"];
  const template = openers[Math.floor(Math.random() * openers.length)];

  return template
    .replace(/\{\{first_name\}\}/g, context.first_name)
    .replace(/\{\{company_name\}\}/g, context.company_name);
}

/**
 * Get referral request for context
 */
export function getReferralRequest(
  type: "post_deal" | "post_call" | "annual_check_in",
  context: { first_name: string; company_name?: string; industry?: string }
): string {
  const templates = REFERRAL_SEQUENCES[type];
  const template = templates[Math.floor(Math.random() * templates.length)];

  return template
    .replace(/\{\{first_name\}\}/g, context.first_name)
    .replace(/\{\{company_name\}\}/g, context.company_name || "your business")
    .replace(/\{\{industry\}\}/g, context.industry || "your industry");
}

export default {
  classifyResponse,
  CONVERSATION_FLOWS,
  INDUSTRY_OPENERS,
  REFERRAL_SEQUENCES,
  getFlowForResponse,
  getIndustryOpener,
  getReferralRequest
};
