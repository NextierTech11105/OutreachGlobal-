/**
 * Lead ID Generation
 * Format: NXT-{sic_code}-{uuid6}
 *
 * Examples:
 *   NXT-8742-a3f9b2
 *   NXT-1711-c7e4d1
 *   NXT-6531-b2a8f6
 */

import { randomUUID } from "crypto";

/**
 * Generate a NEXTIER lead ID
 */
export function generateLeadId(sicCode: string): string {
  const uuid6 = randomUUID().substring(0, 6);
  return `NXT-${sicCode}-${uuid6}`;
}

/**
 * Parse a lead ID into components
 */
export function parseLeadId(leadId: string): {
  prefix: string;
  sicCode: string;
  uuid: string;
} | null {
  const match = leadId.match(/^(NXT)-(\d+)-([a-f0-9]+)$/i);
  if (!match) return null;

  return {
    prefix: match[1],
    sicCode: match[2],
    uuid: match[3],
  };
}

/**
 * Validate a lead ID format
 */
export function isValidLeadId(leadId: string): boolean {
  return /^NXT-\d+-[a-f0-9]{6}$/i.test(leadId);
}

/**
 * SIC code to sector tag mapping
 */
export const SIC_TO_SECTOR: Record<string, string> = {
  "8742": "business-management-consulting",
  "8748": "business-consulting-nec",
  "1711": "plumbing-hvac",
  "6531": "realtors",
  "5812": "restaurants",
  "7011": "hotels-motels",
  "8011": "medical-offices",
  "8021": "dental-offices",
  "7231": "beauty-salons",
  "7532": "auto-body-repair",
  "7538": "auto-repair-shops",
};

/**
 * Get sector tag from SIC code
 */
export function getSectorTag(sicCode: string): string {
  return SIC_TO_SECTOR[sicCode] || `sic-${sicCode}`;
}
