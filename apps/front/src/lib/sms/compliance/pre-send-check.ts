/**
 * Pre-Send Compliance Check
 *
 * This is the main entry point for compliance validation.
 * Call this BEFORE sending any SMS via SignalHouse API.
 *
 * The check validates:
 * 1. Phone number is mapped to a campaign
 * 2. Worker is allowed on this phone/lane
 * 3. Message content passes template validation
 *
 * @see docs/SIGNALHOUSE_TECHNICAL_INTEGRATION.md
 */

import {
  getConfigForPhone,
  PhoneCampaignConfig,
  WorkerType,
  CampaignLane,
} from "./phone-campaign-map";
import { validateForLane, ValidationResult } from "./template-validator";

export interface ComplianceCheckResult {
  allowed: boolean;
  reason?: string;
  config?: PhoneCampaignConfig;
  validation?: ValidationResult;
  tags?: string[]; // Tags to attach to SignalHouse request
}

/**
 * Check compliance before sending an SMS
 *
 * This should be called before every sendSMS request to SignalHouse.
 * If allowed=false, do NOT send the message - log and skip.
 *
 * @param fromPhone - The phone number to send from (E.164 or digits)
 * @param message - The message content to send
 * @param worker - The AI worker sending the message (GIANNA, CATHY, etc.)
 * @returns ComplianceCheckResult with allowed status and details
 */
export function checkComplianceBeforeSend(
  fromPhone: string,
  message: string,
  worker: string,
): ComplianceCheckResult {
  // 1. Get campaign config for this phone
  const config = getConfigForPhone(fromPhone);
  if (!config) {
    return {
      allowed: false,
      reason: `Phone ${fromPhone} not mapped to any campaign. Add to PHONE_CAMPAIGN_MAP.`,
    };
  }

  // 2. Check if worker is allowed on this phone/lane
  const workerType = worker.toUpperCase() as WorkerType;
  if (!config.allowedWorkers.includes(workerType)) {
    return {
      allowed: false,
      reason: `Worker ${worker} not allowed on lane ${config.lane}. Allowed: ${config.allowedWorkers.join(", ")}`,
      config,
    };
  }

  // 3. Validate message content for this lane
  const validation = validateForLane(message, config.lane);
  if (!validation.valid) {
    return {
      allowed: false,
      reason: validation.errors.join("; "),
      config,
      validation,
    };
  }

  // 4. All checks passed - generate tags for tracking
  const tags = [
    `lane:${config.lane}`,
    `worker:${workerType.toLowerCase()}`,
    `campaign:${config.campaignId}`,
    `use_case:${config.useCase}`,
  ];

  return {
    allowed: true,
    config,
    validation,
    tags,
  };
}

/**
 * Batch compliance check for multiple messages
 * Useful for pre-validating a batch before processing
 */
export interface BatchCheckItem {
  fromPhone: string;
  message: string;
  worker: string;
  leadId?: string;
}

export interface BatchCheckResult {
  passed: BatchCheckItem[];
  failed: Array<{ item: BatchCheckItem; reason: string }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
}

export function checkComplianceBatch(
  items: BatchCheckItem[],
): BatchCheckResult {
  const passed: BatchCheckItem[] = [];
  const failed: Array<{ item: BatchCheckItem; reason: string }> = [];

  for (const item of items) {
    const result = checkComplianceBeforeSend(
      item.fromPhone,
      item.message,
      item.worker,
    );
    if (result.allowed) {
      passed.push(item);
    } else {
      failed.push({ item, reason: result.reason || "Unknown error" });
    }
  }

  return {
    passed,
    failed,
    summary: {
      total: items.length,
      passed: passed.length,
      failed: failed.length,
      passRate: items.length > 0 ? (passed.length / items.length) * 100 : 0,
    },
  };
}

/**
 * Get the correct phone number to use for a worker
 * Returns the first available phone the worker can use
 */
export function getPhoneForWorker(worker: string): string | null {
  const workerType = worker.toUpperCase() as WorkerType;

  // Import inline to avoid circular deps
  const { getPhonesForWorker } = require("./phone-campaign-map");
  const phones = getPhonesForWorker(workerType);

  return phones.length > 0 ? phones[0].phoneNumber : null;
}

/**
 * Log compliance failures for monitoring/debugging
 */
export function logComplianceFailure(
  result: ComplianceCheckResult,
  context: {
    fromPhone: string;
    message: string;
    worker: string;
    leadId?: string;
  },
): void {
  console.error("[SMS Compliance] BLOCKED", {
    reason: result.reason,
    phone: context.fromPhone,
    worker: context.worker,
    leadId: context.leadId,
    messagePreview: context.message.substring(0, 50) + "...",
    validation: result.validation?.errors,
    timestamp: new Date().toISOString(),
  });
}
