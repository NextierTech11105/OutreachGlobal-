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

export type CampaignLane = "cold_outreach" | "engaged_leads";
export type CampaignUseCase = "LOW_VOLUME" | "LOW_VOLUME_MIXED" | "CONVERSATIONAL";
export type WorkerType = "GIANNA" | "CATHY" | "SABRINA" | "NEVA";

export interface CarrierStatus {
  carrier: string;
  qualify: boolean;
  registered: boolean;
  tpm?: number;
  tier?: string;
  dailyCap?: boolean;
}

export interface PhoneCampaignConfig {
  phoneNumber: string; // E.164 format (digits only)
  campaignId: string; // SignalHouse/TCR campaign ID
  brandId: string; // SignalHouse brand ID
  brandName: string; // Human-readable brand name
  groupId: string; // SignalHouse group ID
  subgroupId: string; // SignalHouse subgroup ID
  lane: CampaignLane;
  useCase: CampaignUseCase;
  allowedWorkers: WorkerType[];
  tpmLimit: number; // Transactions per minute (AT&T limit)
  mmsTPM: number; // MMS transactions per minute
  dailyLimit: number; // Internal daily cap
  description: string; // Human-readable description

  // Registration details
  registeredOn: string;
  expirationDate: string;
  tcrStatus: "Active" | "Pending" | "Expired";
  autoRenewal: boolean;

  // Carrier statuses
  carriers: CarrierStatus[];

  // Sample messages (TCR approved)
  sampleMessages: string[];

  // Compliance URLs
  privacyPolicyUrl: string;
  termsUrl: string;
  websiteUrl: string;
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
  // ═══════════════════════════════════════════════════════════════════════════════
  // LANE A: COLD OUTREACH (LOW_VOLUME) - TCR APPROVED 01/06/2026
  // ═══════════════════════════════════════════════════════════════════════════════
  "15164079249": {
    phoneNumber: "15164079249",
    campaignId: "CJRCU60",
    brandId: "BZOYPIH",
    brandName: "NEXTIER",
    groupId: "GM7CEB",
    subgroupId: "S7ZI7S",
    lane: "cold_outreach",
    useCase: "LOW_VOLUME",
    allowedWorkers: ["GIANNA"],
    tpmLimit: 75, // AT&T SMS TPM
    mmsTPM: 50, // AT&T MMS TPM
    dailyLimit: 2000, // Internal cap (T-Mobile has Brand Daily Cap)
    description: "NEXTIER cold outreach - lead gen for Plumbing/HVAC, Trucking, ECBB seller leads",

    // Registration
    registeredOn: "2026-01-06T17:35:10Z",
    expirationDate: "2026-04-06",
    tcrStatus: "Active",
    autoRenewal: true,

    // Carrier statuses (all REGISTERED)
    carriers: [
      { carrier: "AT&T", qualify: true, registered: true, tpm: 75, tier: "T" },
      { carrier: "T-Mobile", qualify: true, registered: true, tier: "LOW", dailyCap: true },
      { carrier: "Verizon", qualify: true, registered: true },
      { carrier: "US Cellular", qualify: true, registered: true },
      { carrier: "ClearSky", qualify: true, registered: true },
      { carrier: "Interop", qualify: true, registered: true },
    ],

    // TCR-approved sample messages
    sampleMessages: [
      "We think you'll love our new release, let's book a call and discuss soon! Respond STOP to opt out from NEXTIER",
      "We're here to save you time AND money. Let me know when you're free for a quick call. Respond STOP to opt out from NEXTIER",
    ],

    // Compliance URLs
    privacyPolicyUrl: "https://nextier.signalhouse.io/intake/LDZH8OR/privacy-policy",
    termsUrl: "https://nextier.signalhouse.io/intake/LDZH8OR/terms-service",
    websiteUrl: "https://nextier.signalhouse.io/intake/LDZH8OR",
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // LANE B: ENGAGED LEADS (CONVERSATIONAL) - Add new numbers here
  // ═══════════════════════════════════════════════════════════════════════════════
  // Register a new campaign for engaged leads with CONVERSATIONAL use-case
  // This allows CATHY and SABRINA to handle two-way dialogue
};

/**
 * Normalize phone number to consistent format
 * Strips all non-digit characters and takes last 10 digits (US format)
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Handle +1 prefix
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits;
  }
  // Handle 10-digit
  if (digits.length === 10) {
    return "1" + digits;
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
  return Object.values(PHONE_CAMPAIGN_MAP).filter(
    (config) => config.lane === lane,
  );
}

/**
 * Get all phone numbers a worker can use
 */
export function getPhonesForWorker(worker: WorkerType): PhoneCampaignConfig[] {
  return Object.values(PHONE_CAMPAIGN_MAP).filter((config) =>
    config.allowedWorkers.includes(worker),
  );
}

/**
 * Check if a worker is allowed to send from a phone number
 */
export function isWorkerAllowedOnPhone(
  phone: string,
  worker: WorkerType,
): boolean {
  const config = getConfigForPhone(phone);
  return config !== null && config.allowedWorkers.includes(worker);
}
