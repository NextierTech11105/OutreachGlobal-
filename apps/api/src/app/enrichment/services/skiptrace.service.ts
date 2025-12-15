/**
 * SkipTrace Service
 * Enriches personas with phone, email, address, social, and demographic data
 */
import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { generateUlid } from "@/database/columns/ulid";
import {
  personas,
  personaPhones,
  personaEmails,
  personaAddresses,
  personaSocials,
  personaDemographics,
  skiptraceResults,
} from "@/database/schema";
import { eq } from "drizzle-orm";
import {
  RealEstateApiService,
  SkipTraceRequest,
  SkipTraceResponse,
} from "./realestate-api.service";

export interface SkipTraceEnrichmentJob {
  teamId: string;
  personaId: string;
  sourceType: "business" | "property" | "consumer";
  sourceId: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
}

export interface SkipTraceEnrichmentResult {
  success: boolean;
  personaId: string;
  phonesAdded: number;
  emailsAdded: number;
  addressesAdded: number;
  socialsAdded: number;
  demographicsUpdated: boolean;
  matchConfidence?: number;
  error?: string;
}

@Injectable()
export class SkipTraceService {
  private readonly logger = new Logger(SkipTraceService.name);

  constructor(
    private realEstateApi: RealEstateApiService,
    @InjectDB() private db: DrizzleClient,
    @InjectQueue("skiptrace") private skipTraceQueue: Queue,
    @InjectQueue("lead-card") private leadCardQueue: Queue,
  ) {}

  /**
   * Queue a persona for skip trace enrichment
   */
  async queueEnrichment(job: SkipTraceEnrichmentJob): Promise<string> {
    const jobId = generateUlid("strace");

    await this.skipTraceQueue.add("ENRICH_PERSONA", job, {
      jobId,
      attempts: 3,
      backoff: { type: "exponential", delay: 10000 },
    });

    this.logger.log(
      `Queued SkipTrace enrichment ${jobId} for persona ${job.personaId}`,
    );
    return jobId;
  }

  /**
   * Perform skip trace enrichment for a persona
   */
  async enrichPersona(
    job: SkipTraceEnrichmentJob,
  ): Promise<SkipTraceEnrichmentResult> {
    const { teamId, personaId, sourceType, sourceId } = job;

    this.logger.log(`Starting SkipTrace enrichment for persona ${personaId}`);

    // Build request
    const request: SkipTraceRequest = {
      firstName: job.firstName,
      lastName: job.lastName,
      address: job.address,
      city: job.city,
      state: job.state,
      zip: job.zip,
      email: job.email,
      phone: job.phone,
    };

    // Call RealEstateAPI
    const response = await this.realEstateApi.skipTrace(request);

    // Store raw result
    await this.storeSkipTraceResult(
      teamId,
      personaId,
      sourceType,
      sourceId,
      request,
      response,
    );

    if (!response.success || !response.output) {
      this.logger.warn(
        `SkipTrace failed for persona ${personaId}: ${response.error?.message}`,
      );

      return {
        success: false,
        personaId,
        phonesAdded: 0,
        emailsAdded: 0,
        addressesAdded: 0,
        socialsAdded: 0,
        demographicsUpdated: false,
        error: response.error?.message || "SkipTrace failed",
      };
    }

    // Process results
    const result = await this.processSkipTraceOutput(
      teamId,
      personaId,
      response,
    );

    // Update persona enrichment status
    await this.db
      .update(personas)
      .set({
        skipTraceCompleted: true,
        skipTraceCompletedAt: new Date(),
        lastEnrichedAt: new Date(),
      })
      .where(eq(personas.id, personaId));

    // Queue lead card update
    await this.leadCardQueue.add(
      "UPDATE_FROM_SKIPTRACE",
      {
        teamId,
        personaId,
        skipTraceResult: result,
      },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
      },
    );

    this.logger.log(
      `SkipTrace complete for ${personaId}: ${result.phonesAdded} phones, ${result.emailsAdded} emails`,
    );

    return result;
  }

  /**
   * Store raw skip trace result for auditing
   */
  private async storeSkipTraceResult(
    teamId: string,
    personaId: string,
    sourceType: string,
    sourceId: string,
    request: SkipTraceRequest,
    response: SkipTraceResponse,
  ): Promise<void> {
    await this.db.insert(skiptraceResults).values({
      id: generateUlid("strace"),
      teamId,
      personaId,
      sourceType,
      sourceId,
      inputFirstName: request.firstName,
      inputLastName: request.lastName,
      inputAddress: request.address,
      inputCity: request.city,
      inputState: request.state,
      inputZip: request.zip,
      inputEmail: request.email,
      inputPhone: request.phone,
      success: response.success,
      errorCode: response.error?.code,
      errorMessage: response.error?.message,
      matchConfidence: response.match_score,
      rawResponse: response as unknown as Record<string, unknown>,
      phonesFound: response.output?.phones?.length?.toString(),
      emailsFound: response.output?.emails?.length?.toString(),
      addressesFound: response.output?.addresses?.length?.toString(),
      socialsFound: response.output?.social_profiles?.length?.toString(),
      relativesFound: response.output?.relatives?.length?.toString(),
      processedAt: new Date(),
      provider: "realestateapi",
    });
  }

  /**
   * Process skip trace output and store contact data
   */
  private async processSkipTraceOutput(
    teamId: string,
    personaId: string,
    response: SkipTraceResponse,
  ): Promise<SkipTraceEnrichmentResult> {
    const output = response.output!;
    let phonesAdded = 0;
    let emailsAdded = 0;
    let addressesAdded = 0;
    let socialsAdded = 0;
    let demographicsUpdated = false;

    // Process phones
    if (output.phones) {
      for (const phone of output.phones) {
        const normalizedNumber = phone.phone_number.replace(/\D/g, "");
        if (normalizedNumber.length >= 10) {
          await this.db
            .insert(personaPhones)
            .values({
              id: generateUlid("pphone"),
              teamId,
              personaId,
              phoneNumber: phone.phone_number,
              normalizedNumber: normalizedNumber.slice(-10),
              phoneType: this.mapPhoneType(phone.phone_type),
              carrier: phone.carrier,
              lineType: phone.line_type,
              isValid: true,
              isConnected: phone.is_connected,
              isDoNotCall: false,
              isPrimary: phone.is_primary || false,
              source: "skiptrace",
              score: phone.score || 0.7,
            })
            .onConflictDoNothing();

          phonesAdded++;
        }
      }
    }

    // Process emails
    if (output.emails) {
      for (const email of output.emails) {
        const normalizedAddress = email.email_address.toLowerCase().trim();
        await this.db
          .insert(personaEmails)
          .values({
            id: generateUlid("pemail"),
            teamId,
            personaId,
            emailAddress: email.email_address,
            normalizedAddress,
            emailType: this.mapEmailType(email.email_type),
            domain: normalizedAddress.split("@")[1],
            isValid: email.is_valid ?? true,
            isDeliverable: email.is_valid,
            isPrimary: email.is_primary || false,
            source: "skiptrace",
            score: email.score || 0.7,
          })
          .onConflictDoNothing();

        emailsAdded++;
      }
    }

    // Process addresses
    if (output.addresses) {
      for (const addr of output.addresses) {
        if (addr.street_address && addr.city && addr.state && addr.zip) {
          await this.db
            .insert(personaAddresses)
            .values({
              id: generateUlid("paddr"),
              teamId,
              personaId,
              street: addr.street_address,
              city: addr.city,
              state: addr.state,
              zip: addr.zip,
              zip4: addr.zip4,
              county: addr.county,
              country: "US",
              addressType: this.mapAddressType(addr.address_type),
              isCurrent: addr.is_current || false,
              isPrimary: false,
              moveInDate: addr.move_in_date
                ? new Date(addr.move_in_date)
                : undefined,
              moveOutDate: addr.move_out_date
                ? new Date(addr.move_out_date)
                : undefined,
              latitude: addr.lat,
              longitude: addr.lng,
              source: "skiptrace",
            })
            .onConflictDoNothing();

          addressesAdded++;
        }
      }
    }

    // Process social profiles
    if (output.social_profiles) {
      for (const social of output.social_profiles) {
        await this.db
          .insert(personaSocials)
          .values({
            id: generateUlid("psocial"),
            teamId,
            personaId,
            platform: this.mapPlatform(social.platform),
            profileUrl: social.url,
            username: social.username,
            isVerified: false,
            source: "skiptrace",
          })
          .onConflictDoNothing();

        socialsAdded++;
      }
    }

    // Process demographics
    if (output.demographics) {
      const demo = output.demographics;
      await this.db
        .insert(personaDemographics)
        .values({
          id: generateUlid("pdemo"),
          teamId,
          personaId,
          education: demo.education,
          occupation: demo.occupation,
          employer: demo.employer,
          incomeRange: demo.income_range,
          netWorthRange: demo.net_worth_range,
          maritalStatus: demo.marital_status,
          householdSize: demo.household_size,
          hasChildren: demo.has_children,
          homeOwnerStatus: demo.home_owner_status,
          lengthOfResidence: demo.length_of_residence,
          interests: demo.interests,
          source: "skiptrace",
        })
        .onConflictDoNothing();

      demographicsUpdated = true;
    }

    return {
      success: true,
      personaId,
      phonesAdded,
      emailsAdded,
      addressesAdded,
      socialsAdded,
      demographicsUpdated,
      matchConfidence: response.match_score,
    };
  }

  /**
   * Map phone type from API response
   */
  private mapPhoneType(
    type?: string,
  ): "mobile" | "landline" | "voip" | "unknown" {
    if (!type) return "unknown";
    const lower = type.toLowerCase();
    if (lower.includes("mobile") || lower.includes("cell")) return "mobile";
    if (lower.includes("landline") || lower.includes("land")) return "landline";
    if (lower.includes("voip")) return "voip";
    return "unknown";
  }

  /**
   * Map email type from API response
   */
  private mapEmailType(type?: string): "personal" | "business" | "unknown" {
    if (!type) return "unknown";
    const lower = type.toLowerCase();
    if (lower.includes("personal")) return "personal";
    if (lower.includes("business") || lower.includes("work")) return "business";
    return "unknown";
  }

  /**
   * Map address type from API response
   */
  private mapAddressType(
    type?: string,
  ): "residential" | "commercial" | "mailing" | "po_box" | "unknown" {
    if (!type) return "unknown";
    const lower = type.toLowerCase();
    if (lower.includes("residential") || lower.includes("home"))
      return "residential";
    if (lower.includes("commercial") || lower.includes("business"))
      return "commercial";
    if (lower.includes("mailing")) return "mailing";
    if (lower.includes("po") || lower.includes("box")) return "po_box";
    return "unknown";
  }

  /**
   * Map social platform from API response
   */
  private mapPlatform(
    platform: string,
  ): "linkedin" | "facebook" | "twitter" | "instagram" | "other" {
    const lower = platform.toLowerCase();
    if (lower.includes("linkedin")) return "linkedin";
    if (lower.includes("facebook")) return "facebook";
    if (lower.includes("twitter") || lower.includes("x.com")) return "twitter";
    if (lower.includes("instagram")) return "instagram";
    return "other";
  }
}
