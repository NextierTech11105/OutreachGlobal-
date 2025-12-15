/**
 * Persona Repository
 * Database operations for personas and related data
 */
import { Injectable } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, or, desc, asc, like, inArray, sql } from "drizzle-orm";
import {
  personas,
  personaPhones,
  personaEmails,
  personaAddresses,
  personaSocials,
  personaDemographics,
} from "@/database/schema";
import { generateUlid } from "@/database/columns/ulid";

export interface CreatePersonaInput {
  teamId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  primarySource: string;
}

export interface PersonaWithContacts {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phones: Array<{
    phoneNumber: string;
    phoneType: string;
    isPrimary: boolean;
  }>;
  emails: Array<{
    emailAddress: string;
    emailType: string;
    isPrimary: boolean;
  }>;
  addresses: Array<{
    street: string;
    city: string;
    state: string;
    zip: string;
    isCurrent: boolean;
  }>;
}

@Injectable()
export class PersonaRepository {
  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Create a new persona
   */
  async create(input: CreatePersonaInput): Promise<string> {
    const id = generateUlid("persona");
    const normalizedFirst = input.firstName.toLowerCase().trim();
    const normalizedLast = input.lastName.toLowerCase().trim();

    await this.db.insert(personas).values({
      id,
      teamId: input.teamId,
      firstName: input.firstName,
      lastName: input.lastName,
      middleName: input.middleName,
      suffix: input.suffix,
      fullName: `${input.firstName} ${input.lastName}`,
      normalizedFirstName: normalizedFirst,
      normalizedLastName: normalizedLast,
      primarySource: input.primarySource,
      confidenceScore: 1.0,
      skipTraceCompleted: false,
      apolloCompleted: false,
      isActive: true,
    });

    return id;
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<typeof personas.$inferSelect | null> {
    const result = await this.db.query.personas.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });
    return result || null;
  }

  /**
   * Find by normalized name
   */
  async findByName(
    teamId: string,
    firstName: string,
    lastName: string,
  ): Promise<typeof personas.$inferSelect | null> {
    const normalizedFirst = firstName.toLowerCase().trim();
    const normalizedLast = lastName.toLowerCase().trim();

    const result = await this.db.query.personas.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.teamId, teamId),
          eq(t.normalizedFirstName, normalizedFirst),
          eq(t.normalizedLastName, normalizedLast),
          eq(t.isActive, true),
        ),
    });
    return result || null;
  }

  /**
   * Find by phone number
   */
  async findByPhone(teamId: string, phone: string): Promise<string[]> {
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);

    const matches = await this.db.query.personaPhones.findMany({
      where: (t, { eq, and }) =>
        and(eq(t.teamId, teamId), eq(t.normalizedNumber, normalizedPhone)),
    });

    return matches.map((m) => m.personaId);
  }

  /**
   * Find by email address
   */
  async findByEmail(teamId: string, email: string): Promise<string[]> {
    const normalizedEmail = email.toLowerCase().trim();

    const matches = await this.db.query.personaEmails.findMany({
      where: (t, { eq, and }) =>
        and(eq(t.teamId, teamId), eq(t.normalizedAddress, normalizedEmail)),
    });

    return matches.map((m) => m.personaId);
  }

  /**
   * Get persona with all contacts
   */
  async getWithContacts(
    personaId: string,
  ): Promise<PersonaWithContacts | null> {
    const persona = await this.db.query.personas.findFirst({
      where: (t, { eq }) => eq(t.id, personaId),
    });

    if (!persona) return null;

    const phones = await this.db.query.personaPhones.findMany({
      where: (t, { eq }) => eq(t.personaId, personaId),
      orderBy: (t) => [desc(t.isPrimary), desc(t.score)],
    });

    const emails = await this.db.query.personaEmails.findMany({
      where: (t, { eq }) => eq(t.personaId, personaId),
      orderBy: (t) => [desc(t.isPrimary), desc(t.score)],
    });

    const addresses = await this.db.query.personaAddresses.findMany({
      where: (t, { eq }) => eq(t.personaId, personaId),
      orderBy: (t) => [desc(t.isCurrent), desc(t.isPrimary)],
    });

    return {
      id: persona.id,
      firstName: persona.firstName,
      lastName: persona.lastName,
      fullName: persona.fullName,
      phones: phones.map((p) => ({
        phoneNumber: p.phoneNumber,
        phoneType: p.phoneType,
        isPrimary: p.isPrimary,
      })),
      emails: emails.map((e) => ({
        emailAddress: e.emailAddress,
        emailType: e.emailType,
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
   * List personas needing enrichment
   */
  async listNeedingEnrichment(
    teamId: string,
    options: { skipTrace?: boolean; apollo?: boolean; limit?: number } = {},
  ): Promise<Array<typeof personas.$inferSelect>> {
    const conditions = [
      eq(personas.teamId, teamId),
      eq(personas.isActive, true),
    ];

    if (options.skipTrace) {
      conditions.push(eq(personas.skipTraceCompleted, false));
    }

    if (options.apollo) {
      conditions.push(eq(personas.apolloCompleted, false));
    }

    const results = await this.db.query.personas.findMany({
      where: and(...conditions),
      orderBy: (t) => [asc(t.createdAt)],
      limit: options.limit || 100,
    });

    return results;
  }

  /**
   * Count personas by enrichment status
   */
  async countByEnrichmentStatus(teamId: string): Promise<{
    total: number;
    skipTraceComplete: number;
    apolloComplete: number;
    fullyEnriched: number;
    needsEnrichment: number;
  }> {
    const all = await this.db.query.personas.findMany({
      where: (t, { eq, and }) =>
        and(eq(t.teamId, teamId), eq(t.isActive, true)),
    });

    const total = all.length;
    const skipTraceComplete = all.filter((p) => p.skipTraceCompleted).length;
    const apolloComplete = all.filter((p) => p.apolloCompleted).length;
    const fullyEnriched = all.filter(
      (p) => p.skipTraceCompleted && p.apolloCompleted,
    ).length;
    const needsEnrichment = total - fullyEnriched;

    return {
      total,
      skipTraceComplete,
      apolloComplete,
      fullyEnriched,
      needsEnrichment,
    };
  }
}
