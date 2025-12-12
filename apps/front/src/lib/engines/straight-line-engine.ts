/**
 * Straight Line Communication Engine
 *
 * Implements Jordan Belfort's Straight Line methodology with
 * personality influences and style customization.
 *
 * Personality Mix: Lori Greiner (confident), Barbara Corcoran (warm), Candace Owens (direct)
 * Character Influences: Mr. Wonderful, Grant Cardone, Gary Vee, Daymond John, Mark Cuban
 *
 * Sliders:
 * - Humor: 0-100 (serious ↔ funny)
 * - Style: 0-100 (direct ↔ conversational)
 */

// Character influence presets
export type CharacterInfluence =
  | "mr_wonderful" // Blunt, money-focused, "What's in it for me?"
  | "grant_cardone" // Aggressive, 10X, high energy
  | "gary_vee" // Hustle, authentic, emotional connection
  | "daymond_john" // Resourceful, calculated, FUBU hustle
  | "mark_cuban" // Analytical, cuts through BS, no-nonsense
  | "lori_greiner" // Queen of QVC, knows value, confident
  | "barbara_corcoran" // Street-smart, warm, storytelling
  | "candace_owens" // Bold, articulate, unapologetic
  | "jordan_belfort"; // Classic straight line, relentless closer

// Straight Line stages (the methodology)
export type StraightLineStage =
  | "open" // Open with pattern interrupt
  | "rapport" // Build immediate connection
  | "qualify" // Qualify the prospect
  | "present" // Present the opportunity
  | "objection" // Handle objections
  | "close"; // Close with confidence

export interface CommunicationStyle {
  humor: number; // 0 = serious, 100 = maximum humor
  directness: number; // 0 = conversational, 100 = extremely direct
  warmth: number; // 0 = cold/professional, 100 = warm/personal
  energy: number; // 0 = calm/measured, 100 = high energy
  urgency: number; // 0 = no pressure, 100 = strong urgency
}

export interface MessageContext {
  first_name: string;
  company_name?: string;
  industry?: string;
  pain_point?: string;
  value_proposition?: string;
  objection?: string;
  stage: StraightLineStage;
}

export interface GeneratedMessage {
  message: string;
  character_influence: CharacterInfluence;
  stage: StraightLineStage;
  style_applied: CommunicationStyle;
  certainty_score: number; // 1-10 how confident/certain the message sounds
}

// Character style definitions
const CHARACTER_STYLES: Record<
  CharacterInfluence,
  CommunicationStyle & { signature_phrases: string[] }
> = {
  mr_wonderful: {
    humor: 30,
    directness: 95,
    warmth: 20,
    energy: 60,
    urgency: 80,
    signature_phrases: [
      "Here's the deal",
      "What's in it for me?",
      "Money doesn't care about your feelings",
      "Let me tell you something",
      "You're dead to me", // humor
    ],
  },
  grant_cardone: {
    humor: 20,
    directness: 90,
    warmth: 40,
    energy: 100,
    urgency: 100,
    signature_phrases: [
      "10X your results",
      "Massive action",
      "Average is a failing formula",
      "Be obsessed or be average",
      "Speed of implementation",
    ],
  },
  gary_vee: {
    humor: 50,
    directness: 85,
    warmth: 80,
    energy: 95,
    urgency: 60,
    signature_phrases: [
      "Look, here's the thing",
      "Clouds and dirt",
      "Hustle",
      "Self-awareness is key",
      "Document, don't create",
    ],
  },
  daymond_john: {
    humor: 30,
    directness: 70,
    warmth: 70,
    energy: 65,
    urgency: 50,
    signature_phrases: [
      "FUBU - For Us, By Us",
      "Bootstrap it",
      "Power of broke",
      "Relationships are currency",
      "The hustle never sleeps",
    ],
  },
  mark_cuban: {
    humor: 40,
    directness: 95,
    warmth: 50,
    energy: 80,
    urgency: 70,
    signature_phrases: [
      "I'm out",
      "Let me cut through the BS",
      "The numbers don't lie",
      "Effort is the great equalizer",
      "Work like there's someone working 24 hours to take it from you",
    ],
  },
  lori_greiner: {
    humor: 35,
    directness: 75,
    warmth: 85,
    energy: 80,
    urgency: 65,
    signature_phrases: [
      "I know a hero when I see one",
      "This could be huge",
      "Trust your gut",
      "I see the value here",
      "Let's make this happen",
    ],
  },
  barbara_corcoran: {
    humor: 60,
    directness: 60,
    warmth: 95,
    energy: 75,
    urgency: 55,
    signature_phrases: [
      "Let me tell you a story",
      "I started with a $1,000 loan",
      "The best time to expand is when others won't",
      "Fun is good for business",
      "Your best salesperson is a happy customer",
    ],
  },
  candace_owens: {
    humor: 25,
    directness: 100,
    warmth: 40,
    energy: 85,
    urgency: 75,
    signature_phrases: [
      "Let me be clear",
      "The facts are simple",
      "Stop making excuses",
      "Think for yourself",
      "Wake up",
    ],
  },
  jordan_belfort: {
    humor: 45,
    directness: 90,
    warmth: 65,
    energy: 90,
    urgency: 95,
    signature_phrases: [
      "The only thing standing between you and your goal",
      "Act as if",
      "Sell me this pen",
      "Create a sense of urgency",
      "Be relentless",
    ],
  },
};

// Straight Line stage templates
const STAGE_TEMPLATES: Record<
  StraightLineStage,
  {
    serious: string[];
    humorous: string[];
    direct: string[];
    conversational: string[];
  }
> = {
  open: {
    serious: [
      "{{first_name}}, I'll be direct with you — this isn't a sales call. This is about opportunity.",
      "{{first_name}}, I have something important to discuss about {{company_name}}.",
      "{{first_name}}, I'm reaching out because I believe you're leaving money on the table.",
    ],
    humorous: [
      "{{first_name}}, before you delete this — give me 10 seconds. I promise I'm not selling extended warranties.",
      "{{first_name}}, I know what you're thinking... 'another message.' But hear me out — this one's actually worth reading.",
      "{{first_name}}, I'm not going to pretend we're old friends. But I might be your new favorite contact.",
    ],
    direct: [
      "{{first_name}}, let's skip the small talk. Are you interested in knowing what {{company_name}} is worth?",
      "{{first_name}}, straight to the point: I can get you a valuation in 15 minutes. Yes or no?",
      "{{first_name}}, one question: Have you ever thought about your exit strategy?",
    ],
    conversational: [
      "Hey {{first_name}}, hope you're having a good day. Quick question for you...",
      "{{first_name}}, I was doing some research and came across {{company_name}}. Had to reach out.",
      "Hi {{first_name}}! I know you're busy, but I think you'll want to hear this.",
    ],
  },
  rapport: {
    serious: [
      "{{first_name}}, I've worked with business owners in {{industry}} for years. I understand what you're dealing with.",
      "{{first_name}}, running a business isn't easy. I get it. That's exactly why I'm reaching out.",
      "{{first_name}}, between the stress and the uncertainty, knowing your options matters.",
    ],
    humorous: [
      "{{first_name}}, I've talked to enough business owners to know that 'I'm fine' usually means 'I could use a vacation.'",
      "{{first_name}}, you probably didn't wake up thinking about exit strategies. That's what I'm here for.",
      "{{first_name}}, I know — another person in your inbox. But at least I'm not asking for your WiFi password.",
    ],
    direct: [
      "{{first_name}}, I respect your time. Let me show you I'm worth it.",
      "{{first_name}}, I don't do fluff. I do results. Let's talk.",
      "{{first_name}}, you've built something. Let's see what it's actually worth.",
    ],
    conversational: [
      "{{first_name}}, I get it — you're juggling a million things. But this could be the one thing that matters most.",
      "{{first_name}}, I just want to have a real conversation. No scripts. No pressure.",
      "{{first_name}}, I know how hard you've worked on {{company_name}}. It deserves proper attention.",
    ],
  },
  qualify: {
    serious: [
      "{{first_name}}, have you thought about what {{company_name}} would sell for today?",
      "{{first_name}}, do you have an exit timeline in mind, or are you open to exploring options?",
      "{{first_name}}, if the right offer came along, would you consider it?",
    ],
    humorous: [
      "{{first_name}}, quick quiz: Do you know your business's value, or are you guessing like the rest of us?",
      "{{first_name}}, be honest — have you ever Googled 'what is my business worth' at 2am?",
      "{{first_name}}, on a scale of 'not at all' to 'I've already packed my desk,' how ready are you to explore options?",
    ],
    direct: [
      "{{first_name}}, simple question: Are you open to a conversation about selling?",
      "{{first_name}}, yes or no — do you want to know your number?",
      "{{first_name}}, I need to know: Are you serious about exploring this, or just curious?",
    ],
    conversational: [
      "{{first_name}}, just curious — have you ever thought about what comes next for {{company_name}}?",
      "{{first_name}}, no pressure at all — but what would make you consider selling?",
      "{{first_name}}, I'd love to hear your thoughts on where {{company_name}} is headed.",
    ],
  },
  present: {
    serious: [
      "{{first_name}}, here's what we offer: A confidential valuation in 15 minutes. No obligation. No games.",
      "{{first_name}}, we specialize in finding the right buyers for businesses like {{company_name}}. The process is simple.",
      "{{first_name}}, what we do is straightforward: We tell you what your business is worth, and if you're interested, we find you a buyer.",
    ],
    humorous: [
      "{{first_name}}, here's the deal: 15 minutes of your time, and you'll know your number. That's less time than your last Netflix binge.",
      "{{first_name}}, we're like a Carfax report, but for your business. And way more useful.",
      "{{first_name}}, think of us as your business's Zillow. Except we're actually accurate.",
    ],
    direct: [
      "{{first_name}}, 15 minutes. Free valuation. No strings. That's the offer.",
      "{{first_name}}, we find deals. We close deals. Simple. Let's see if {{company_name}} qualifies.",
      "{{first_name}}, I'm not here to waste your time. Here's exactly what happens: Call. Valuation. Decision.",
    ],
    conversational: [
      "{{first_name}}, let me tell you what we can do for you. It starts with a quick, confidential conversation.",
      "{{first_name}}, we've helped business owners like you understand their options. Want to hear how it works?",
      "{{first_name}}, the process is really simple. First, we chat. Then, we crunch numbers. Then, you decide.",
    ],
  },
  objection: {
    serious: [
      "{{first_name}}, I understand your concern about {{objection}}. Here's how we handle that...",
      "{{first_name}}, that's a valid point. But consider this: the worst case is you learn something valuable.",
      "{{first_name}}, I hear that objection often. And here's what owners tell me after we talk...",
    ],
    humorous: [
      "{{first_name}}, I get it — {{objection}}. That's what everyone says until they see the number.",
      "{{first_name}}, you're worried about {{objection}}? That's the easiest problem to solve. The hard part was building the business.",
      "{{first_name}}, if I had a dollar for every time I heard '{{objection}},' I'd... well, I'd probably still be doing this because I love it.",
    ],
    direct: [
      "{{first_name}}, let me address {{objection}} directly: It's not an issue. Here's why.",
      "{{first_name}}, {{objection}} is a non-factor. Let me explain in 30 seconds.",
      "{{first_name}}, you mentioned {{objection}}. That doesn't change the opportunity. Focus on the upside.",
    ],
    conversational: [
      "{{first_name}}, I totally understand where you're coming from with {{objection}}. Let's talk through it.",
      "{{first_name}}, that's a really common concern. Want me to walk you through how we handle it?",
      "{{first_name}}, I appreciate you being honest about {{objection}}. Here's what I've seen work...",
    ],
  },
  close: {
    serious: [
      "{{first_name}}, the next step is simple: 15 minutes on a call with Tommy. When works for you?",
      "{{first_name}}, let's lock in a time. This week or next?",
      "{{first_name}}, you've heard what we offer. The question is: Are you ready to find out your number?",
    ],
    humorous: [
      "{{first_name}}, so what do you say — coffee call? I promise to only talk about your business and not my CrossFit routine.",
      "{{first_name}}, this is the part where I say 'the ball is in your court.' But really, I'm just gonna follow up anyway.",
      "{{first_name}}, let's do this. Worst case, you waste 15 minutes. Best case, you retire early.",
    ],
    direct: [
      "{{first_name}}, I'm going to send you a calendar link. Pick a time. That's it.",
      "{{first_name}}, decision time. 15 minutes on a call. Yes or no?",
      "{{first_name}}, let's stop going back and forth. Give me 15 minutes and I'll give you your number.",
    ],
    conversational: [
      "{{first_name}}, no pressure at all — but I'd love to continue this conversation on a quick call. What works for you?",
      "{{first_name}}, I think we'd have a great conversation. Want to hop on a call this week?",
      "{{first_name}}, I really think you'll find this valuable. How about a quick chat to explore further?",
    ],
  },
};

class StraightLineEngine {
  private currentCharacter: CharacterInfluence = "lori_greiner";
  private style: CommunicationStyle = {
    humor: 40,
    directness: 70,
    warmth: 75,
    energy: 70,
    urgency: 60,
  };

  /**
   * Set character influence (adjusts base style automatically)
   */
  setCharacter(character: CharacterInfluence): void {
    this.currentCharacter = character;
    const characterStyle = CHARACTER_STYLES[character];
    this.style = {
      humor: characterStyle.humor,
      directness: characterStyle.directness,
      warmth: characterStyle.warmth,
      energy: characterStyle.energy,
      urgency: characterStyle.urgency,
    };
  }

  /**
   * Set individual style sliders (overrides character defaults)
   */
  setStyle(style: Partial<CommunicationStyle>): void {
    this.style = { ...this.style, ...style };
  }

  /**
   * Set humor level (0-100)
   */
  setHumor(level: number): void {
    this.style.humor = Math.max(0, Math.min(100, level));
  }

  /**
   * Set directness level (0-100)
   */
  setDirectness(level: number): void {
    this.style.directness = Math.max(0, Math.min(100, level));
  }

  /**
   * Get current style configuration
   */
  getStyle(): CommunicationStyle {
    return { ...this.style };
  }

  /**
   * Get current character
   */
  getCharacter(): CharacterInfluence {
    return this.currentCharacter;
  }

  /**
   * Get all available characters with their base styles
   */
  getAvailableCharacters(): {
    id: CharacterInfluence;
    style: CommunicationStyle;
  }[] {
    return Object.entries(CHARACTER_STYLES).map(([id, style]) => ({
      id: id as CharacterInfluence,
      style: {
        humor: style.humor,
        directness: style.directness,
        warmth: style.warmth,
        energy: style.energy,
        urgency: style.urgency,
      },
    }));
  }

  /**
   * Replace variables in template
   */
  private replaceVariables(template: string, context: MessageContext): string {
    let result = template;
    result = result.replace(/{{first_name}}/g, context.first_name || "there");
    result = result.replace(
      /{{company_name}}/g,
      context.company_name || "your business",
    );
    result = result.replace(
      /{{industry}}/g,
      context.industry || "your industry",
    );
    result = result.replace(
      /{{pain_point}}/g,
      context.pain_point || "your challenges",
    );
    result = result.replace(
      /{{objection}}/g,
      context.objection || "your concern",
    );
    return result;
  }

  /**
   * Select template type based on style settings
   */
  private getTemplateType():
    | "serious"
    | "humorous"
    | "direct"
    | "conversational" {
    // High humor → humorous
    if (this.style.humor > 60) return "humorous";
    // High directness, low humor → direct
    if (this.style.directness > 70 && this.style.humor < 40) return "direct";
    // Low directness → conversational
    if (this.style.directness < 40) return "conversational";
    // Default → serious
    return "serious";
  }

  /**
   * Generate message for specific stage
   */
  generateMessage(context: MessageContext): GeneratedMessage {
    const templateType = this.getTemplateType();
    const stageTemplates = STAGE_TEMPLATES[context.stage];
    const templates = stageTemplates[templateType];

    // Select random template from the type
    const selectedTemplate =
      templates[Math.floor(Math.random() * templates.length)];
    const message = this.replaceVariables(selectedTemplate, context);

    // Calculate certainty score based on directness and energy
    const certaintyScore = Math.round(
      (this.style.directness + this.style.energy + this.style.urgency) / 3 / 10,
    );

    return {
      message,
      character_influence: this.currentCharacter,
      stage: context.stage,
      style_applied: { ...this.style },
      certainty_score: Math.max(1, Math.min(10, certaintyScore)),
    };
  }

  /**
   * Generate full Straight Line sequence
   */
  generateSequence(context: Omit<MessageContext, "stage">): GeneratedMessage[] {
    const stages: StraightLineStage[] = [
      "open",
      "rapport",
      "qualify",
      "present",
      "close",
    ];
    return stages.map((stage) => this.generateMessage({ ...context, stage }));
  }

  /**
   * Mix multiple character styles
   */
  mixCharacters(characters: CharacterInfluence[], weights?: number[]): void {
    if (characters.length === 0) return;

    const normalizedWeights =
      weights || characters.map(() => 1 / characters.length);
    const totalWeight = normalizedWeights.reduce((a, b) => a + b, 0);

    const mixedStyle: CommunicationStyle = {
      humor: 0,
      directness: 0,
      warmth: 0,
      energy: 0,
      urgency: 0,
    };

    characters.forEach((char, i) => {
      const charStyle = CHARACTER_STYLES[char];
      const weight = normalizedWeights[i] / totalWeight;

      mixedStyle.humor += charStyle.humor * weight;
      mixedStyle.directness += charStyle.directness * weight;
      mixedStyle.warmth += charStyle.warmth * weight;
      mixedStyle.energy += charStyle.energy * weight;
      mixedStyle.urgency += charStyle.urgency * weight;
    });

    this.style = {
      humor: Math.round(mixedStyle.humor),
      directness: Math.round(mixedStyle.directness),
      warmth: Math.round(mixedStyle.warmth),
      energy: Math.round(mixedStyle.energy),
      urgency: Math.round(mixedStyle.urgency),
    };

    // Set primary character to first in list
    this.currentCharacter = characters[0];
  }

  /**
   * Preset: Lori + Barbara + Candace mix (strong, warm, confident)
   */
  useSharkTankLadiesMix(): void {
    this.mixCharacters(["lori_greiner", "barbara_corcoran", "candace_owens"]);
  }

  /**
   * Preset: Mr. Wonderful style (blunt, money-focused)
   */
  useMrWonderfulStyle(): void {
    this.setCharacter("mr_wonderful");
  }

  /**
   * Preset: Grant Cardone 10X energy
   */
  use10XStyle(): void {
    this.setCharacter("grant_cardone");
  }

  /**
   * Preset: Jordan Belfort Straight Line closer
   */
  useStraightLineCloser(): void {
    this.setCharacter("jordan_belfort");
    this.style.urgency = 100;
    this.style.directness = 95;
  }
}

// Export singleton
export const straightLineEngine = new StraightLineEngine();

// Export class for custom instances
export { StraightLineEngine };

// Export character styles for UI
export { CHARACTER_STYLES };
