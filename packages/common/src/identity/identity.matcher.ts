/**
 * Identity Matcher
 * Compares identity records and scores potential matches
 */

import {
  IdentityRecord,
  IdentityMatchResult,
  MatchDetail,
  IdentityMergeConfig,
  DEFAULT_MERGE_CONFIG
} from './identity.types';
import {
  normalizeName,
  normalizePhone,
  normalizeEmail,
  normalizeAddress,
  stringSimilarity,
  areNamesEquivalent,
  phonesMatch,
  emailsMatch
} from './identity.normalizer';

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

export function matchIdentities(
  source: IdentityRecord,
  target: IdentityRecord,
  config: IdentityMergeConfig = DEFAULT_MERGE_CONFIG
): IdentityMatchResult {
  const matchDetails: MatchDetail[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // ===== PHONE MATCHING =====
  const phoneResult = matchPhones(source.phones, target.phones, config);
  matchDetails.push(...phoneResult.details);
  if (phoneResult.bestScore > 0) {
    totalScore += phoneResult.bestScore * config.weights.phone;
    totalWeight += config.weights.phone;
  }

  // ===== EMAIL MATCHING =====
  const emailResult = matchEmails(source.emails, target.emails, config);
  matchDetails.push(...emailResult.details);
  if (emailResult.bestScore > 0) {
    totalScore += emailResult.bestScore * config.weights.email;
    totalWeight += config.weights.email;
  }

  // ===== ADDRESS MATCHING =====
  const addressResult = matchAddresses(source.addresses, target.addresses, config);
  matchDetails.push(...addressResult.details);
  if (addressResult.bestScore > 0) {
    totalScore += addressResult.bestScore * config.weights.address;
    totalWeight += config.weights.address;
  }

  // ===== NAME MATCHING =====
  const nameResult = matchNames(source, target, config);
  matchDetails.push(...nameResult.details);
  if (nameResult.score > 0) {
    totalScore += nameResult.score * config.weights.name;
    totalWeight += config.weights.name;
  }

  // Calculate overall score
  const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  // Determine if should merge
  const shouldMerge = overallScore >= config.autoMergeThreshold;

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  if (overallScore >= config.autoMergeThreshold) {
    confidence = 'high';
  } else if (overallScore >= config.reviewThreshold) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    sourceId: source.id,
    targetId: target.id,
    overallScore,
    shouldMerge,
    matchDetails,
    confidence
  };
}

// ============================================
// PHONE MATCHING
// ============================================

interface PhoneMatchResult {
  bestScore: number;
  details: MatchDetail[];
}

function matchPhones(
  sourcePhones: IdentityRecord['phones'],
  targetPhones: IdentityRecord['phones'],
  config: IdentityMergeConfig
): PhoneMatchResult {
  const details: MatchDetail[] = [];
  let bestScore = 0;

  for (const sourcePhone of sourcePhones) {
    const sourceNorm = normalizePhone(sourcePhone.number);
    if (!sourceNorm.isValid) continue;

    for (const targetPhone of targetPhones) {
      const targetNorm = normalizePhone(targetPhone.number);
      if (!targetNorm.isValid) continue;

      if (sourceNorm.normalized === targetNorm.normalized) {
        bestScore = 1.0;
        details.push({
          field: 'phone',
          sourceValue: sourcePhone.number,
          targetValue: targetPhone.number,
          score: 1.0,
          matchType: 'exact',
          weight: config.weights.phone
        });
        break;
      }
    }

    if (bestScore === 1.0) break;
  }

  return { bestScore, details };
}

// ============================================
// EMAIL MATCHING
// ============================================

interface EmailMatchResult {
  bestScore: number;
  details: MatchDetail[];
}

function matchEmails(
  sourceEmails: IdentityRecord['emails'],
  targetEmails: IdentityRecord['emails'],
  config: IdentityMergeConfig
): EmailMatchResult {
  const details: MatchDetail[] = [];
  let bestScore = 0;

  for (const sourceEmail of sourceEmails) {
    const sourceNorm = normalizeEmail(sourceEmail.address);
    if (!sourceNorm.isValid) continue;

    for (const targetEmail of targetEmails) {
      const targetNorm = normalizeEmail(targetEmail.address);
      if (!targetNorm.isValid) continue;

      if (sourceNorm.normalized === targetNorm.normalized) {
        bestScore = 1.0;
        details.push({
          field: 'email',
          sourceValue: sourceEmail.address,
          targetValue: targetEmail.address,
          score: 1.0,
          matchType: 'exact',
          weight: config.weights.email
        });
        break;
      }

      // Check domain match for business emails
      if (sourceNorm.domain === targetNorm.domain && sourceNorm.isBusiness) {
        const localScore = stringSimilarity(sourceNorm.localPart, targetNorm.localPart);
        if (localScore > bestScore && localScore >= 0.7) {
          bestScore = localScore;
          details.push({
            field: 'email',
            sourceValue: sourceEmail.address,
            targetValue: targetEmail.address,
            score: localScore,
            matchType: 'partial',
            weight: config.weights.email
          });
        }
      }
    }

    if (bestScore === 1.0) break;
  }

  return { bestScore, details };
}

// ============================================
// ADDRESS MATCHING
// ============================================

interface AddressMatchResult {
  bestScore: number;
  details: MatchDetail[];
}

function matchAddresses(
  sourceAddresses: IdentityRecord['addresses'],
  targetAddresses: IdentityRecord['addresses'],
  config: IdentityMergeConfig
): AddressMatchResult {
  const details: MatchDetail[] = [];
  let bestScore = 0;

  for (const sourceAddr of sourceAddresses) {
    const sourceNorm = normalizeAddress(
      sourceAddr.street,
      sourceAddr.city,
      sourceAddr.state,
      sourceAddr.zip
    );
    if (!sourceNorm.isValid) continue;

    for (const targetAddr of targetAddresses) {
      const targetNorm = normalizeAddress(
        targetAddr.street,
        targetAddr.city,
        targetAddr.state,
        targetAddr.zip
      );
      if (!targetNorm.isValid) continue;

      // Quick zip check
      if (sourceNorm.zip !== targetNorm.zip) continue;

      // Full comparison
      const addressScore = compareNormalizedAddresses(sourceNorm, targetNorm);

      if (addressScore > bestScore) {
        bestScore = addressScore;
        details.push({
          field: 'address',
          sourceValue: sourceNorm.original,
          targetValue: targetNorm.original,
          score: addressScore,
          matchType: addressScore === 1.0 ? 'exact' : 'fuzzy',
          weight: config.weights.address
        });
      }
    }
  }

  return { bestScore, details };
}

function compareNormalizedAddresses(
  addr1: ReturnType<typeof normalizeAddress>,
  addr2: ReturnType<typeof normalizeAddress>
): number {
  // Must have same zip
  if (addr1.zip !== addr2.zip) return 0;

  // Must have same street number
  if (addr1.streetNumber !== addr2.streetNumber) return 0;

  // Must have same state
  if (addr1.state !== addr2.state) return 0;

  // City comparison
  const cityScore = stringSimilarity(addr1.city, addr2.city);
  if (cityScore < 0.8) return cityScore * 0.3;

  // Street name comparison
  const streetScore = stringSimilarity(addr1.streetName, addr2.streetName);

  // Street suffix comparison
  const suffixMatch = addr1.streetSuffix === addr2.streetSuffix ? 1 : 0.9;

  return (streetScore * 0.6 + cityScore * 0.2 + suffixMatch * 0.2);
}

// ============================================
// NAME MATCHING
// ============================================

interface NameMatchResult {
  score: number;
  details: MatchDetail[];
}

function matchNames(
  source: IdentityRecord,
  target: IdentityRecord,
  config: IdentityMergeConfig
): NameMatchResult {
  const details: MatchDetail[] = [];

  const sourceNorm = normalizeName(`${source.firstName} ${source.lastName}`);
  const targetNorm = normalizeName(`${target.firstName} ${target.lastName}`);

  // Last name comparison
  const lastNameScore = stringSimilarity(sourceNorm.lastName, targetNorm.lastName);

  // If last names don't match well, low score
  if (lastNameScore < 0.8) {
    details.push({
      field: 'lastName',
      sourceValue: source.lastName,
      targetValue: target.lastName,
      score: lastNameScore,
      matchType: lastNameScore < 0.5 ? 'none' : 'fuzzy',
      weight: config.weights.name
    });
    return { score: lastNameScore * 0.5, details };
  }

  // First name comparison (considering nicknames)
  let firstNameScore: number;
  if (areNamesEquivalent(sourceNorm.firstName, targetNorm.firstName)) {
    firstNameScore = 1.0;
    details.push({
      field: 'firstName',
      sourceValue: source.firstName,
      targetValue: target.firstName,
      score: 1.0,
      matchType: 'exact',
      weight: config.weights.name
    });
  } else {
    firstNameScore = stringSimilarity(sourceNorm.firstName, targetNorm.firstName);
    details.push({
      field: 'firstName',
      sourceValue: source.firstName,
      targetValue: target.firstName,
      score: firstNameScore,
      matchType: firstNameScore >= 0.8 ? 'fuzzy' : firstNameScore >= 0.5 ? 'partial' : 'none',
      weight: config.weights.name
    });
  }

  details.push({
    field: 'lastName',
    sourceValue: source.lastName,
    targetValue: target.lastName,
    score: lastNameScore,
    matchType: lastNameScore >= 0.95 ? 'exact' : 'fuzzy',
    weight: config.weights.name
  });

  // Combined score
  const nameScore = (lastNameScore * 0.6) + (firstNameScore * 0.4);

  return { score: nameScore, details };
}

// ============================================
// BATCH MATCHING
// ============================================

export function findMatches(
  source: IdentityRecord,
  candidates: IdentityRecord[],
  config: IdentityMergeConfig = DEFAULT_MERGE_CONFIG
): IdentityMatchResult[] {
  const results: IdentityMatchResult[] = [];

  for (const candidate of candidates) {
    if (candidate.id === source.id) continue;

    const match = matchIdentities(source, candidate, config);

    if (match.overallScore >= config.minMatchScore) {
      results.push(match);
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.overallScore - a.overallScore);

  return results;
}

export function findBestMatch(
  source: IdentityRecord,
  candidates: IdentityRecord[],
  config: IdentityMergeConfig = DEFAULT_MERGE_CONFIG
): IdentityMatchResult | null {
  const matches = findMatches(source, candidates, config);
  return matches.length > 0 ? matches[0] : null;
}

// ============================================
// CLUSTERING
// ============================================

export interface IdentityCluster {
  clusterId: string;
  primaryRecordId: string;
  recordIds: string[];
  confidence: number;
}

export function clusterIdentities(
  records: IdentityRecord[],
  config: IdentityMergeConfig = DEFAULT_MERGE_CONFIG
): IdentityCluster[] {
  const clusters: IdentityCluster[] = [];
  const assigned = new Set<string>();

  // Sort records by quality (more phones/emails = higher quality)
  const sortedRecords = [...records].sort((a, b) => {
    const qualityA = a.phones.length + a.emails.length + a.addresses.length;
    const qualityB = b.phones.length + b.emails.length + b.addresses.length;
    return qualityB - qualityA;
  });

  for (const record of sortedRecords) {
    if (assigned.has(record.id)) continue;

    // Start a new cluster with this record
    const cluster: IdentityCluster = {
      clusterId: `cluster_${record.id}`,
      primaryRecordId: record.id,
      recordIds: [record.id],
      confidence: 1.0
    };

    assigned.add(record.id);

    // Find all matching records not yet assigned
    const unassigned = sortedRecords.filter(r => !assigned.has(r.id));

    for (const candidate of unassigned) {
      const match = matchIdentities(record, candidate, config);

      if (match.shouldMerge) {
        cluster.recordIds.push(candidate.id);
        cluster.confidence = Math.min(cluster.confidence, match.overallScore);
        assigned.add(candidate.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}
