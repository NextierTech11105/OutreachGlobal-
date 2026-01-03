/**
 * Template Validator
 *
 * Validates SMS templates against 10DLC compliance rules.
 * Rules are lane-specific - cold outreach has stricter requirements.
 *
 * @see docs/SIGNALHOUSE_TECHNICAL_INTEGRATION.md
 */

import { CampaignLane } from './phone-campaign-map';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    charCount: number;
    segmentCount: number;
    hasQuestion: boolean;
    hasSenderID: boolean;
  };
}

/**
 * Words that trigger promotional language violations
 * These will cause carrier filtering/rejection
 */
const BLOCKED_PROMOTIONAL_WORDS = [
  'FREE',
  'ACT NOW',
  'LIMITED TIME',
  'OFFER',
  'DISCOUNT',
  'SALE',
  'BUY NOW',
  'ORDER NOW',
  'CLICK HERE',
  'EXCLUSIVE DEAL',
  'SPECIAL OFFER',
  'WIN',
  'WINNER',
  'CASH',
  'PRIZE',
  'URGENT',
  'EXPIRES',
  'TODAY ONLY',
  'LAST CHANCE',
  'DON\'T MISS',
  'CALL NOW',
];

/**
 * Sender identification patterns
 * Cold outreach must identify who's sending
 */
const SENDER_ID_PATTERNS = [
  /gianna/i,
  /nextier/i,
  /it's \w+ from/i,
  /this is \w+ from/i,
  /\w+ here from/i,
  /\w+ with nextier/i,
  /\w+ from nextier/i,
];

/**
 * Calculate SMS segment count
 * Standard SMS: 160 chars (GSM-7) or 70 chars (Unicode)
 */
function calculateSegments(message: string): number {
  // Check if message contains non-GSM characters
  const hasUnicode = /[^\x00-\x7F]/.test(message);
  const segmentSize = hasUnicode ? 70 : 160;

  if (message.length <= segmentSize) {
    return 1;
  }

  // Multi-segment uses smaller chunks due to UDH header
  const multiSegmentSize = hasUnicode ? 67 : 153;
  return Math.ceil(message.length / multiSegmentSize);
}

/**
 * Check if message contains sender identification
 */
function hasSenderIdentification(message: string): boolean {
  return SENDER_ID_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Check for promotional language violations
 */
function findPromotionalLanguage(message: string): string[] {
  const found: string[] = [];
  const upperMessage = message.toUpperCase();

  for (const word of BLOCKED_PROMOTIONAL_WORDS) {
    if (upperMessage.includes(word.toUpperCase())) {
      found.push(word);
    }
  }

  return found;
}

/**
 * Validate a message template against lane-specific 10DLC rules
 *
 * Rules vary by lane:
 * - cold_outreach: Stricter - must ID sender, ask permission, single segment
 * - engaged_leads: More flexible - conversation already established
 */
export function validateForLane(
  message: string,
  lane: CampaignLane
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const charCount = message.length;
  const segmentCount = calculateSegments(message);
  const hasQuestion = message.includes('?');
  const hasSenderID = hasSenderIdentification(message);

  // Rule 1: Character limit (single segment preferred)
  if (charCount > 160) {
    if (lane === 'cold_outreach') {
      errors.push(`Exceeds 160 chars (${charCount}). Cold outreach must be single segment.`);
    } else {
      warnings.push(`Message is ${charCount} chars (${segmentCount} segments). Consider shortening.`);
    }
  }

  // Rule 2: No promotional language (applies to both lanes)
  const promoWords = findPromotionalLanguage(message);
  if (promoWords.length > 0) {
    errors.push(`Contains promotional language: "${promoWords.join('", "')}"`);
  }

  // Rule 3: Sender identification (cold outreach requirement)
  if (lane === 'cold_outreach' && !hasSenderID) {
    errors.push('Missing sender identification. Cold outreach must identify who is messaging.');
  }

  // Rule 4: Permission-based phrasing (cold outreach should ask)
  if (lane === 'cold_outreach' && !hasQuestion) {
    warnings.push('Cold outreach should ask a question to seek permission.');
  }

  // Rule 5: Check for opt-out in first message (not needed - handled at campaign level)
  // But warn if someone tries to include it
  if (lane === 'cold_outreach') {
    const hasOptOut = /reply stop|text stop|opt.?out/i.test(message);
    if (hasOptOut) {
      warnings.push('Opt-out handled at campaign level. Remove from message to save chars.');
    }
  }

  // Rule 6: Check for multiple questions (can be confusing)
  const questionCount = (message.match(/\?/g) || []).length;
  if (questionCount > 1) {
    warnings.push('Multiple questions in one message. Consider simplifying.');
  }

  // Rule 7: Check for ALL CAPS (looks spammy)
  const capsWords = message.match(/\b[A-Z]{3,}\b/g) || [];
  const nonAcronymCaps = capsWords.filter(word => !['SMS', 'CEO', 'USA', 'LLC', 'INC'].includes(word));
  if (nonAcronymCaps.length > 0) {
    warnings.push(`ALL CAPS words detected: "${nonAcronymCaps.join('", "')}". May look spammy.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      charCount,
      segmentCount,
      hasQuestion,
      hasSenderID,
    },
  };
}

/**
 * Validate a batch of templates
 * Returns summary of valid/invalid templates
 */
export function validateTemplates(
  templates: string[],
  lane: CampaignLane
): { valid: string[]; invalid: Array<{ template: string; errors: string[] }> } {
  const valid: string[] = [];
  const invalid: Array<{ template: string; errors: string[] }> = [];

  for (const template of templates) {
    const result = validateForLane(template, lane);
    if (result.valid) {
      valid.push(template);
    } else {
      invalid.push({ template, errors: result.errors });
    }
  }

  return { valid, invalid };
}

/**
 * Quick check if message is compliant (no detailed report)
 */
export function isCompliant(message: string, lane: CampaignLane): boolean {
  return validateForLane(message, lane).valid;
}
