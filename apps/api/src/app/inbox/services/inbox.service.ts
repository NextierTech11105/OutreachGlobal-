import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, desc, ilike, sql, count } from "drizzle-orm";
import {
  inboxItemsTable,
  responseBucketsTable,
  bucketMovementsTable,
  suppressionListTable,
} from "@/database/schema-alias";
import {
  BucketType,
  InboxPriority,
  ResponseClassification,
  SuppressionType,
} from "@nextier/common";
import { InboxFilter } from "../types/inbox.type";
import { ModelNotFoundError } from "@/database/exceptions";

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Paginate inbox items with filters
   */
  async paginate(args: InboxFilter & { first?: number; after?: string }) {
    const {
      teamId,
      bucket,
      priority,
      classification,
      isProcessed,
      isRead,
      searchQuery,
    } = args;

    const conditions = [eq(inboxItemsTable.teamId, teamId)];

    if (bucket) conditions.push(eq(inboxItemsTable.currentBucket, bucket));
    if (priority) conditions.push(eq(inboxItemsTable.priority, priority));
    if (classification)
      conditions.push(eq(inboxItemsTable.classification, classification));
    if (isProcessed !== undefined)
      conditions.push(eq(inboxItemsTable.isProcessed, isProcessed));
    if (isRead !== undefined)
      conditions.push(eq(inboxItemsTable.isRead, isRead));
    if (searchQuery) {
      conditions.push(ilike(inboxItemsTable.responseText, `%${searchQuery}%`));
    }

    const items = await this.db.query.inboxItems.findMany({
      where: and(...conditions),
      orderBy: [
        desc(inboxItemsTable.priorityScore),
        desc(inboxItemsTable.createdAt),
      ],
      limit: args.first ?? 50,
    });

    return {
      edges: items.map((item) => ({ node: item, cursor: item.id })),
      pageInfo: {
        hasNextPage: items.length === (args.first ?? 50),
        hasPreviousPage: false,
        startCursor: items[0]?.id,
        endCursor: items[items.length - 1]?.id,
      },
    };
  }

  /**
   * Find one inbox item
   */
  async findOne(teamId: string, id: string) {
    return this.db.query.inboxItems.findFirst({
      where: and(
        eq(inboxItemsTable.teamId, teamId),
        eq(inboxItemsTable.id, id),
      ),
    });
  }

  /**
   * Find one or throw
   */
  async findOneOrFail(teamId: string, id: string) {
    const item = await this.findOne(teamId, id);
    if (!item) throw new ModelNotFoundError("Inbox item not found");
    return item;
  }

  /**
   * Update inbox item
   */
  async update(
    teamId: string,
    id: string,
    data: Partial<typeof inboxItemsTable.$inferInsert>,
  ) {
    const [item] = await this.db
      .update(inboxItemsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(inboxItemsTable.teamId, teamId), eq(inboxItemsTable.id, id)),
      )
      .returning();

    if (!item) throw new ModelNotFoundError("Inbox item not found");
    return { inboxItem: item };
  }

  /**
   * Move item to bucket
   */
  async moveToBucket(
    teamId: string,
    id: string,
    targetBucket: BucketType,
    movedBy: string,
    reason?: string,
  ) {
    const item = await this.findOneOrFail(teamId, id);

    const [updated] = await this.db
      .update(inboxItemsTable)
      .set({ currentBucket: targetBucket, updatedAt: new Date() })
      .where(eq(inboxItemsTable.id, id))
      .returning();

    await this.db.insert(bucketMovementsTable).values({
      teamId,
      inboxItemId: id,
      fromBucket: item.currentBucket,
      toBucket: targetBucket,
      movedBy,
      reason,
    });

    // Handle suppression for blacklist/DNC buckets
    if (
      targetBucket === BucketType.BLACKLIST ||
      targetBucket === BucketType.LEGAL_DNC
    ) {
      await this.addToSuppressionList(
        teamId,
        item.phoneNumber!,
        targetBucket === BucketType.BLACKLIST
          ? SuppressionType.BLACKLIST
          : SuppressionType.LEGAL_DNC,
        reason,
        id,
      );
    }

    this.logger.log(
      `Moved item ${id} from ${item.currentBucket} to ${targetBucket}`,
    );
    return { inboxItem: updated };
  }

  /**
   * Bulk move items
   */
  async bulkMove(
    teamId: string,
    itemIds: string[],
    targetBucket: BucketType,
    movedBy: string,
    reason?: string,
  ) {
    let movedCount = 0;

    for (const id of itemIds) {
      try {
        await this.moveToBucket(teamId, id, targetBucket, movedBy, reason);
        movedCount++;
      } catch (e) {
        this.logger.warn(`Failed to move item ${id}: ${e}`);
      }
    }

    return { movedCount };
  }

  /**
   * Process inbox item (classify, assign SDR if needed)
   */
  async processItem(
    teamId: string,
    id: string,
    processedBy: string,
    data: {
      classification?: ResponseClassification;
      targetBucket?: BucketType;
      notes?: string;
      markAsProcessed?: boolean;
    },
  ) {
    const updates: Partial<typeof inboxItemsTable.$inferInsert> = {
      processedBy,
      updatedAt: new Date(),
    };

    if (data.classification) {
      updates.classification = data.classification;
      updates.classifiedAt = new Date();
      updates.classifiedBy = processedBy;
    }

    if (data.notes) {
      updates.aiNotes = data.notes;
    }

    if (data.markAsProcessed) {
      updates.isProcessed = true;
      updates.processedAt = new Date();
    }

    const [item] = await this.db
      .update(inboxItemsTable)
      .set(updates)
      .where(
        and(eq(inboxItemsTable.teamId, teamId), eq(inboxItemsTable.id, id)),
      )
      .returning();

    if (!item) throw new ModelNotFoundError("Inbox item not found");

    // Move to target bucket if specified
    if (data.targetBucket && data.targetBucket !== item.currentBucket) {
      return this.moveToBucket(
        teamId,
        id,
        data.targetBucket,
        processedBy,
        data.notes,
      );
    }

    return { inboxItem: item };
  }

  /**
   * Get bucket statistics
   */
  async getBucketStats(teamId: string) {
    const buckets = await this.db.query.responseBuckets.findMany({
      where: eq(responseBucketsTable.teamId, teamId),
    });

    const stats = await Promise.all(
      buckets.map(async (bucket) => {
        const [countResult] = await this.db
          .select({ count: count() })
          .from(inboxItemsTable)
          .where(
            and(
              eq(inboxItemsTable.teamId, teamId),
              eq(inboxItemsTable.currentBucket, bucket.type),
            ),
          );

        const [unreadResult] = await this.db
          .select({ count: count() })
          .from(inboxItemsTable)
          .where(
            and(
              eq(inboxItemsTable.teamId, teamId),
              eq(inboxItemsTable.currentBucket, bucket.type),
              eq(inboxItemsTable.isRead, false),
            ),
          );

        return {
          bucket: bucket.type,
          name: bucket.name,
          count: countResult?.count ?? 0,
          unreadCount: unreadResult?.count ?? 0,
          color: bucket.color,
          icon: bucket.icon,
        };
      }),
    );

    return stats;
  }

  /**
   * Get overall inbox stats
   */
  async getInboxStats(teamId: string) {
    const [total] = await this.db
      .select({ count: count() })
      .from(inboxItemsTable)
      .where(eq(inboxItemsTable.teamId, teamId));

    const [unread] = await this.db
      .select({ count: count() })
      .from(inboxItemsTable)
      .where(
        and(
          eq(inboxItemsTable.teamId, teamId),
          eq(inboxItemsTable.isRead, false),
        ),
      );

    const [needsReview] = await this.db
      .select({ count: count() })
      .from(inboxItemsTable)
      .where(
        and(
          eq(inboxItemsTable.teamId, teamId),
          eq(inboxItemsTable.requiresReview, true),
        ),
      );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bucketStats = await this.getBucketStats(teamId);

    return {
      totalItems: total?.count ?? 0,
      unreadCount: unread?.count ?? 0,
      requiresReviewCount: needsReview?.count ?? 0,
      processedToday: 0, // Would need proper date filtering
      bucketStats,
    };
  }

  /**
   * Add phone to suppression list
   */
  async addToSuppressionList(
    teamId: string,
    phoneNumber: string,
    type: SuppressionType,
    reason?: string,
    sourceInboxItemId?: string,
  ) {
    const [entry] = await this.db
      .insert(suppressionListTable)
      .values({
        teamId,
        phoneNumber,
        type,
        reason,
        sourceInboxItemId,
        confirmedAt: new Date(),
        confirmedBy: "SYSTEM",
      })
      .returning();

    this.logger.log(`Added ${phoneNumber} to ${type} suppression list`);
    return { suppressionEntry: entry };
  }

  /**
   * Remove from suppression list
   */
  async removeFromSuppressionList(teamId: string, id: string) {
    const [deleted] = await this.db
      .delete(suppressionListTable)
      .where(
        and(
          eq(suppressionListTable.teamId, teamId),
          eq(suppressionListTable.id, id),
        ),
      )
      .returning();

    if (!deleted) throw new ModelNotFoundError("Suppression entry not found");
    return { deletedSuppressionId: id };
  }

  /**
   * Get suppression list
   */
  async getSuppressionList(
    teamId: string,
    type?: SuppressionType,
    searchQuery?: string,
  ) {
    const conditions = [eq(suppressionListTable.teamId, teamId)];

    if (type) conditions.push(eq(suppressionListTable.type, type));
    if (searchQuery) {
      conditions.push(
        ilike(suppressionListTable.phoneNumber, `%${searchQuery}%`),
      );
    }

    const entries = await this.db.query.suppressionList.findMany({
      where: and(...conditions),
      orderBy: [desc(suppressionListTable.createdAt)],
    });

    return {
      edges: entries.map((entry) => ({ node: entry, cursor: entry.id })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: entries[0]?.id,
        endCursor: entries[entries.length - 1]?.id,
      },
    };
  }

  /**
   * Get response buckets for team
   */
  async getResponseBuckets(teamId: string) {
    return this.db.query.responseBuckets.findMany({
      where: eq(responseBucketsTable.teamId, teamId),
      orderBy: [responseBucketsTable.position],
    });
  }

  /**
   * Initialize default buckets for team
   */
  async initializeDefaultBuckets(teamId: string) {
    const defaultBuckets = [
      {
        type: BucketType.UNIVERSAL_INBOX,
        name: "Universal Inbox",
        icon: "inbox",
        color: "#6366f1",
        position: 0,
      },
      {
        type: BucketType.POSITIVE_RESPONSES,
        name: "Positive Responses",
        icon: "thumbs-up",
        color: "#22c55e",
        position: 1,
      },
      {
        type: BucketType.NEUTRAL_REVIEW,
        name: "Neutral Review",
        icon: "meh",
        color: "#f59e0b",
        position: 2,
      },
      {
        type: BucketType.WRONG_NUMBER,
        name: "Wrong Number",
        icon: "phone-off",
        color: "#ef4444",
        position: 3,
      },
      {
        type: BucketType.PROFANITY_REVIEW,
        name: "Profanity Review",
        icon: "alert-triangle",
        color: "#f97316",
        position: 4,
      },
      {
        type: BucketType.BLACKLIST,
        name: "Blacklist",
        icon: "ban",
        color: "#1f2937",
        position: 5,
      },
      {
        type: BucketType.LEGAL_DNC,
        name: "Legal DNC",
        icon: "shield",
        color: "#dc2626",
        position: 6,
      },
    ];

    for (const bucket of defaultBuckets) {
      await this.db
        .insert(responseBucketsTable)
        .values({ teamId, ...bucket, isSystem: true })
        .onConflictDoNothing();
    }

    return this.getResponseBuckets(teamId);
  }
}
