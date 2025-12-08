/**
 * Identity Normalizer
 * Normalizes names, phones, emails, and addresses for matching
 */

import {
  NAME_PREFIXES,
  NAME_SUFFIXES,
  NICKNAME_MAP,
  ADDRESS_ABBREVIATIONS,
  STATE_ABBREVIATIONS,
  PHONE_COUNTRY_CODES,
  INVALID_PHONE_PATTERNS,
  INVALID_EMAIL_PATTERNS,
  CORPORATE_SUFFIXES,
  TRUST_INDICATORS,
  ESTATE_INDICATORS
} from './identity.constants';

// ============================================
// NAME NORMALIZATION
// ============================================

export interface NormalizedName {
  original: string;
  normalized: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  prefix?: string;
  isCorporate: boolean;
  isTrust: boolean;
  isEstate: boolean;
}

export function normalizeName(fullName: string): NormalizedName {
  const original = fullName;
  let name = fullName.toLowerCase().trim();

  // Check for corporate/trust/estate
  const isCorporate = CORPORATE_SUFFIXES.some(s => name.includes(s));
  const isTrust = TRUST_INDICATORS.some(t => name.includes(t));
  const isEstate = ESTATE_INDICATORS.some(e => name.includes(e));

  // Remove extra whitespace
  name = name.replace(/\s+/g, ' ');

  // Extract and remove prefix
  let prefix: string | undefined;
  for (const p of NAME_PREFIXES) {
    const prefixPattern = new RegExp(`^${p}\\.?\\s+`, 'i');
    if (prefixPattern.test(name)) {
      prefix = p;
      name = name.replace(prefixPattern, '');
      break;
    }
  }

  // Extract and remove suffix
  let suffix: string | undefined;
  for (const s of NAME_SUFFIXES) {
    const suffixPattern = new RegExp(`\\s+${s}\\.?$`, 'i');
    if (suffixPattern.test(name)) {
      suffix = s;
      name = name.replace(suffixPattern, '');
      break;
    }
  }

  // Split into parts
  const parts = name.split(' ').filter(p => p.length > 0);

  let firstName = '';
  let lastName = '';
  let middleName: string | undefined;

  if (parts.length === 1) {
    // Single name - treat as last name
    lastName = parts[0];
  } else if (parts.length === 2) {
    firstName = parts[0];
    lastName = parts[1];
  } else if (parts.length >= 3) {
    firstName = parts[0];
    lastName = parts[parts.length - 1];
    middleName = parts.slice(1, -1).join(' ');
  }

  // Remove punctuation from names
  firstName = firstName.replace(/[^a-z]/g, '');
  lastName = lastName.replace(/[^a-z]/g, '');
  if (middleName) {
    middleName = middleName.replace(/[^a-z\s]/g, '');
  }

  // Create normalized version (for matching)
  const normalized = `${firstName} ${lastName}`.trim();

  return {
    original,
    normalized,
    firstName,
    lastName,
    middleName,
    suffix,
    prefix,
    isCorporate,
    isTrust,
    isEstate
  };
}

export function getCanonicalName(firstName: string): string {
  const lower = firstName.toLowerCase();

  // Check if it's a known nickname
  for (const [canonical, nicknames] of Object.entries(NICKNAME_MAP)) {
    if (nicknames.includes(lower) || canonical === lower) {
      return canonical;
    }
  }

  return lower;
}

export function areNamesEquivalent(name1: string, name2: string): boolean {
  const canonical1 = getCanonicalName(name1);
  const canonical2 = getCanonicalName(name2);
  return canonical1 === canonical2;
}

// ============================================
// PHONE NORMALIZATION
// ============================================

export interface NormalizedPhone {
  original: string;
  normalized: string; // 10-digit format
  formatted: string; // (XXX) XXX-XXXX
  areaCode: string;
  exchange: string;
  subscriber: string;
  isValid: boolean;
  invalidReason?: string;
}

export function normalizePhone(phone: string): NormalizedPhone {
  const original = phone;

  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');

  // Remove country code if present
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.substring(1);
  }

  // Check if valid length
  if (digits.length !== 10) {
    return {
      original,
      normalized: digits,
      formatted: phone,
      areaCode: '',
      exchange: '',
      subscriber: '',
      isValid: false,
      invalidReason: `Invalid length: ${digits.length} digits`
    };
  }

  // Check against invalid patterns
  for (const pattern of INVALID_PHONE_PATTERNS) {
    if (pattern.test(digits)) {
      return {
        original,
        normalized: digits,
        formatted: phone,
        areaCode: digits.substring(0, 3),
        exchange: digits.substring(3, 6),
        subscriber: digits.substring(6, 10),
        isValid: false,
        invalidReason: 'Matches invalid pattern'
      };
    }
  }

  // Check for invalid area codes (0XX, 1XX)
  const areaCode = digits.substring(0, 3);
  if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
    return {
      original,
      normalized: digits,
      formatted: phone,
      areaCode,
      exchange: digits.substring(3, 6),
      subscriber: digits.substring(6, 10),
      isValid: false,
      invalidReason: 'Invalid area code'
    };
  }

  const exchange = digits.substring(3, 6);
  const subscriber = digits.substring(6, 10);
  const formatted = `(${areaCode}) ${exchange}-${subscriber}`;

  return {
    original,
    normalized: digits,
    formatted,
    areaCode,
    exchange,
    subscriber,
    isValid: true
  };
}

export function phonesMatch(phone1: string, phone2: string): boolean {
  const norm1 = normalizePhone(phone1);
  const norm2 = normalizePhone(phone2);

  if (!norm1.isValid || !norm2.isValid) {
    return false;
  }

  return norm1.normalized === norm2.normalized;
}

// ============================================
// EMAIL NORMALIZATION
// ============================================

export interface NormalizedEmail {
  original: string;
  normalized: string;
  localPart: string;
  domain: string;
  isValid: boolean;
  invalidReason?: string;
  isDisposable: boolean;
  isBusiness: boolean;
}

const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', '10minutemail.com',
  'throwaway.email', 'fakeinbox.com', 'trashmail.com', 'yopmail.com'
];

const PERSONAL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'msn.com',
  'live.com', 'comcast.net', 'verizon.net', 'att.net', 'me.com'
];

export function normalizeEmail(email: string): NormalizedEmail {
  const original = email;
  let normalized = email.toLowerCase().trim();

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return {
      original,
      normalized,
      localPart: '',
      domain: '',
      isValid: false,
      invalidReason: 'Invalid email format',
      isDisposable: false,
      isBusiness: false
    };
  }

  // Check against invalid patterns
  for (const pattern of INVALID_EMAIL_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        original,
        normalized,
        localPart: '',
        domain: '',
        isValid: false,
        invalidReason: 'Matches invalid pattern',
        isDisposable: false,
        isBusiness: false
      };
    }
  }

  const [localPart, domain] = normalized.split('@');

  // Normalize Gmail addresses (remove dots, handle + aliases)
  let normalizedLocal = localPart;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    normalizedLocal = localPart.split('+')[0].replace(/\./g, '');
  }

  normalized = `${normalizedLocal}@${domain}`;

  const isDisposable = DISPOSABLE_DOMAINS.includes(domain);
  const isBusiness = !PERSONAL_DOMAINS.includes(domain) && !isDisposable;

  return {
    original,
    normalized,
    localPart: normalizedLocal,
    domain,
    isValid: true,
    isDisposable,
    isBusiness
  };
}

export function emailsMatch(email1: string, email2: string): boolean {
  const norm1 = normalizeEmail(email1);
  const norm2 = normalizeEmail(email2);

  if (!norm1.isValid || !norm2.isValid) {
    return false;
  }

  return norm1.normalized === norm2.normalized;
}

// ============================================
// ADDRESS NORMALIZATION
// ============================================

export interface NormalizedAddress {
  original: string;
  normalized: string;
  streetNumber: string;
  streetName: string;
  streetSuffix: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  zip4?: string;
  isValid: boolean;
}

export function normalizeAddress(
  street: string,
  city: string,
  state: string,
  zip: string
): NormalizedAddress {
  const original = `${street}, ${city}, ${state} ${zip}`;
  let normalized = street.toLowerCase().trim();

  // Replace abbreviations with standard forms
  for (const [full, abbrev] of Object.entries(ADDRESS_ABBREVIATIONS)) {
    const pattern = new RegExp(`\\b${full}\\b`, 'gi');
    normalized = normalized.replace(pattern, abbrev);
  }

  // Remove extra punctuation
  normalized = normalized.replace(/[.,#]/g, '');
  normalized = normalized.replace(/\s+/g, ' ');

  // Parse components
  const parts = normalized.split(' ');

  // Extract street number (first numeric part)
  let streetNumber = '';
  let streetNameStart = 0;
  if (parts.length > 0 && /^\d+/.test(parts[0])) {
    streetNumber = parts[0].replace(/\D/g, '');
    streetNameStart = 1;
  }

  // Find unit indicator
  let unit: string | undefined;
  const unitIndicators = ['apt', 'ste', 'unit', '#', 'fl', 'rm'];
  for (let i = 0; i < parts.length; i++) {
    if (unitIndicators.includes(parts[i])) {
      unit = parts.slice(i).join(' ');
      parts.splice(i);
      break;
    }
  }

  // Extract street suffix
  const suffixes = Object.values(ADDRESS_ABBREVIATIONS);
  let streetSuffix = '';
  for (let i = parts.length - 1; i >= streetNameStart; i--) {
    if (suffixes.includes(parts[i])) {
      streetSuffix = parts[i];
      parts.splice(i, 1);
      break;
    }
  }

  // Remaining is street name
  const streetName = parts.slice(streetNameStart).join(' ');

  // Normalize state
  const normalizedState = STATE_ABBREVIATIONS[state.toLowerCase()] || state.toLowerCase();

  // Normalize zip
  const normalizedZip = zip.replace(/\D/g, '').substring(0, 5);
  const zip4 = zip.replace(/\D/g, '').substring(5, 9) || undefined;

  const normalizedCity = city.toLowerCase().trim();

  const fullNormalized = [
    streetNumber,
    streetName,
    streetSuffix,
    unit,
    normalizedCity,
    normalizedState,
    normalizedZip
  ].filter(Boolean).join(' ');

  return {
    original,
    normalized: fullNormalized,
    streetNumber,
    streetName,
    streetSuffix,
    unit,
    city: normalizedCity,
    state: normalizedState,
    zip: normalizedZip,
    zip4,
    isValid: streetNumber.length > 0 && streetName.length > 0 && normalizedZip.length === 5
  };
}

export function addressesMatch(
  addr1: { street: string; city: string; state: string; zip: string },
  addr2: { street: string; city: string; state: string; zip: string },
  strictMode = false
): { match: boolean; score: number } {
  const norm1 = normalizeAddress(addr1.street, addr1.city, addr1.state, addr1.zip);
  const norm2 = normalizeAddress(addr2.street, addr2.city, addr2.state, addr2.zip);

  if (!norm1.isValid || !norm2.isValid) {
    return { match: false, score: 0 };
  }

  // Zip must match
  if (norm1.zip !== norm2.zip) {
    return { match: false, score: 0 };
  }

  // Street number must match
  if (norm1.streetNumber !== norm2.streetNumber) {
    return { match: false, score: 0 };
  }

  // State must match
  if (norm1.state !== norm2.state) {
    return { match: false, score: 0.2 };
  }

  // City should match
  if (norm1.city !== norm2.city) {
    return { match: false, score: 0.3 };
  }

  // Street name fuzzy match
  const streetScore = stringSimilarity(norm1.streetName, norm2.streetName);

  if (strictMode) {
    return {
      match: streetScore >= 0.9,
      score: streetScore
    };
  }

  return {
    match: streetScore >= 0.7,
    score: 0.5 + (streetScore * 0.5)
  };
}

// ============================================
// STRING SIMILARITY (Levenshtein-based)
// ============================================

export function stringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  const longerLength = longer.length;
  if (longerLength === 0) return 1;

  const distance = levenshteinDistance(longer, shorter);
  return (longerLength - distance) / longerLength;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}
