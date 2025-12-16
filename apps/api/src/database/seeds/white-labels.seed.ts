/**
 * White Labels Seed Data
 * Seeds the two primary white-labels: Homeowner Advisor and Nextier
 */
import { whiteLabelsTable } from "../schema-alias";
import { DrizzleClient } from "../types";

export const WHITE_LABEL_IDS = {
  HOMEOWNER_ADVISOR: "wl_homeowner_advisor",
  NEXTIER: "wl_nextier",
} as const;

export const whiteLabelsSeed = [
  // Homeowner Advisor - Real Estate/Property focused
  {
    id: WHITE_LABEL_IDS.HOMEOWNER_ADVISOR,
    slug: "homeowner-advisor",
    name: "Homeowner Advisor",
    description: "Real estate lead generation and property owner outreach platform",

    // Branding
    logoUrl: null, // Set via DO Spaces
    faviconUrl: null,
    primaryColor: "#2563EB", // Blue
    secondaryColor: "#1E40AF",
    accentColor: "#059669", // Green

    // AI Assistants
    aiAssistantName: "Sophie",
    aiSearchName: "PropertySearch",
    aiFollowupName: "HomeBot",
    aiDatalakeName: "PropertyData",

    // Domain
    customDomain: "app.homeowneradvisor.com",
    subdomain: "homeowner",

    // DO Spaces
    spacesBucket: "homeowner-advisor-datalake",
    spacesRegion: "nyc3",

    // Features - Property/Real Estate focused
    features: {
      skipTracing: true,
      smsMessaging: true,
      emailCampaigns: true,
      powerDialer: true,
      aiSdr: true,
      b2bEnrichment: false, // Disabled - property focused
      propertyData: true,
      achievements: true,
    },

    // Limits
    limits: {
      maxTeams: 500,
      maxUsersPerTeam: 100,
      maxLeadsPerTeam: 500000,
      maxCampaignsPerTeam: 500,
      apiRateLimit: 2000,
    },

    // Email
    emailSenderName: "Sophie | Homeowner Advisor",
    emailSenderAddress: "sophie@homeowneradvisor.com",
    supportEmail: "support@homeowneradvisor.com",

    isActive: true,
  },

  // Nextier - B2B/Business Broker focused
  {
    id: WHITE_LABEL_IDS.NEXTIER,
    slug: "nextier",
    name: "Nextier",
    description: "B2B deal sourcing and business broker outreach platform",

    // Branding
    logoUrl: null, // Set via DO Spaces
    faviconUrl: null,
    primaryColor: "#3B82F6", // Blue
    secondaryColor: "#1E40AF",
    accentColor: "#10B981", // Emerald

    // AI Assistants
    aiAssistantName: "Gianna",
    aiSearchName: "LUCI",
    aiFollowupName: "Cathy",
    aiDatalakeName: "Datalake",

    // Domain
    customDomain: "app.nextier.io",
    subdomain: "nextier",

    // DO Spaces
    spacesBucket: "nextier-datalake",
    spacesRegion: "nyc3",

    // Features - B2B focused
    features: {
      skipTracing: true,
      smsMessaging: true,
      emailCampaigns: true,
      powerDialer: true,
      aiSdr: true,
      b2bEnrichment: true, // Enabled - B2B focused
      propertyData: true, // Also supports property
      achievements: true,
    },

    // Limits
    limits: {
      maxTeams: 1000,
      maxUsersPerTeam: 200,
      maxLeadsPerTeam: 1000000,
      maxCampaignsPerTeam: 1000,
      apiRateLimit: 5000,
    },

    // Email
    emailSenderName: "Gianna | Nextier",
    emailSenderAddress: "gianna@nextier.io",
    supportEmail: "support@nextier.io",

    isActive: true,
  },
];

/**
 * Seed white labels into database
 */
export async function seedWhiteLabels(db: DrizzleClient) {
  console.log("Seeding white labels...");

  for (const whiteLabel of whiteLabelsSeed) {
    await db
      .insert(whiteLabelsTable)
      .values(whiteLabel)
      .onConflictDoUpdate({
        target: whiteLabelsTable.id,
        set: {
          name: whiteLabel.name,
          description: whiteLabel.description,
          logoUrl: whiteLabel.logoUrl,
          primaryColor: whiteLabel.primaryColor,
          secondaryColor: whiteLabel.secondaryColor,
          accentColor: whiteLabel.accentColor,
          aiAssistantName: whiteLabel.aiAssistantName,
          aiSearchName: whiteLabel.aiSearchName,
          aiFollowupName: whiteLabel.aiFollowupName,
          aiDatalakeName: whiteLabel.aiDatalakeName,
          customDomain: whiteLabel.customDomain,
          subdomain: whiteLabel.subdomain,
          spacesBucket: whiteLabel.spacesBucket,
          features: whiteLabel.features,
          limits: whiteLabel.limits,
          emailSenderName: whiteLabel.emailSenderName,
          emailSenderAddress: whiteLabel.emailSenderAddress,
          supportEmail: whiteLabel.supportEmail,
          updatedAt: new Date(),
        },
      });

    console.log(`  ✓ ${whiteLabel.name} (${whiteLabel.slug})`);
  }

  console.log("White labels seeded successfully!");
}
