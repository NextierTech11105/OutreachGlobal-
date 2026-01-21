/**
 * Compound Response Classifier
 *
 * Classifies inbound responses that may contain multiple signals.
 * Processes in priority order to ensure correct routing.
 *
 * Priority Order (highest first):
 * 1. OPT_OUT - Immediate suppress
 * 2. EMAIL_CAPTURED - Mark GOLD
 * 3. WANTS_CALL - Route to SABRINA
 * 4. INTERESTED - Priority boost
 * 5. QUESTION - GIANNA answers
 * 6. TIMING - CATHY nurture
 * 7. NOT_INTERESTED - CATHY soft nurture
 */

// =============================================================================
// TYPES
// =============================================================================

export type ResponseSignal =
  | "OPT_OUT"           // STOP, unsubscribe
  | "EMAIL_CAPTURED"    // Email provided in response
  | "WANTS_CALL"        // "call me", "give me a ring"
  | "INTERESTED"        // Positive response
  | "QUESTION"          // Asking for more info
  | "TIMING"            // Bad timing, busy
  | "NOT_INTERESTED"    // Negative but polite
  | "SPAM"              // Irrelevant
  | "UNCLEAR";          // Can't classify

export type WorkerAssignment = "GIANNA" | "CATHY" | "SABRINA" | "HUMAN";

export interface ClassificationResult {
  primary_signal: ResponseSignal;
  all_signals: ResponseSignal[];
  confidence: number;
  worker: WorkerAssignment;
  action: ClassificationAction;
  priority_boost: number;       // 0-3, higher = more urgent
  extracted_data: {
    email?: string;
    phone?: string;
    preferred_time?: string;
  };
}

export type ClassificationAction =
  | "SUPPRESS"           // OPT_OUT - stop all contact
  | "MARK_GOLD"          // EMAIL_CAPTURED - high value lead
  | "SEND_BOOKING"       // WANTS_CALL/INTERESTED - send calendar link
  | "AUTO_RESPOND"       // QUESTION - GIANNA answers
  | "NURTURE"            // TIMING/NOT_INTERESTED - CATHY sequence
  | "REVIEW"             // UNCLEAR - human review
  | "IGNORE";            // SPAM

// =============================================================================
// PATTERNS
// =============================================================================

const PATTERNS = {
  OPT_OUT: /\b(stop|unsubscribe|remove|opt.?out|no more|don'?t text|cancel|end|quit)\b/i,

  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,

  WANTS_CALL: /\b(call me|give.{0,5}call|phone.{0,5}call|ring me|reach.{0,5}phone|talk.{0,5}phone|prefer.{0,5}call)\b/i,

  INTERESTED: /\b(yes|interested|sounds good|tell me more|sign me up|let'?s.{0,10}(talk|chat|meet)|i'?m.{0,5}in|absolutely|definitely|love to|would like)\b/i,

  QUESTION: /\b(what|how|when|where|why|which|who|can you|could you|is this|are you|do you|does it|price|cost|more info)\b.*\?/i,

  TIMING: /\b(busy|not.{0,5}good.{0,5}time|bad.{0,5}time|later|next.{0,5}(week|month)|after|swamped|crazy|slammed|hectic)\b/i,

  NOT_INTERESTED: /\b(no thanks|not interested|not for me|pass|no need|don'?t need|all set|good|we'?re.{0,5}(good|fine|set))\b/i,

  PHONE: /\b(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/,

  TIME_PREFERENCE: /\b((morning|afternoon|evening|before|after)\s*\d{1,2}(:\d{2})?\s*(am|pm)?|(\d{1,2}(:\d{2})?\s*(am|pm)))\b/i,
};

// =============================================================================
// CLASSIFIER
// =============================================================================

/**
 * Classify an inbound message with compound signal detection
 */
export function classifyResponse(message: string): ClassificationResult {
  const signals: ResponseSignal[] = [];
  let confidence = 0.5;
  const extractedData: ClassificationResult["extracted_data"] = {};

  const normalizedMessage = message.trim().toLowerCase();

  // Check each pattern in priority order
  if (PATTERNS.OPT_OUT.test(message)) {
    signals.push("OPT_OUT");
    confidence = 0.95; // High confidence on opt-out patterns
  }

  // Email extraction (high value!)
  const emailMatch = message.match(PATTERNS.EMAIL);
  if (emailMatch) {
    signals.push("EMAIL_CAPTURED");
    extractedData.email = emailMatch[0].toLowerCase();
    confidence = Math.max(confidence, 0.9);
  }

  // Phone extraction
  const phoneMatch = message.match(PATTERNS.PHONE);
  if (phoneMatch) {
    extractedData.phone = phoneMatch[1].replace(/\D/g, "");
  }

  // Time preference extraction
  const timeMatch = message.match(PATTERNS.TIME_PREFERENCE);
  if (timeMatch) {
    extractedData.preferred_time = timeMatch[0];
  }

  if (PATTERNS.WANTS_CALL.test(message)) {
    signals.push("WANTS_CALL");
    confidence = Math.max(confidence, 0.85);
  }

  if (PATTERNS.INTERESTED.test(message)) {
    signals.push("INTERESTED");
    confidence = Math.max(confidence, 0.8);
  }

  if (PATTERNS.QUESTION.test(message)) {
    signals.push("QUESTION");
    confidence = Math.max(confidence, 0.75);
  }

  if (PATTERNS.TIMING.test(message)) {
    signals.push("TIMING");
    confidence = Math.max(confidence, 0.7);
  }

  if (PATTERNS.NOT_INTERESTED.test(message)) {
    signals.push("NOT_INTERESTED");
    confidence = Math.max(confidence, 0.7);
  }

  // Default to unclear if no signals
  if (signals.length === 0) {
    signals.push("UNCLEAR");
    confidence = 0.3;
  }

  // Primary signal is highest priority
  const primary = signals[0];

  // Determine worker and action based on primary signal
  const { worker, action, priority_boost } = determineRouting(primary, signals);

  return {
    primary_signal: primary,
    all_signals: signals,
    confidence,
    worker,
    action,
    priority_boost,
    extracted_data: extractedData,
  };
}

/**
 * Determine worker assignment and action based on signals
 */
function determineRouting(
  primary: ResponseSignal,
  allSignals: ResponseSignal[]
): { worker: WorkerAssignment; action: ClassificationAction; priority_boost: number } {
  switch (primary) {
    case "OPT_OUT":
      return { worker: "HUMAN", action: "SUPPRESS", priority_boost: 0 };

    case "EMAIL_CAPTURED":
      // Email = GOLD lead, route to SABRINA for booking
      return { worker: "SABRINA", action: "MARK_GOLD", priority_boost: 3 };

    case "WANTS_CALL":
      return { worker: "SABRINA", action: "SEND_BOOKING", priority_boost: 2 };

    case "INTERESTED":
      // Check if also has questions - if so, GIANNA first
      if (allSignals.includes("QUESTION")) {
        return { worker: "GIANNA", action: "AUTO_RESPOND", priority_boost: 2 };
      }
      return { worker: "SABRINA", action: "SEND_BOOKING", priority_boost: 2 };

    case "QUESTION":
      return { worker: "GIANNA", action: "AUTO_RESPOND", priority_boost: 1 };

    case "TIMING":
      return { worker: "CATHY", action: "NURTURE", priority_boost: 0 };

    case "NOT_INTERESTED":
      return { worker: "CATHY", action: "NURTURE", priority_boost: 0 };

    case "SPAM":
      return { worker: "HUMAN", action: "IGNORE", priority_boost: 0 };

    case "UNCLEAR":
    default:
      return { worker: "HUMAN", action: "REVIEW", priority_boost: 0 };
  }
}

/**
 * Quick check if message is an opt-out
 * Use this for immediate TCPA compliance
 */
export function isOptOut(message: string): boolean {
  return PATTERNS.OPT_OUT.test(message);
}

/**
 * Quick check if message contains an email
 */
export function hasEmail(message: string): string | null {
  const match = message.match(PATTERNS.EMAIL);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Quick check if lead wants a call
 */
export function wantsCall(message: string): boolean {
  return PATTERNS.WANTS_CALL.test(message) || PATTERNS.INTERESTED.test(message);
}

// =============================================================================
// EXPORTS
// =============================================================================

export const compoundClassifier = {
  classifyResponse,
  isOptOut,
  hasEmail,
  wantsCall,
};

export default compoundClassifier;
