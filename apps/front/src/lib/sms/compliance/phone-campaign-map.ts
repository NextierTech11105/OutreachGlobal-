/**
 * Phone → Campaign Mapping
 *
 * Maps phone numbers directly to SignalHouse campaign configurations.
 * This is our compliance layer - phone number determines everything:
 * - Which SignalHouse campaign to use
 * - Which lane (cold_outreach vs engaged_leads)
 * - Which workers can send from this number
 * - Rate limits and use case rules
 *
 * @see docs/SIGNALHOUSE_TECHNICAL_INTEGRATION.md
 */

export type CampaignLane = 'cold_outreach' | 'engaged_leads';
export type CampaignUseCase = 'LOW_VOLUME_MIXED' | 'CONVERSATIONAL';
export type WorkerType = 'GIANNA' | 'CATHY' | 'SABRINA' | 'NEVA';

export interface PhoneCampaignConfig {
  phoneNumber: string;           // E.164 format (digits only)
  campaignId: string;            // SignalHouse campaign ID
  brandId: string;               // SignalHouse brand ID
  lane: CampaignLane;
  useCase: CampaignUseCase;
  allowedWorkers: WorkerType[];
  tpmLimit: number;              // Transactions per minute (carrier limit)
  dailyLimit: number;            // Internal daily cap
  description: string;           // Human-readable description
}

/**
 * Phone → Campaign Configuration Map
 *
 * Each phone number is assigned to ONE campaign.
 * The campaign determines the lane, use case, and allowed workers.
 *
 * To add a new phone number:
 * 1. Create/get campaign ID from SignalHouse
 * 2. Add entry to this map
 * 3. Configure phone in SignalHouse to use the campaign
 */
export const PHONE_CAMPAIGN_MAP: Record<string, PhoneCampaignConfig> = {
  // Lane A: Cold Outreach (Low Volume Mixed)
  '15164079249': {
    phoneNumber: '15164079249',
    campaignId: 'NEW_CAMPAIGN_ID',    // Update after new campaign approved
    brandId: 'BZOYPIH',
    lane: 'cold_outreach',
    useCase: 'LOW_VOLUME_MIXED',
    allowedWorkers: ['GIANNA'],
    tpmLimit: 75,                      // AT&T limit for Low Volume
    dailyLimit: 2000,
    description: 'NEXTIER cold outreach - permission-seeking openers',
  },

  // Lane B: Engaged Leads (Conversational) - Add new numbers here
  // '15551234567': {
  //   phoneNumber: '15551234567',
  //   campaignId: 'CONV_CAMPAIGN_ID',
  //   brandId: 'BZOYPIH',
  //   lane: 'engaged_leads',
  //   useCase: 'CONVERSATIONAL',
  //   allowedWorkers: ['CATHY', 'SABRINA'],
  //   tpmLimit: 75,
  //   dailyLimit: 5000,
  //   description: 'NEXTIER engaged leads - two-way dialogue',
  // },
};

/**
 * Normalize phone number to consistent format
 * Strips all non-digit characters and takes last 10 digits (US format)
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Handle +1 prefix
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits;
  }
  // Handle 10-digit
  if (digits.length === 10) {
    return '1' + digits;
  }
  return digits;
}

/**
 * Get campaign configuration for a phone number
 * Returns null if phone is not mapped to any campaign
 */
export function getConfigForPhone(phone: string): PhoneCampaignConfig | null {
  const normalized = normalizePhone(phone);
  return PHONE_CAMPAIGN_MAP[normalized] || null;
}

/**
 * Get all phone numbers for a specific lane
 */
export function getPhonesForLane(lane: CampaignLane): PhoneCampaignConfig[] {
  return Object.values(PHONE_CAMPAIGN_MAP).filter(config => config.lane === lane);
}

/**
 * Get all phone numbers a worker can use
 */
export function getPhonesForWorker(worker: WorkerType): PhoneCampaignConfig[] {
  return Object.values(PHONE_CAMPAIGN_MAP).filter(
    config => config.allowedWorkers.includes(worker)
  );
}

/**
 * Check if a worker is allowed to send from a phone number
 */
export function isWorkerAllowedOnPhone(phone: string, worker: WorkerType): boolean {
  const config = getConfigForPhone(phone);
  return config !== null && config.allowedWorkers.includes(worker);
}
