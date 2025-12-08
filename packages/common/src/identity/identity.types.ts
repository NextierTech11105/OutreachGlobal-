/**
 * Identity Types
 * Core types for identity matching and merging
 */

export interface IdentityRecord {
  id: string;
  sourceType: 'business' | 'property' | 'consumer' | 'skiptrace' | 'apollo';
  sourceId: string;

  // Name
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;

  // Phones
  phones: IdentityPhone[];

  // Emails
  emails: IdentityEmail[];

  // Addresses
  addresses: IdentityAddress[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface IdentityPhone {
  number: string;
  type: 'mobile' | 'landline' | 'voip' | 'unknown';
  isPrimary: boolean;
  source: string;
}

export interface IdentityEmail {
  address: string;
  type: 'personal' | 'business' | 'unknown';
  isPrimary: boolean;
  source: string;
}

export interface IdentityAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  type: 'residential' | 'commercial' | 'mailing' | 'unknown';
  isCurrent: boolean;
  source: string;
}

export interface IdentityMatchResult {
  sourceId: string;
  targetId: string;
  overallScore: number;
  shouldMerge: boolean;
  matchDetails: MatchDetail[];
  confidence: 'high' | 'medium' | 'low';
}

export interface MatchDetail {
  field: string;
  sourceValue: string;
  targetValue: string;
  score: number;
  matchType: 'exact' | 'fuzzy' | 'partial' | 'phonetic' | 'none';
  weight: number;
}

export interface MergedIdentity {
  id: string;
  mergedFromIds: string[];

  // Best values selected
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;

  // All phones (deduplicated)
  phones: IdentityPhone[];

  // All emails (deduplicated)
  emails: IdentityEmail[];

  // All addresses (deduplicated)
  addresses: IdentityAddress[];

  // Confidence in the merge
  confidenceScore: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface IdentityMergeConfig {
  // Thresholds
  minMatchScore: number; // Minimum score to consider a match
  autoMergeThreshold: number; // Score above which to auto-merge
  reviewThreshold: number; // Score requiring manual review

  // Field weights
  weights: {
    phone: number;
    email: number;
    address: number;
    name: number;
  };

  // Match settings
  fuzzyNameThreshold: number;
  phoneExactMatch: boolean;
  emailExactMatch: boolean;
  addressFuzzyThreshold: number;
}

export const DEFAULT_MERGE_CONFIG: IdentityMergeConfig = {
  minMatchScore: 0.5,
  autoMergeThreshold: 0.85,
  reviewThreshold: 0.65,
  weights: {
    phone: 0.35,
    email: 0.30,
    address: 0.20,
    name: 0.15
  },
  fuzzyNameThreshold: 0.8,
  phoneExactMatch: true,
  emailExactMatch: true,
  addressFuzzyThreshold: 0.75
};
