/**
 * Identity Graph Service
 * Matches and merges personas based on phone, email, address, and name
 */
import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, or, inArray } from "drizzle-orm";
import {
  personas,
  personaPhones,
  personaEmails,
  personaAddresses,
  personaMergeHistory,
  businessOwners,
  propertyOwners,
} from "@/database/schema";
import { generateUlid } from "@/database/columns/ulid";
import {
  matchIdentities,
  findMatches,
  clusterIdentities,
  IdentityRecord,
  IdentityMatchResult,
  DEFAULT_MERGE_CONFIG,
} from "@nextier/common";

export interface IdentityMatchJob {
  teamId: string;
  personaId: string;
}

export interface IdentityMergeResult {
  survivorId: string;
  mergedIds: string[];
  matchScores: number[];
  phonesConsolidated: number;
  emailsConsolidated: number;
}

@Injectable()
export class IdentityGraphService {
  private readonly logger = new Logger(IdentityGraphService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Find potential matches for a persona
   */
  async findPotentialMatches(teamId: string, personaId: string): Promise<IdentityMatchResult[]> {
    this.logger.log(`Finding potential matches for persona ${personaId}`);

    // Get source persona with all contact info
    const sourceRecord = await this.buildIdentityRecord(teamId, personaId);
    if (!sourceRecord) {
      this.logger.warn(`Persona ${personaId} not found`);
      return [];
    }

    // Find candidates with matching phone, email, or similar name
    const candidates = await this.findCandidates(teamId, personaId, sourceRecord);
    if (candidates.length === 0) {
      return [];
    }

    // Score matches
    const matches = findMatches(sourceRecord, candidates, DEFAULT_MERGE_CONFIG);

    this.logger.log(`Found ${matches.length} potential matches for persona ${personaId}`);
    return matches;
  }

  /**
   * Auto-merge personas that exceed threshold
   */
  async autoMergePersona(teamId: string, personaId: string): Promise<IdentityMergeResult | null> {
    const matches = await this.findPotentialMatches(teamId, personaId);

    // Filter to high-confidence matches
    const autoMergeMatches = matches.filter(
      (m) => m.shouldMerge && m.confidence === "high"
    );

    if (autoMergeMatches.length === 0) {
      return null;
    }

    // Merge all matching personas into the original
    const mergedIds: string[] = [];
    const matchScores: number[] = [];

    for (const match of autoMergeMatches) {
      const targetId = match.targetId;

      // Merge target into source
      await this.mergePersonas(teamId, personaId, targetId, match.overallScore, "auto");

      mergedIds.push(targetId);
      matchScores.push(match.overallScore);
    }

    // Get consolidated counts
    const phones = await this.db.query.personaPhones.findMany({
      where: (t, { eq }) => eq(t.personaId, personaId),
    });
    const emails = await this.db.query.personaEmails.findMany({
      where: (t, { eq }) => eq(t.personaId, personaId),
    });

    this.logger.log(
      `Auto-merged ${mergedIds.length} personas into ${personaId}`
    );

    return {
      survivorId: personaId,
      mergedIds,
      matchScores,
      phonesConsolidated: phones.length,
      emailsConsolidated: emails.length,
    };
  }

  /**
   * Manually merge two personas
   */
  async mergePersonas(
    teamId: string,
    survivorId: string,
    mergedId: string,
    matchScore: number,
    mergedBy: string
  ): Promise<void> {
    this.logger.log(`Merging persona ${mergedId} into ${survivorId}`);

    // Update all contact info to point to survivor
    await this.db
      .update(personaPhones)
      .set({ personaId: survivorId })
      .where(eq(personaPhones.personaId, mergedId));

    await this.db
      .update(personaEmails)
      .set({ personaId: survivorId })
      .where(eq(personaEmails.personaId, mergedId));

    await this.db
      .update(personaAddresses)
      .set({ personaId: survivorId })
      .where(eq(personaAddresses.personaId, mergedId));

    // Update business owner links
    await this.db
      .update(businessOwners)
      .set({ personaId: survivorId })
      .where(eq(businessOwners.personaId, mergedId));

    // Update property owner links
    await this.db
      .update(propertyOwners)
      .set({ personaId: survivorId })
      .where(eq(propertyOwners.personaId, mergedId));

    // Record merge history
    await this.db.insert(personaMergeHistory).values({
      id: generateUlid("pmh"),
      teamId,
      survivorId,
      mergedId,
      matchScore,
      mergedBy,
    });

    // Update survivor's merged IDs
    const survivor = await this.db.query.personas.findFirst({
      where: (t, { eq }) => eq(t.id, survivorId),
    });

    if (survivor) {
      const mergedFromIds = [...(survivor.mergedFromIds || []), mergedId];
      await this.db
        .update(personas)
        .set({
          mergedFromIds,
          confidenceScore: Math.min(1.0, (survivor.confidenceScore || 1) + 0.05),
        })
        .where(eq(personas.id, survivorId));
    }

    // Deactivate merged persona
    await this.db
      .update(personas)
      .set({ isActive: false })
      .where(eq(personas.id, mergedId));

    this.logger.log(`Merge complete: ${mergedId} -> ${survivorId}`);
  }

  /**
   * Cluster all personas for a team
   */
  async clusterTeamPersonas(teamId: string): Promise<{
    totalPersonas: number;
    clusters: number;
    autoMerged: number;
  }> {
    this.logger.log(`Starting identity clustering for team ${teamId}`);

    // Get all active personas
    const allPersonas = await this.db.query.personas.findMany({
      where: (t, { eq, and }) => and(eq(t.teamId, teamId), eq(t.isActive, true)),
    });

    if (allPersonas.length === 0) {
      return { totalPersonas: 0, clusters: 0, autoMerged: 0 };
    }

    // Build identity records
    const records: IdentityRecord[] = [];
    for (const persona of allPersonas) {
      const record = await this.buildIdentityRecord(teamId, persona.id);
      if (record) {
        records.push(record);
      }
    }

    // Cluster identities
    const clusters = clusterIdentities(records, DEFAULT_MERGE_CONFIG);

    // Process clusters with multiple records
    let autoMerged = 0;
    for (const cluster of clusters) {
      if (cluster.recordIds.length > 1) {
        const [primary, ...others] = cluster.recordIds;

        for (const otherId of others) {
          await this.mergePersonas(teamId, primary, otherId, cluster.confidence, "auto_cluster");
          autoMerged++;
        }
      }
    }

    this.logger.log(
      `Clustering complete: ${allPersonas.length} personas -> ${clusters.length} clusters, ${autoMerged} auto-merged`
    );

    return {
      totalPersonas: allPersonas.length,
      clusters: clusters.length,
      autoMerged,
    };
  }

  /**
   * Build identity record for matching
   */
  private async buildIdentityRecord(
    teamId: string,
    personaId: string
  ): Promise<IdentityRecord | null> {
    const persona = await this.db.query.personas.findFirst({
      where: (t, { eq, and }) => and(eq(t.id, personaId), eq(t.teamId, teamId)),
    });

    if (!persona) return null;

    const phones = await this.db.query.personaPhones.findMany({
      where: (t, { eq }) => eq(t.personaId, personaId),
    });

    const emails = await this.db.query.personaEmails.findMany({
      where: (t, { eq }) => eq(t.personaId, personaId),
    });

    const addresses = await this.db.query.personaAddresses.findMany({
      where: (t, { eq }) => eq(t.personaId, personaId),
    });

    return {
      id: persona.id,
      firstName: persona.firstName,
      lastName: persona.lastName,
      phones: phones.map((p) => ({
        number: p.normalizedNumber,
        type: p.phoneType as "mobile" | "landline" | "unknown",
        isPrimary: p.isPrimary,
      })),
      emails: emails.map((e) => ({
        address: e.normalizedAddress,
        type: e.emailType as "personal" | "business" | "unknown",
        isPrimary: e.isPrimary,
      })),
      addresses: addresses.map((a) => ({
        street: a.street,
        city: a.city,
        state: a.state,
        zip: a.zip,
        isCurrent: a.isCurrent,
      })),
    };
  }

  /**
   * Find candidate personas for matching
   */
  private async findCandidates(
    teamId: string,
    excludeId: string,
    source: IdentityRecord
  ): Promise<IdentityRecord[]> {
    const candidateIds = new Set<string>();

    // Find by matching phone numbers
    if (source.phones.length > 0) {
      const phoneNumbers = source.phones.map((p) => p.number);
      const phoneMatches = await this.db.query.personaPhones.findMany({
        where: (t, { and, eq, inArray }) =>
          and(eq(t.teamId, teamId), inArray(t.normalizedNumber, phoneNumbers)),
      });

      phoneMatches.forEach((m) => {
        if (m.personaId !== excludeId) {
          candidateIds.add(m.personaId);
        }
      });
    }

    // Find by matching email addresses
    if (source.emails.length > 0) {
      const emailAddresses = source.emails.map((e) => e.address);
      const emailMatches = await this.db.query.personaEmails.findMany({
        where: (t, { and, eq, inArray }) =>
          and(eq(t.teamId, teamId), inArray(t.normalizedAddress, emailAddresses)),
      });

      emailMatches.forEach((m) => {
        if (m.personaId !== excludeId) {
          candidateIds.add(m.personaId);
        }
      });
    }

    // Find by similar name (same last name prefix)
    const lastNamePrefix = source.lastName.substring(0, 3).toLowerCase();
    const nameMatches = await this.db.query.personas.findMany({
      where: (t, { and, eq, like, ne }) =>
        and(
          eq(t.teamId, teamId),
          eq(t.isActive, true),
          ne(t.id, excludeId),
          like(t.normalizedLastName, `${lastNamePrefix}%`)
        ),
      limit: 50,
    });

    nameMatches.forEach((m) => candidateIds.add(m.id));

    // Build full records for candidates
    const candidates: IdentityRecord[] = [];
    for (const candidateId of candidateIds) {
      const record = await this.buildIdentityRecord(teamId, candidateId);
      if (record) {
        candidates.push(record);
      }
    }

    return candidates;
  }
}
