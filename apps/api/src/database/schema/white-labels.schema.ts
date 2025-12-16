/**
 * White Labels Schema
 * Defines white-label tenants (e.g., Homeowner Advisor, Nextier)
 */
import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { teams } from "./teams.schema";

/**
 * White Label Configuration
 * Each white-label is a separate branded instance of OutreachGlobal
 */
export const whiteLabels = pgTable("white_labels", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(), // e.g., "homeowner-advisor", "nextier"
  name: text("name").notNull(), // e.g., "Homeowner Advisor", "Nextier"
  description: text("description"),

  // Branding
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: text("primary_color").default("#3B82F6"),
  secondaryColor: text("secondary_color").default("#1E40AF"),
  accentColor: text("accent_color").default("#10B981"),

  // AI Assistant Names
  aiAssistantName: text("ai_assistant_name").default("Gianna"),
  aiSearchName: text("ai_search_name").default("LUCI"),
  aiFollowupName: text("ai_followup_name").default("Cathy"),
  aiDatalakeName: text("ai_datalake_name").default("Datalake"),

  // Domain Configuration
  customDomain: text("custom_domain"), // e.g., "app.homeowneradvisor.com"
  subdomain: text("subdomain"), // e.g., "homeowner" for homeowner.outreachglobal.com

  // DO Spaces Configuration
  spacesBucket: text("spaces_bucket").notNull(), // e.g., "homeowner-advisor-datalake"
  spacesRegion: text("spaces_region").default("nyc3"),

  // Feature Flags
  features: jsonb("features").$type<{
    skipTracing: boolean;
    smsMessaging: boolean;
    emailCampaigns: boolean;
    powerDialer: boolean;
    aiSdr: boolean;
    b2bEnrichment: boolean;
    propertyData: boolean;
    achievements: boolean;
  }>().default({
    skipTracing: true,
    smsMessaging: true,
    emailCampaigns: true,
    powerDialer: true,
    aiSdr: true,
    b2bEnrichment: true,
    propertyData: true,
    achievements: true,
  }),

  // Limits
  limits: jsonb("limits").$type<{
    maxTeams: number;
    maxUsersPerTeam: number;
    maxLeadsPerTeam: number;
    maxCampaignsPerTeam: number;
    apiRateLimit: number; // requests per minute
  }>().default({
    maxTeams: 100,
    maxUsersPerTeam: 50,
    maxLeadsPerTeam: 100000,
    maxCampaignsPerTeam: 100,
    apiRateLimit: 1000,
  }),

  // API Keys (platform-level, used when team doesn't have BYOK)
  platformKeys: jsonb("platform_keys").$type<{
    realestateApiKey?: string;
    signalhouseApiKey?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    sendgridApiKey?: string;
    apolloApiKey?: string;
  }>(),

  // Email Configuration
  emailSenderName: text("email_sender_name"),
  emailSenderAddress: text("email_sender_address"),
  supportEmail: text("support_email"),

  // Status
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * White Label Settings (key-value store for additional config)
 */
export const whiteLabelSettings = pgTable("white_label_settings", {
  id: text("id").primaryKey(),
  whiteLabelId: text("white_label_id")
    .notNull()
    .references(() => whiteLabels.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value"),
  type: text("type").default("string"), // string, json, number, boolean
  isEncrypted: boolean("is_encrypted").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const whiteLabelsRelations = relations(whiteLabels, ({ many }) => ({
  teams: many(teams),
  settings: many(whiteLabelSettings),
}));

export const whiteLabelSettingsRelations = relations(
  whiteLabelSettings,
  ({ one }) => ({
    whiteLabel: one(whiteLabels, {
      fields: [whiteLabelSettings.whiteLabelId],
      references: [whiteLabels.id],
    }),
  }),
);
