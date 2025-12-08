/**
 * Lead Card Normalizer
 * Normalizes and deduplicates contact information for lead cards
 */

// Simple URL validation without node imports
function isValidUrl(urlString: string): boolean {
  try {
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(urlString);
  } catch {
    return false;
  }
}
import {
  PhoneInfo,
  EmailInfo,
  AddressInfo,
  SocialInfo,
  PersonIdentity,
  BusinessInfo,
  LeadSourceType,
} from './leadcard.types';

// ============================================
// PHONE NORMALIZATION
// ============================================

export function normalizePhoneForCard(
  phone: string,
  type: PhoneInfo['type'] = 'unknown',
  source: LeadSourceType,
  score = 0.5
): PhoneInfo | null {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Must be 10 or 11 digits (with country code)
  if (digits.length < 10 || digits.length > 11) {
    return null;
  }

  // Normalize to 10 digits (remove leading 1)
  const normalized = digits.length === 11 && digits.startsWith('1')
    ? digits.substring(1)
    : digits;

  if (normalized.length !== 10) {
    return null;
  }

  // Validate area code (no 0 or 1 as first digit)
  if (normalized[0] === '0' || normalized[0] === '1') {
    return null;
  }

  return {
    number: phone,
    normalizedNumber: normalized,
    type,
    isPrimary: false,
    isValid: true,
    isDoNotCall: false,
    source,
    score,
  };
}

export function deduplicatePhones(phones: PhoneInfo[]): PhoneInfo[] {
  const seen = new Map<string, PhoneInfo>();

  for (const phone of phones) {
    const existing = seen.get(phone.normalizedNumber);
    if (!existing || phone.score > existing.score) {
      seen.set(phone.normalizedNumber, phone);
    }
  }

  const result = Array.from(seen.values());

  // Sort by score descending, set first as primary
  result.sort((a, b) => b.score - a.score);
  if (result.length > 0) {
    result[0].isPrimary = true;
  }

  return result;
}

// ============================================
// EMAIL NORMALIZATION
// ============================================

export function normalizeEmailForCard(
  email: string,
  type: EmailInfo['type'] = 'unknown',
  source: LeadSourceType,
  score = 0.5
): EmailInfo | null {
  const trimmed = email.trim().toLowerCase();

  // Basic validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return null;
  }

  const [localPart, domain] = trimmed.split('@');

  // Skip disposable/invalid domains
  const invalidDomains = [
    'example.com', 'test.com', 'mailinator.com', 'tempmail.com',
    'throwaway.com', 'guerrillamail.com', '10minutemail.com'
  ];
  if (invalidDomains.includes(domain)) {
    return null;
  }

  // Detect email type
  let detectedType = type;
  if (type === 'unknown') {
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
    detectedType = personalDomains.includes(domain) ? 'personal' : 'business';
  }

  return {
    address: email,
    normalizedAddress: trimmed,
    type: detectedType,
    isPrimary: false,
    isValid: true,
    isUnsubscribed: false,
    domain,
    source,
    score,
  };
}

export function deduplicateEmails(emails: EmailInfo[]): EmailInfo[] {
  const seen = new Map<string, EmailInfo>();

  for (const email of emails) {
    const existing = seen.get(email.normalizedAddress);
    if (!existing || email.score > existing.score) {
      seen.set(email.normalizedAddress, email);
    }
  }

  const result = Array.from(seen.values());

  // Sort: business emails first, then by score
  result.sort((a, b) => {
    if (a.type === 'business' && b.type !== 'business') return -1;
    if (b.type === 'business' && a.type !== 'business') return 1;
    return b.score - a.score;
  });

  if (result.length > 0) {
    result[0].isPrimary = true;
  }

  return result;
}

// ============================================
// ADDRESS NORMALIZATION
// ============================================

const STREET_ABBREVIATIONS: Record<string, string> = {
  'street': 'st',
  'avenue': 'ave',
  'boulevard': 'blvd',
  'drive': 'dr',
  'lane': 'ln',
  'road': 'rd',
  'court': 'ct',
  'place': 'pl',
  'circle': 'cir',
  'terrace': 'ter',
  'highway': 'hwy',
  'parkway': 'pkwy',
  'way': 'way',
  'north': 'n',
  'south': 's',
  'east': 'e',
  'west': 'w',
  'northeast': 'ne',
  'northwest': 'nw',
  'southeast': 'se',
  'southwest': 'sw',
  'apartment': 'apt',
  'suite': 'ste',
  'unit': 'unit',
  'floor': 'fl',
  'building': 'bldg',
};

const STATE_CODES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
};

export function normalizeAddressForCard(
  street: string,
  city: string,
  state: string,
  zip: string,
  source: LeadSourceType,
  options: {
    street2?: string;
    county?: string;
    type?: AddressInfo['type'];
    isCurrent?: boolean;
  } = {}
): AddressInfo | null {
  // Normalize street
  let normalizedStreet = street.toLowerCase().trim();
  for (const [full, abbr] of Object.entries(STREET_ABBREVIATIONS)) {
    normalizedStreet = normalizedStreet.replace(new RegExp(`\\b${full}\\b`, 'gi'), abbr);
  }

  // Normalize city
  const normalizedCity = city.toLowerCase().trim().replace(/\s+/g, ' ');

  // Normalize state
  let normalizedState = state.trim().toUpperCase();
  if (normalizedState.length > 2) {
    normalizedState = STATE_CODES[state.toLowerCase()] || normalizedState;
  }

  // Normalize zip
  const normalizedZip = zip.replace(/\D/g, '').substring(0, 5);
  if (normalizedZip.length !== 5) {
    return null;
  }

  return {
    street,
    street2: options.street2,
    city,
    state: normalizedState,
    zip: normalizedZip,
    county: options.county,
    country: 'US',
    type: options.type || 'unknown',
    isCurrent: options.isCurrent ?? true,
    isPrimary: false,
    source,
  };
}

export function deduplicateAddresses(addresses: AddressInfo[]): AddressInfo[] {
  const seen = new Map<string, AddressInfo>();

  for (const addr of addresses) {
    // Create a key from normalized components
    const key = `${addr.zip}|${addr.street.toLowerCase().replace(/\s+/g, '')}`;
    const existing = seen.get(key);

    // Prefer current address, then more complete data
    if (!existing || (addr.isCurrent && !existing.isCurrent) ||
        (addr.latitude && !existing.latitude)) {
      seen.set(key, addr);
    }
  }

  const result = Array.from(seen.values());

  // Sort: current addresses first
  result.sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (b.isCurrent && !a.isCurrent) return 1;
    return 0;
  });

  if (result.length > 0) {
    result[0].isPrimary = true;
  }

  return result;
}

// ============================================
// SOCIAL NORMALIZATION
// ============================================

export function normalizeSocialForCard(
  platform: SocialInfo['platform'],
  profileUrl: string,
  source: LeadSourceType,
  options: {
    username?: string;
    displayName?: string;
  } = {}
): SocialInfo | null {
  // Validate URL
  if (!isValidUrl(profileUrl)) {
    return null;
  }

  // Extract username if not provided
  let username = options.username;
  if (!username) {
    const urlParts = profileUrl.split('/').filter(Boolean);
    username = urlParts[urlParts.length - 1];
  }

  return {
    platform,
    profileUrl,
    username,
    displayName: options.displayName,
    isVerified: false,
    source,
  };
}

export function deduplicateSocials(socials: SocialInfo[]): SocialInfo[] {
  const seen = new Map<string, SocialInfo>();

  for (const social of socials) {
    const key = `${social.platform}|${social.profileUrl.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, social);
    }
  }

  return Array.from(seen.values());
}

// ============================================
// NAME NORMALIZATION
// ============================================

const NAME_PREFIXES = ['mr', 'mrs', 'ms', 'dr', 'prof', 'rev', 'hon', 'sir', 'dame'];
const NAME_SUFFIXES = ['jr', 'sr', 'ii', 'iii', 'iv', 'v', 'phd', 'md', 'esq', 'dds', 'dvm'];

export function normalizeNameForCard(
  firstName: string,
  lastName: string,
  options: {
    middleName?: string;
    suffix?: string;
  } = {}
): Pick<PersonIdentity, 'firstName' | 'lastName' | 'middleName' | 'suffix' | 'fullName' | 'normalizedFirstName' | 'normalizedLastName'> {
  // Normalize first name
  let normalizedFirst = firstName.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ');

  // Remove prefixes from first name
  for (const prefix of NAME_PREFIXES) {
    if (normalizedFirst.startsWith(prefix + ' ')) {
      normalizedFirst = normalizedFirst.substring(prefix.length + 1);
    }
  }

  // Normalize last name
  let normalizedLast = lastName.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ');

  // Handle suffixes
  let suffix = options.suffix;
  for (const suf of NAME_SUFFIXES) {
    if (normalizedLast.endsWith(' ' + suf)) {
      suffix = suf.toUpperCase();
      normalizedLast = normalizedLast.substring(0, normalizedLast.length - suf.length - 1);
    }
  }

  // Build full name
  const parts = [firstName, options.middleName, lastName, suffix].filter(Boolean);
  const fullName = parts.join(' ');

  return {
    firstName,
    lastName,
    middleName: options.middleName,
    suffix,
    fullName,
    normalizedFirstName: normalizedFirst,
    normalizedLastName: normalizedLast,
  };
}

// ============================================
// BUSINESS NORMALIZATION
// ============================================

const BUSINESS_SUFFIXES = [
  'inc', 'incorporated', 'llc', 'l.l.c.', 'ltd', 'limited',
  'corp', 'corporation', 'co', 'company', 'pllc', 'lp', 'llp',
  'pc', 'pa', 'plc', 'gp', 'partnership', 'associates',
];

export function normalizeBusinessName(name: string): string {
  let normalized = name.toLowerCase().trim()
    .replace(/[^\w\s&-]/g, '')
    .replace(/\s+/g, ' ');

  // Remove common suffixes
  for (const suffix of BUSINESS_SUFFIXES) {
    const pattern = new RegExp(`\\s+${suffix}$`, 'i');
    normalized = normalized.replace(pattern, '');
  }

  return normalized;
}

export function normalizeBusinessForCard(
  name: string,
  source: LeadSourceType,
  options: Partial<Omit<BusinessInfo, 'id' | 'name' | 'normalizedName'>> = {}
): Omit<BusinessInfo, 'id'> {
  return {
    name,
    normalizedName: normalizeBusinessName(name),
    isActive: true,
    ...options,
  };
}

// ============================================
// MERGE UTILITIES
// ============================================

export function mergePhoneLists(...lists: PhoneInfo[][]): PhoneInfo[] {
  const all = lists.flat();
  return deduplicatePhones(all);
}

export function mergeEmailLists(...lists: EmailInfo[][]): EmailInfo[] {
  const all = lists.flat();
  return deduplicateEmails(all);
}

export function mergeAddressLists(...lists: AddressInfo[][]): AddressInfo[] {
  const all = lists.flat();
  return deduplicateAddresses(all);
}

export function mergeSocialLists(...lists: SocialInfo[][]): SocialInfo[] {
  const all = lists.flat();
  return deduplicateSocials(all);
}
