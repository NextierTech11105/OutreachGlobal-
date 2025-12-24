import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { teamsRef } from "./teams.schema";
import { leads } from "./leads.schema";
import { campaigns } from "./campaigns.schema";
import { messages } from "./messages.schema";
import { aiSdrAvatars } from "./ai-sdr-avatars.schema";
import {
  ResponseClassification,
  InboxPriority,
  BucketType,
  SuppressionType,
} from "@nextier/common";

// Primary key prefixes
export const INBOX_ITEM_PK = "inb";
export const RESPONSE_BUCKET_PK = "rbkt";
export const BUCKET_MOVEMENT_PK = "bmov";
export const SUPPRESSION_PK = "supp";

// Universal Inbox - all incoming responses land here first
export const inboxItems = pgTable(
  "inbox_items",
  {
    id: primaryUlid(INBOX_ITEM_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    leadId: ulidColumn().references(() => leads.id, { onDelete: "cascade" }),
    messageId: ulidColumn().references(() => messages.id, {
      onDelete: "cascade",
    }),
    campaignId: ulidColumn().references(() => campaigns.id, {
      onDelete: "set null",
    }),
    assignedSdrId: ulidColumn().references(() => aiSdrAvatars.id, {
      onDelete: "set null",
    }),

    // Classification
    classification: varchar()
      .notNull()
      .$type<ResponseClassification>()
      .default(ResponseClassification.UNCLASSIFIED),
    classificationConfidence: integer().default(0),
    classifiedAt: timestamp(),
    classifiedBy: varchar(),

    // Priority scoring
    priority: varchar().$type<InboxPriority>().default(InboxPriority.WARM),
    priorityScore: integer().notNull().default(50),

    // Current bucket
    currentBucket: varchar()
      .$type<BucketType>()
      .default(BucketType.UNIVERSAL_INBOX),

    // Content
    responseText: text(),
    phoneNumber: varchar(),

    // Flags
    isRead: boolean().default(false),
    isStarred: boolean().default(false),
    requiresReview: boolean().default(false),
    isProcessed: boolean().default(false),

    // AI Analysis
    sentiment: varchar(),
    intent: varchar(),
    suggestedAction: text(),
    aiNotes: text(),

    // Tracking
    processedAt: timestamp(),
    processedBy: varchar(),
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [
    index("inbox_items_team_idx").on(t.teamId),
    index("inbox_items_lead_idx").on(t.leadId),
    index("inbox_items_bucket_idx").on(t.currentBucket),
    index("inbox_items_priority_idx").on(t.priority),
    index("inbox_items_classification_idx").on(t.classification),
    index("inbox_items_processed_idx").on(t.isProcessed),
    // Hot path: inbox processing - partial index for unprocessed items
    index("inbox_items_processing_hot_idx").on(
      t.teamId,
      t.isProcessed,
      t.priority,
    ),
  ],
);

// Response Buckets (Kanban columns)
export const responseBuckets = pgTable("response_buckets", {
  id: primaryUlid(RESPONSE_BUCKET_PK),
  teamId: teamsRef({ onDelete: "cascade" }).notNull(),
  type: varchar().notNull().$type<BucketType>(),
  name: varchar().notNull(),
  description: text(),
  color: varchar().default("#6366f1"),
  icon: varchar().default("inbox"),
  position: integer().notNull().default(0),
  isSystem: boolean().default(false),
  autoMoveRules: jsonb().$type<
    {
      conditions: { field: string; operator: string; value: string }[];
      targetBucket: BucketType;
    }[]
  >(),
  createdAt,
  updatedAt,
});

// Bucket movement history (audit trail)
export const bucketMovements = pgTable(
  "bucket_movements",
  {
    id: primaryUlid(BUCKET_MOVEMENT_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    inboxItemId: ulidColumn()
      .references(() => inboxItems.id, { onDelete: "cascade" })
      .notNull(),
    fromBucket: varchar().$type<BucketType>(),
    toBucket: varchar().notNull().$type<BucketType>(),
    movedBy: varchar().notNull(),
    reason: text(),
    createdAt,
  },
  (t) => [index().on(t.inboxItemId), index().on(t.teamId)],
);

// Suppression/Blacklist entries
export const suppressionList = pgTable(
  "suppression_list",
  {
    id: primaryUlid(SUPPRESSION_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    phoneNumber: varchar().notNull(),
    type: varchar().notNull().$type<SuppressionType>(),
    reason: text(),
    sourceInboxItemId: ulidColumn().references(() => inboxItems.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp(),
    confirmedBy: varchar(),
    expiresAt: timestamp(),
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.teamId), index().on(t.phoneNumber), index().on(t.type)],
);
