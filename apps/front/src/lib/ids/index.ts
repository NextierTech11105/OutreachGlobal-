/**
 * OUTREACH GLOBAL ID SYSTEM
 *
 * Foundation: ULID with Semantic Prefixes
 * Format: {prefix}_{ulid}
 *
 * CORE PRINCIPLE: An ID is earned when you spend money on a record.
 * - No ID = Raw data, unverified, worthless until proven
 * - Has ID = Money spent, verified, trackable
 */

import { ulid } from 'ulid';

// ============================================================================
// ID PREFIXES - Complete Entity Registry
// ============================================================================

export const ID_PREFIXES = {
  // ─────────────────────────────────────────────────────────────────────────
  // CORE IDENTITY LAYER
  // ─────────────────────────────────────────────────────────────────────────
  user: 'user',           // Platform users
  team: 'team',           // Organizations/teams
  persona: 'persona',     // Unified contact identity (qualified lead)

  // ─────────────────────────────────────────────────────────────────────────
  // CAMPAIGN LAYER
  // ─────────────────────────────────────────────────────────────────────────
  campaign: 'camp',       // Parent omni-channel campaign
  calendar: 'cal',        // Calling campaign type
  sequence: 'seq',        // Scheduled SMS type
  blast: 'blt',           // Instant SMS type
  retarget: 'rt',         // Retarget NC campaign

  // ─────────────────────────────────────────────────────────────────────────
  // EXECUTION LAYER
  // ─────────────────────────────────────────────────────────────────────────
  touch: 'tch',           // Individual outbound attempt
  response: 'res',        // Inbound response
  conversation: 'conv',   // Threaded response chain
  nudge: 'ndg',           // Contextual retarget message

  // ─────────────────────────────────────────────────────────────────────────
  // COMMUNICATION LAYER
  // ─────────────────────────────────────────────────────────────────────────
  message: 'msg',         // SMS/Email content (rendered)
  template: 'tpl',        // Reusable message template
  lane: 'lane',           // Signalhouse number allocation

  // ─────────────────────────────────────────────────────────────────────────
  // AI/AGENT LAYER
  // ─────────────────────────────────────────────────────────────────────────
  sdr: 'sdr',             // Gianna, LUCI, Cathy configs
  prompt: 'prmt',         // AI prompt templates
  action: 'act',          // Gianna action taken

  // ─────────────────────────────────────────────────────────────────────────
  // ENRICHMENT LAYER
  // ─────────────────────────────────────────────────────────────────────────
  skipTraceJob: 'stj',    // Batch enrichment job
  skipTraceResult: 'str', // Individual enrichment result
  phone: 'ph',            // Enriched phone number
  email: 'em',            // Enriched email

  // ─────────────────────────────────────────────────────────────────────────
  // DATA LAYER
  // ─────────────────────────────────────────────────────────────────────────
  property: 'prop',       // Real estate property
  bucket: 'bkt',          // Saved search / export bucket
  sector: 'sec',          // Industry vertical classification

  // ─────────────────────────────────────────────────────────────────────────
  // SYSTEM LAYER
  // ─────────────────────────────────────────────────────────────────────────
  webhook: 'whk',         // Inbound webhook event
  audit: 'aud',           // Compliance/change tracking
  job: 'job',             // Background job
} as const;

// ============================================================================
// TYPES
// ============================================================================

export type IDPrefix = typeof ID_PREFIXES[keyof typeof ID_PREFIXES];
export type IDPrefixKey = keyof typeof ID_PREFIXES;

// Branded types for type-safe ID handling
export type PersonaID = `persona_${string}`;
export type CampaignID = `camp_${string}`;
export type TouchID = `tch_${string}`;
export type ResponseID = `res_${string}`;
export type MessageID = `msg_${string}`;
export type TemplateID = `tpl_${string}`;
export type LaneID = `lane_${string}`;
export type PhoneID = `ph_${string}`;
export type EmailID = `em_${string}`;
export type SkipTraceJobID = `stj_${string}`;
export type CalendarID = `cal_${string}`;
export type SequenceID = `seq_${string}`;
export type BlastID = `blt_${string}`;
export type RetargetID = `rt_${string}`;
export type TeamID = `team_${string}`;
export type UserID = `user_${string}`;

// Union type for campaign type IDs
export type CampaignTypeID = CalendarID | SequenceID | BlastID | RetargetID;

// Generic ID type
export type OutreachID = `${IDPrefix}_${string}`;

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Creates a new ID with the specified prefix
 * @param prefix - The semantic prefix for the entity type
 * @returns A unique ID in format: {prefix}_{ulid}
 *
 * @example
 * createId('persona') // → "persona_01HX7KDEF..."
 * createId('tch')     // → "tch_01HX7KV01..."
 */
export function createId<T extends IDPrefix>(prefix: T): `${T}_${string}` {
  return `${prefix}_${ulid()}` as `${T}_${string}`;
}

/**
 * Creates a new ID using the key name from ID_PREFIXES
 * @param key - The key from ID_PREFIXES
 * @returns A unique ID
 *
 * @example
 * createIdByKey('persona')      // → "persona_01HX7K..."
 * createIdByKey('skipTraceJob') // → "stj_01HX7K..."
 */
export function createIdByKey(key: IDPrefixKey): OutreachID {
  return createId(ID_PREFIXES[key]);
}

// ============================================================================
// ID VALIDATION & PARSING
// ============================================================================

/**
 * Validates if a string is a valid Outreach ID
 * @param id - The string to validate
 * @returns true if valid Outreach ID format
 */
export function isValidId(id: string): id is OutreachID {
  const parts = id.split('_');
  if (parts.length !== 2) return false;

  const [prefix, ulidPart] = parts;
  const validPrefixes = Object.values(ID_PREFIXES);

  if (!validPrefixes.includes(prefix as IDPrefix)) return false;
  if (ulidPart.length !== 26) return false;

  return true;
}

/**
 * Extracts the prefix from an Outreach ID
 * @param id - The Outreach ID
 * @returns The prefix portion
 */
export function getPrefix(id: OutreachID): IDPrefix {
  return id.split('_')[0] as IDPrefix;
}

/**
 * Extracts the ULID portion from an Outreach ID
 * @param id - The Outreach ID
 * @returns The ULID portion (26 chars)
 */
export function getUlid(id: OutreachID): string {
  return id.split('_')[1];
}

/**
 * Gets the timestamp from an Outreach ID (ULID encodes time)
 * @param id - The Outreach ID
 * @returns Date object representing when the ID was created
 */
export function getTimestamp(id: OutreachID): Date {
  const ulidPart = getUlid(id);
  // ULID timestamp is first 10 characters, base32 encoded
  const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let timestamp = 0;
  for (let i = 0; i < 10; i++) {
    timestamp = timestamp * 32 + ENCODING.indexOf(ulidPart[i].toUpperCase());
  }
  return new Date(timestamp);
}

/**
 * Checks if an ID is of a specific type
 */
export function isPersonaId(id: string): id is PersonaID {
  return id.startsWith('persona_') && isValidId(id);
}

export function isCampaignId(id: string): id is CampaignID {
  return id.startsWith('camp_') && isValidId(id);
}

export function isTouchId(id: string): id is TouchID {
  return id.startsWith('tch_') && isValidId(id);
}

export function isResponseId(id: string): id is ResponseID {
  return id.startsWith('res_') && isValidId(id);
}

export function isCampaignTypeId(id: string): id is CampaignTypeID {
  return (
    id.startsWith('cal_') ||
    id.startsWith('seq_') ||
    id.startsWith('blt_') ||
    id.startsWith('rt_')
  ) && isValidId(id);
}

// ============================================================================
// ID FACTORY - Convenience Functions
// ============================================================================

export const ids = {
  // Core
  user: () => createId(ID_PREFIXES.user),
  team: () => createId(ID_PREFIXES.team),
  persona: () => createId(ID_PREFIXES.persona),

  // Campaign
  campaign: () => createId(ID_PREFIXES.campaign),
  calendar: () => createId(ID_PREFIXES.calendar),
  sequence: () => createId(ID_PREFIXES.sequence),
  blast: () => createId(ID_PREFIXES.blast),
  retarget: () => createId(ID_PREFIXES.retarget),

  // Execution
  touch: () => createId(ID_PREFIXES.touch),
  response: () => createId(ID_PREFIXES.response),
  conversation: () => createId(ID_PREFIXES.conversation),
  nudge: () => createId(ID_PREFIXES.nudge),

  // Communication
  message: () => createId(ID_PREFIXES.message),
  template: () => createId(ID_PREFIXES.template),
  lane: () => createId(ID_PREFIXES.lane),

  // AI
  sdr: () => createId(ID_PREFIXES.sdr),
  prompt: () => createId(ID_PREFIXES.prompt),
  action: () => createId(ID_PREFIXES.action),

  // Enrichment
  skipTraceJob: () => createId(ID_PREFIXES.skipTraceJob),
  skipTraceResult: () => createId(ID_PREFIXES.skipTraceResult),
  phone: () => createId(ID_PREFIXES.phone),
  email: () => createId(ID_PREFIXES.email),

  // Data
  property: () => createId(ID_PREFIXES.property),
  bucket: () => createId(ID_PREFIXES.bucket),
  sector: () => createId(ID_PREFIXES.sector),

  // System
  webhook: () => createId(ID_PREFIXES.webhook),
  audit: () => createId(ID_PREFIXES.audit),
  job: () => createId(ID_PREFIXES.job),
} as const;

// ============================================================================
// QUALIFICATION RULES
// ============================================================================

/**
 * Requirements to qualify for a persona ID (lead promotion)
 */
export interface QualificationRequirements {
  fullName: boolean;
  fullAddress: boolean;
  mobilePhone: boolean;
  mainLineIdentified: boolean;
}

/**
 * Checks if a record qualifies for persona ID creation
 */
export function meetsPersonaQualification(requirements: QualificationRequirements): boolean {
  return (
    requirements.fullName &&
    requirements.fullAddress &&
    requirements.mobilePhone &&
    requirements.mainLineIdentified
  );
}

/**
 * Creates a persona ID only if qualification requirements are met
 * @throws Error if requirements not met
 */
export function createQualifiedPersonaId(requirements: QualificationRequirements): PersonaID {
  if (!meetsPersonaQualification(requirements)) {
    throw new Error(
      'Record does not meet persona qualification requirements. ' +
      'Required: full name, full address, mobile phone with main line identified.'
    );
  }
  return ids.persona() as PersonaID;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  ID_PREFIXES,
  createId,
  createIdByKey,
  isValidId,
  getPrefix,
  getUlid,
  getTimestamp,
  ids,
  meetsPersonaQualification,
  createQualifiedPersonaId,
};
