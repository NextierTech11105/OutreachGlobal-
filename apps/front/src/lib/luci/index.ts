/**
 * LUCI - Data Authority & Compliance Gatekeeper
 *
 * LUCI is the ONLY source of truth for:
 * - Lead contactability
 * - Compliance status
 * - Campaign readiness
 *
 * NEVA (Research Copilot) may NEVER override LUCI.
 */

export * from "./types";
export * from "./constants";
export { luciService, LUCI, default } from "./service";
export { trestleClient, verifyPhone, verifyContact, batchVerifyPhones } from "./trestle-client";
