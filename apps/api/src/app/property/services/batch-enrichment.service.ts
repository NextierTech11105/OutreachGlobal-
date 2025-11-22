import { Injectable, Logger } from "@nestjs/common";
import { RealEstateService } from "./real-estate.service";
import { SpacesStorageService, PropertyIDRecord } from "./spaces-storage.service";

interface EnrichmentResult {
  propertyId: string;
  enriched: boolean;
  detail?: any;
  skipTrace?: any;
  error?: string;
}

@Injectable()
export class BatchEnrichmentService {
  private readonly logger = new Logger(BatchEnrichmentService.name);
  private readonly BATCH_SIZE = 250;

  constructor(
    private realEstateService: RealEstateService,
    private spacesStorage: SpacesStorageService,
  ) {}

  /**
   * Enrich saved property IDs with full detail payload
   * Processes in batches of 250 to avoid rate limits
   *
   * WORKFLOW:
   * 1. Get property IDs from Spaces
   * 2. Batch process 250 at a time
   * 3. Call PropertyDetail API for full payload
   * 4. Optionally skip trace for owner phones
   * 5. Store enriched data
   */
  async enrichSavedSearch(
    teamId: string,
    searchName: string,
    options: {
      includeSkipTrace?: boolean;
      maxProperties?: number;
    } = {},
  ): Promise<{
    totalProcessed: number;
    enriched: number;
    failed: number;
    results: EnrichmentResult[];
  }> {
    this.logger.log(`🔍 Starting enrichment for search: ${searchName}`);

    // 1. Get saved property IDs from Spaces
    const propertyRecords = await this.spacesStorage.getPreviousPropertyIDs(
      teamId,
      searchName,
      0, // Get today's saved IDs (most recent)
    );

    if (propertyRecords.length === 0) {
      this.logger.warn(`No property IDs found for search: ${searchName}`);
      return { totalProcessed: 0, enriched: 0, failed: 0, results: [] };
    }

    // Limit if maxProperties specified
    const propertiesToEnrich = options.maxProperties
      ? propertyRecords.slice(0, options.maxProperties)
      : propertyRecords;

    this.logger.log(
      `📊 Found ${propertyRecords.length} properties. Enriching ${propertiesToEnrich.length}...`,
    );

    // 2. Process in batches of 250
    const allResults: EnrichmentResult[] = [];
    const batches = this.chunkArray(propertiesToEnrich, this.BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.log(`⚙️  Processing batch ${i + 1}/${batches.length} (${batch.length} properties)`);

      const batchResults = await this.processBatch(batch, options.includeSkipTrace || false);
      allResults.push(...batchResults);

      // Add delay between batches to avoid rate limits
      if (i < batches.length - 1) {
        this.logger.log(`⏳ Waiting 2 seconds before next batch...`);
        await this.sleep(2000);
      }
    }

    const enriched = allResults.filter((r) => r.enriched).length;
    const failed = allResults.filter((r) => !r.enriched).length;

    this.logger.log(
      `✅ Enrichment complete: ${enriched} enriched, ${failed} failed out of ${allResults.length}`,
    );

    // 3. Save enriched data back to Spaces
    await this.saveEnrichedData(teamId, searchName, allResults);

    return {
      totalProcessed: allResults.length,
      enriched,
      failed,
      results: allResults,
    };
  }

  /**
   * Process a batch of properties (up to 250)
   */
  private async processBatch(
    batch: PropertyIDRecord[],
    includeSkipTrace: boolean,
  ): Promise<EnrichmentResult[]> {
    const results: EnrichmentResult[] = [];

    // Process properties in parallel (within the batch)
    const promises = batch.map(async (record) => {
      try {
        // Get full property detail
        const detail = await this.realEstateService.propertyDetail(record.propertyId);

        let skipTrace = undefined;

        // Optionally get skip trace data
        if (includeSkipTrace) {
          try {
            skipTrace = await this.realEstateService.skipTrace(record.propertyId);
          } catch (error) {
            this.logger.warn(
              `Skip trace failed for ${record.propertyId}: ${error.message}`,
            );
          }
        }

        return {
          propertyId: record.propertyId,
          enriched: true,
          detail,
          skipTrace,
        };
      } catch (error) {
        this.logger.error(
          `Failed to enrich ${record.propertyId}: ${error.message}`,
        );
        return {
          propertyId: record.propertyId,
          enriched: false,
          error: error.message,
        };
      }
    });

    const batchResults = await Promise.all(promises);
    return batchResults;
  }

  /**
   * Save enriched data to DigitalOcean Spaces
   */
  private async saveEnrichedData(
    teamId: string,
    searchName: string,
    results: EnrichmentResult[],
  ) {
    const enrichedRecords = results
      .filter((r) => r.enriched)
      .map((r) => ({
        propertyId: r.propertyId,
        externalId: r.detail?.externalId,
        capturedAt: new Date().toISOString(),
        snapshot: {
          ...r.detail,
          skipTrace: r.skipTrace,
          enrichedAt: new Date().toISOString(),
        },
      }));

    if (enrichedRecords.length === 0) {
      this.logger.warn("No enriched records to save");
      return;
    }

    // Save to Spaces with "_enriched" suffix
    await this.spacesStorage.savePropertyIDs(
      teamId,
      `${searchName}_enriched`,
      enrichedRecords,
    );

    this.logger.log(
      `💾 Saved ${enrichedRecords.length} enriched records to Spaces`,
    );
  }

  /**
   * Chunk array into batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get enrichment status for a saved search
   */
  async getEnrichmentStatus(teamId: string, searchName: string): Promise<{
    totalSaved: number;
    totalEnriched: number;
    percentageEnriched: number;
  }> {
    const savedRecords = await this.spacesStorage.getPreviousPropertyIDs(
      teamId,
      searchName,
      0,
    );

    const enrichedRecords = await this.spacesStorage.getPreviousPropertyIDs(
      teamId,
      `${searchName}_enriched`,
      0,
    );

    const totalSaved = savedRecords.length;
    const totalEnriched = enrichedRecords.length;
    const percentageEnriched = totalSaved > 0 ? (totalEnriched / totalSaved) * 100 : 0;

    return {
      totalSaved,
      totalEnriched,
      percentageEnriched,
    };
  }
}
