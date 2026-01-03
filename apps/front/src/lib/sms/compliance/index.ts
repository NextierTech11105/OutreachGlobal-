/**
 * SMS Compliance Layer
 *
 * Agnostic compliance module that maps directly to SignalHouse's backend.
 * Phone number determines campaign, lane, and template rules.
 *
 * Usage:
 * ```typescript
 * import { checkComplianceBeforeSend } from '@/lib/sms/compliance';
 *
 * const result = checkComplianceBeforeSend(fromPhone, message, worker);
 * if (!result.allowed) {
 *   console.error('Blocked:', result.reason);
 *   return;
 * }
 *
 * // Safe to send via SignalHouse
 * await signalHouse.sendSMS({ to, from: fromPhone, message, tags: result.tags });
 * ```
 *
 * @see docs/SIGNALHOUSE_TECHNICAL_INTEGRATION.md
 * @see docs/SIGNALHOUSE_INTEGRATION_DIAGRAM.md
 */

// Phone → Campaign mapping
export {
  PHONE_CAMPAIGN_MAP,
  getConfigForPhone,
  getPhonesForLane,
  getPhonesForWorker,
  isWorkerAllowedOnPhone,
  normalizePhone,
  type CampaignLane,
  type CampaignUseCase,
  type PhoneCampaignConfig,
  type WorkerType,
} from './phone-campaign-map';

// Template validation
export {
  validateForLane,
  validateTemplates,
  isCompliant,
  type ValidationResult,
} from './template-validator';

// Pre-send compliance check (main entry point)
export {
  checkComplianceBeforeSend,
  checkComplianceBatch,
  getPhoneForWorker,
  logComplianceFailure,
  type ComplianceCheckResult,
  type BatchCheckItem,
  type BatchCheckResult,
} from './pre-send-check';
