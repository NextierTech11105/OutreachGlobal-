import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { apiKeys, ApiKeyType } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";

export interface CreateApiKeyOptions {
  teamId: string;
  userId?: string;
  name: string;
  description?: string;
  type?: ApiKeyType;
  expiresAt?: Date;
  permissions?: {
    canRead?: boolean;
    canWrite?: boolean;
    canDelete?: boolean;
    canManageTeam?: boolean;
    canManageUsers?: boolean;
    canAccessBilling?: boolean;
    allowedEndpoints?: string[];
    deniedEndpoints?: string[];
  };
}

export interface ApiKeyResponse {
  id: string;
  key: string; // The raw key - only shown once!
  keyPrefix: string;
  name: string;
  type: string;
  createdAt: Date;
}

@Injectable()
export class ApiKeyService {
  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Generate a random API key
   * Format: ntk_{type}_{random} (e.g., ntk_user_abc123...)
   */
  private generateApiKey(type: ApiKeyType): string {
    const typePrefix = type.toLowerCase();
    const random = crypto.randomBytes(32).toString("hex");
    return `ntk_${typePrefix}_${random}`;
  }

  /**
   * Hash an API key for storage
   */
  private hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
  }

  /**
   * Create a new API key for a team
   */
  async createKey(options: CreateApiKeyOptions): Promise<ApiKeyResponse> {
    const type = options.type || ApiKeyType.USER;

    // Generate the key
    const rawKey = this.generateApiKey(type);
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 16) + "...";

    // Insert into database
    const [keyRecord] = await this.db
      .insert(apiKeys)
      .values({
        keyHash,
        keyPrefix,
        type,
        teamId: options.teamId,
        userId: options.userId,
        name: options.name,
        description: options.description,
        permissions: options.permissions,
        expiresAt: options.expiresAt,
        isActive: true,
      })
      .returning();

    return {
      id: keyRecord.id,
      key: rawKey, // Only time the raw key is returned!
      keyPrefix,
      name: keyRecord.name,
      type: keyRecord.type,
      createdAt: keyRecord.createdAt,
    };
  }

  /**
   * List all API keys for a team
   */
  async listKeys(teamId: string) {
    const keys = await this.db.query.apiKeys.findMany({
      where: eq(apiKeys.teamId, teamId),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });

    // Don't return the hash, only the prefix
    return keys.map((k) => ({
      id: k.id,
      keyPrefix: k.keyPrefix,
      name: k.name,
      type: k.type,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    }));
  }

  /**
   * Revoke (delete) an API key
   */
  async revokeKey(keyId: string, teamId: string): Promise<boolean> {
    const result = await this.db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.teamId, teamId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Deactivate an API key (soft delete)
   */
  async deactivateKey(keyId: string, teamId: string): Promise<boolean> {
    const result = await this.db
      .update(apiKeys)
      .set({ isActive: false })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.teamId, teamId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Reactivate an API key
   */
  async activateKey(keyId: string, teamId: string): Promise<boolean> {
    const result = await this.db
      .update(apiKeys)
      .set({ isActive: true })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.teamId, teamId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Rotate an API key (create new one, deactivate old one)
   */
  async rotateKey(
    keyId: string,
    teamId: string,
  ): Promise<ApiKeyResponse | null> {
    // Get the existing key
    const existingKey = await this.db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, keyId), eq(apiKeys.teamId, teamId)),
    });

    if (!existingKey) {
      return null;
    }

    // Deactivate the old key
    await this.deactivateKey(keyId, teamId);

    // Create a new key with the same settings
    return this.createKey({
      teamId: existingKey.teamId,
      userId: existingKey.userId || undefined,
      name: existingKey.name + " (rotated)",
      description: existingKey.description || undefined,
      type: existingKey.type as ApiKeyType,
      permissions: existingKey.permissions as any,
    });
  }
}
