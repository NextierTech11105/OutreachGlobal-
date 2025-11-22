import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { savedSearches, savedSearchResults } from "@/database/schema";
import { Database, DATABASE_PROVIDER } from "@haorama/drizzle-postgres-nestjs";
import { SpacesStorageService, PropertyIDRecord } from "./spaces-storage.service";
import { EventDetectionService, PropertyEvent, EVENT_MATRIX } from "./event-detection.service";
import { RealEstateService } from "./real-estate.service";

interface PropertyEventRecord {
  propertyId: string;
  events: PropertyEvent[];
  oldData: Record<string, any>;
  newData: Record<string, any>;
}

@Injectable()
export class PropertyTrackingService {
  private readonly logger = new Logger(PropertyTrackingService.name);

  constructor(
    @Inject(DATABASE_PROVIDER) private db: Database,
    private spacesStorage: SpacesStorageService,
    private eventDetection: EventDetectionService,
    private realEstateService: RealEstateService,
  ) {}

  /**
   * DAILY CRON JOB - Runs at midnight to track saved searches
   * Compares property IDs and detects events
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyTracking() {
    this.logger.log("🚀 Starting daily property tracking...");

    // Get all saved searches with batch job enabled
    const searches = await this.db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.batchJobEnabled, "true"));

    this.logger.log(`Found ${searches.length} saved searches to track`);

    for (const search of searches) {
      try {
        await this.trackSavedSearch(
          search.id,
          search.teamId,
          search.searchName,
          search.searchQuery as Record<string, any>,
        );
      } catch (error) {
        this.logger.error(`Failed to track search ${search.searchName}: ${error.message}`);
      }
    }

    this.logger.log("✅ Daily property tracking completed");
  }

  /**
   * Track a single saved search
   * 1. Execute property search
   * 2. Get previous day's property IDs from Spaces
   * 3. Compare and detect changes
   * 4. Detect events for updated properties
   * 5. Trigger campaigns for critical events
   * 6. Push notifications to dashboard
   * 7. Save new property IDs to Spaces
   */
  async trackSavedSearch(
    searchId: string,
    teamId: string,
    searchName: string,
    searchQuery: Record<string, any>,
  ): Promise<{
    added: number;
    deleted: number;
    updated: number;
    events: PropertyEventRecord[];
  }> {
    this.logger.log(`📊 Tracking search: ${searchName}`);

    // 1. Execute property search with current query
    const { data: currentProperties } = await this.realEstateService.propertySearch({
      ...searchQuery,
      size: 50000, // Get up to 50k properties
    });

    // 2. Get previous day's property IDs from Spaces
    const previousRecords = await this.spacesStorage.getPreviousPropertyIDs(
      teamId,
      searchName,
      1, // 1 day ago
    );

    // 3. Convert current properties to PropertyIDRecord format
    const currentRecords: PropertyIDRecord[] = currentProperties.map((prop: any) => ({
      propertyId: prop.id || prop.propertyId,
      externalId: prop.externalId,
      capturedAt: new Date().toISOString(),
      snapshot: {
        // Key fields for tracking
        ownerName: prop.ownerName,
        lastSaleDate: prop.lastSaleDate,
        yearsOwned: prop.yearsOwned,
        mlsListed: prop.mlsListed,
        mlsPrice: prop.mlsPrice,
        preForeclosure: prop.preForeclosure,
        foreclosure: prop.foreclosure,
        lisPendens: prop.lisPendens,
        taxLien: prop.taxLien,
        bankruptcy: prop.bankruptcy,
        vacant: prop.vacant,
        absenteeOwner: prop.absenteeOwner,
        equityPercent: prop.equityPercent,
        estimatedValue: prop.estimatedValue,
        propertiesOwned: prop.propertiesOwned,
        portfolioPurchasedLast12: prop.portfolioPurchasedLast12,
        deedType: prop.deedType,
      },
    }));

    // 4. Compare and detect changes
    const { added, deleted, updated } = this.spacesStorage.comparePropertySets(
      currentRecords,
      previousRecords,
    );

    this.logger.log(
      `📈 Changes: +${added.length} added, -${deleted.length} deleted, ~${updated.length} updated`,
    );

    // 5. Detect events for updated properties
    const eventsDetected: PropertyEventRecord[] = [];

    for (const updatedRecord of updated) {
      const previousRecord = previousRecords.find((p) => p.propertyId === updatedRecord.propertyId);
      if (!previousRecord) continue;

      const events = this.eventDetection.detectEvents(
        previousRecord.snapshot,
        updatedRecord.snapshot,
      );

      if (events.length > 0) {
        eventsDetected.push({
          propertyId: updatedRecord.propertyId,
          events,
          oldData: previousRecord.snapshot,
          newData: updatedRecord.snapshot,
        });

        // Store event in database
        await this.storePropertyEvent(searchId, updatedRecord, events);
      }
    }

    this.logger.log(`🎯 Detected ${eventsDetected.length} properties with events`);

    // 6. Trigger campaigns for critical events
    const criticalEvents = eventsDetected.filter((record) =>
      record.events.some((event) => EVENT_MATRIX[event].triggerCampaign),
    );

    if (criticalEvents.length > 0) {
      this.logger.log(`🚨 ${criticalEvents.length} properties triggered campaigns`);
      await this.triggerCampaigns(teamId, criticalEvents);
    }

    // 7. Push notifications to dashboard
    await this.pushDashboardNotifications(teamId, searchName, eventsDetected);

    // 8. Save new property IDs to Spaces
    await this.spacesStorage.savePropertyIDs(teamId, searchName, currentRecords);

    // 9. Update saved search stats
    await this.db
      .update(savedSearches)
      .set({
        totalProperties: currentRecords.length.toString(),
        addedCount: added.length.toString(),
        deletedCount: deleted.length.toString(),
        updatedCount: updated.length.toString(),
        lastBatchJobAt: new Date(),
        batchJobStatus: "completed",
      })
      .where(eq(savedSearches.id, searchId));

    return {
      added: added.length,
      deleted: deleted.length,
      updated: updated.length,
      events: eventsDetected,
    };
  }

  /**
   * Store property event in database with signal history
   */
  private async storePropertyEvent(
    searchId: string,
    record: PropertyIDRecord,
    events: PropertyEvent[],
  ) {
    // Check if property already tracked
    const existing = await this.db
      .select()
      .from(savedSearchResults)
      .where(eq(savedSearchResults.propertyId, record.propertyId))
      .limit(1);

    const eventMetadata = events.map((event) => ({
      event: event,
      ...EVENT_MATRIX[event],
    }));

    if (existing.length > 0) {
      // Update existing record
      const currentHistory = (existing[0].signalHistory || []) as any[];
      const newHistoryEntry = {
        date: new Date().toISOString(),
        events: events,
        signals: record.snapshot,
        changeType: "updated",
      };

      await this.db
        .update(savedSearchResults)
        .set({
          lastSeenAt: new Date(),
          lastUpdateDate: new Date(),
          timesFound: (parseInt(existing[0].timesFound || "1") + 1).toString(),
          signals: record.snapshot as any,
          signalHistory: [...currentHistory, newHistoryEntry] as any,
          propertyData: record.snapshot as any,
        })
        .where(eq(savedSearchResults.id, existing[0].id));
    } else {
      // Insert new record
      await this.db.insert(savedSearchResults).values({
        savedSearchId: searchId,
        propertyId: record.propertyId,
        externalId: record.externalId,
        changeType: "added",
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        lastUpdateDate: new Date(),
        timesFound: "1",
        signals: record.snapshot as any,
        signalHistory: [
          {
            date: new Date().toISOString(),
            events: events,
            signals: record.snapshot,
            changeType: "added",
          },
        ] as any,
        propertyData: record.snapshot as any,
      });
    }
  }

  /**
   * Trigger SMS campaigns for critical events
   */
  private async triggerCampaigns(teamId: string, eventRecords: PropertyEventRecord[]) {
    this.logger.log(`🎯 Triggering campaigns for ${eventRecords.length} properties`);

    for (const record of eventRecords) {
      const triggeredEvents = this.eventDetection.getTriggeredEvents(record.events);

      for (const event of triggeredEvents) {
        const metadata = EVENT_MATRIX[event];

        this.logger.log(
          `📱 Campaign triggered for ${record.propertyId}: ${metadata.description} (${metadata.campaignType})`,
        );

        // TODO: Integrate with campaign service
        // - Get owner phones via skip trace
        // - Create SMS/email campaign
        // - Execute via Twilio Studio + SignalHouse.io
      }
    }
  }

  /**
   * Push notifications to dashboard (ping system)
   */
  private async pushDashboardNotifications(
    teamId: string,
    searchName: string,
    eventRecords: PropertyEventRecord[],
  ) {
    if (eventRecords.length === 0) return;

    this.logger.log(`🔔 Pushing ${eventRecords.length} notifications to dashboard`);

    // TODO: Integrate with notification service (WebSocket/SSE)
    // - Push real-time alerts to dashboard
    // - Show property events in activity feed
    // - Display critical events prominently

    const criticalEvents = eventRecords.filter((r) =>
      r.events.some((e) => EVENT_MATRIX[e].priority === "critical"),
    );

    this.logger.log(
      `🚨 ${criticalEvents.length} CRITICAL events for search "${searchName}"`,
    );
  }

  /**
   * Manual trigger for tracking a specific saved search
   */
  async trackSearchManually(searchId: string) {
    const search = await this.db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.id, searchId))
      .limit(1);

    if (search.length === 0) {
      throw new Error("Saved search not found");
    }

    return await this.trackSavedSearch(
      search[0].id,
      search[0].teamId,
      search[0].searchName,
      search[0].searchQuery as Record<string, any>,
    );
  }
}
