/**
 * White Label Service
 * Manages white-label configuration and team assignment
 */
import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  whiteLabelsTable,
  whiteLabelSettingsTable,
  teamsTable,
} from "@/database/schema-alias";
import { eq, and } from "drizzle-orm";
import { ConfigService } from "@nestjs/config";

export interface WhiteLabelConfig {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  aiAssistantName: string;
  aiSearchName: string;
  aiFollowupName: string;
  aiDatalakeName: string;
  customDomain: string | null;
  subdomain: string | null;
  spacesBucket: string;
  spacesRegion: string;
  features: {
    skipTracing: boolean;
    smsMessaging: boolean;
    emailCampaigns: boolean;
    powerDialer: boolean;
    aiSdr: boolean;
    b2bEnrichment: boolean;
    propertyData: boolean;
    achievements: boolean;
  };
  limits: {
    maxTeams: number;
    maxUsersPerTeam: number;
    maxLeadsPerTeam: number;
    maxCampaignsPerTeam: number;
    apiRateLimit: number;
  };
  emailSenderName: string | null;
  emailSenderAddress: string | null;
  supportEmail: string | null;
}

// Default white-label IDs
export const WHITE_LABEL_IDS = {
  HOMEOWNER_ADVISOR: "wl_homeowner_advisor",
  NEXTIER: "wl_nextier",
} as const;

@Injectable()
export class WhiteLabelService {
  private readonly logger = new Logger(WhiteLabelService.name);
  private cache: Map<string, WhiteLabelConfig> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  constructor(
    @InjectDB() private db: DrizzleClient,
    private configService: ConfigService,
  ) {}

  /**
   * Get white-label config by ID
   */
  async getById(id: string): Promise<WhiteLabelConfig | null> {
    // Check cache
    const cached = this.cache.get(`id:${id}`);
    if (cached) return cached;

    const results = await this.db
      .select()
      .from(whiteLabelsTable)
      .where(eq(whiteLabelsTable.id, id))
      .limit(1);

    const result = results[0];
    if (result) {
      const config = this.mapToConfig(result);
      this.cacheConfig(`id:${id}`, config);
      return config;
    }

    return null;
  }

  /**
   * Get white-label config by slug
   */
  async getBySlug(slug: string): Promise<WhiteLabelConfig | null> {
    const cached = this.cache.get(`slug:${slug}`);
    if (cached) return cached;

    const results = await this.db
      .select()
      .from(whiteLabelsTable)
      .where(eq(whiteLabelsTable.slug, slug))
      .limit(1);

    const result = results[0];
    if (result) {
      const config = this.mapToConfig(result);
      this.cacheConfig(`slug:${slug}`, config);
      return config;
    }

    return null;
  }

  /**
   * Get white-label config by custom domain
   */
  async getByDomain(domain: string): Promise<WhiteLabelConfig | null> {
    const cached = this.cache.get(`domain:${domain}`);
    if (cached) return cached;

    const results = await this.db
      .select()
      .from(whiteLabelsTable)
      .where(eq(whiteLabelsTable.customDomain, domain))
      .limit(1);

    const result = results[0];
    if (result) {
      const config = this.mapToConfig(result);
      this.cacheConfig(`domain:${domain}`, config);
      return config;
    }

    return null;
  }

  /**
   * Get white-label config for a team
   */
  async getForTeam(teamId: string): Promise<WhiteLabelConfig | null> {
    const cached = this.cache.get(`team:${teamId}`);
    if (cached) return cached;

    const teams = await this.db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.id, teamId))
      .limit(1);

    const team = teams[0];
    if (!team?.whiteLabelId) {
      // Default to Nextier if no white-label assigned
      return this.getById(WHITE_LABEL_IDS.NEXTIER);
    }

    const config = await this.getById(team.whiteLabelId);
    if (config) {
      this.cacheConfig(`team:${teamId}`, config);
    }
    return config;
  }

  /**
   * Assign a team to a white-label
   */
  async assignTeamToWhiteLabel(
    teamId: string,
    whiteLabelId: string,
  ): Promise<void> {
    await this.db
      .update(teamsTable)
      .set({ whiteLabelId, updatedAt: new Date() })
      .where(eq(teamsTable.id, teamId));

    // Invalidate cache
    // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete, not DB
    this.cache.delete(`team:${teamId}`);
    this.logger.log(`Assigned team ${teamId} to white-label ${whiteLabelId}`);
  }

  /**
   * Get all active white-labels
   */
  async getAll(): Promise<WhiteLabelConfig[]> {
    const results = await this.db
      .select()
      .from(whiteLabelsTable)
      .where(eq(whiteLabelsTable.isActive, true));

    return results.map((r) => this.mapToConfig(r));
  }

  /**
   * Get DO Spaces config for a white-label
   */
  async getSpacesConfig(whiteLabelId: string): Promise<{
    bucket: string;
    region: string;
    endpoint: string;
    key: string;
    secret: string;
  }> {
    const config = await this.getById(whiteLabelId);

    return {
      bucket:
        config?.spacesBucket ||
        this.configService.get("SPACES_BUCKET") ||
        "nextier-datalake",
      region:
        config?.spacesRegion ||
        this.configService.get("SPACES_REGION") ||
        "nyc3",
      endpoint:
        this.configService.get("SPACES_ENDPOINT") ||
        "https://nyc3.digitaloceanspaces.com",
      key: this.configService.get("SPACES_KEY") || "",
      secret: this.configService.get("SPACES_SECRET") || "",
    };
  }

  /**
   * Check if a feature is enabled for a white-label
   */
  async isFeatureEnabled(
    whiteLabelId: string,
    feature: keyof WhiteLabelConfig["features"],
  ): Promise<boolean> {
    const config = await this.getById(whiteLabelId);
    return config?.features[feature] ?? false;
  }

  /**
   * Get a setting value for a white-label
   */
  async getSetting(whiteLabelId: string, key: string): Promise<string | null> {
    const results = await this.db
      .select()
      .from(whiteLabelSettingsTable)
      .where(
        and(
          eq(whiteLabelSettingsTable.whiteLabelId, whiteLabelId),
          eq(whiteLabelSettingsTable.key, key),
        ),
      )
      .limit(1);

    return results[0]?.value ?? null;
  }

  /**
   * Set a setting value for a white-label
   */
  async setSetting(
    whiteLabelId: string,
    key: string,
    value: string,
    type: string = "string",
  ): Promise<void> {
    const id = `wls_${whiteLabelId}_${key}`.replace(/[^a-zA-Z0-9_]/g, "_");

    await this.db
      .insert(whiteLabelSettingsTable)
      .values({
        id,
        whiteLabelId,
        key,
        value,
        type,
      })
      .onConflictDoUpdate({
        target: whiteLabelSettingsTable.id,
        set: { value, updatedAt: new Date() },
      });
  }

  private mapToConfig(row: any): WhiteLabelConfig {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      logoUrl: row.logoUrl,
      faviconUrl: row.faviconUrl,
      primaryColor: row.primaryColor || "#3B82F6",
      secondaryColor: row.secondaryColor || "#1E40AF",
      accentColor: row.accentColor || "#10B981",
      aiAssistantName: row.aiAssistantName || "Gianna",
      aiSearchName: row.aiSearchName || "LUCI",
      aiFollowupName: row.aiFollowupName || "Cathy",
      aiDatalakeName: row.aiDatalakeName || "Datalake",
      customDomain: row.customDomain,
      subdomain: row.subdomain,
      spacesBucket: row.spacesBucket || "nextier-datalake",
      spacesRegion: row.spacesRegion || "nyc3",
      features: row.features || {
        skipTracing: true,
        smsMessaging: true,
        emailCampaigns: true,
        powerDialer: true,
        aiSdr: true,
        b2bEnrichment: true,
        propertyData: true,
        achievements: true,
      },
      limits: row.limits || {
        maxTeams: 100,
        maxUsersPerTeam: 50,
        maxLeadsPerTeam: 100000,
        maxCampaignsPerTeam: 100,
        apiRateLimit: 1000,
      },
      emailSenderName: row.emailSenderName,
      emailSenderAddress: row.emailSenderAddress,
      supportEmail: row.supportEmail,
    };
  }

  private cacheConfig(key: string, config: WhiteLabelConfig): void {
    this.cache.set(key, config);
    // eslint-disable-next-line drizzle/enforce-delete-with-where -- Map.delete, not DB
    setTimeout(() => this.cache.delete(key), this.cacheTimeout);
  }
}
