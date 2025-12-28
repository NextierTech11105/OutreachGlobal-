import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { apiKeys, teams, users } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";

/**
 * API Key Guard
 *
 * Authenticates requests using X-API-Key header instead of JWT.
 * This allows customers to use a simple API key for authentication.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Hash an API key for comparison with stored hash
   */
  private hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
  }

  /**
   * Extract API key from request headers
   */
  private extractApiKey(request: any): string | null {
    // Check X-API-Key header (preferred)
    const apiKey = request.headers["x-api-key"];
    if (apiKey) return apiKey;

    // Also check Authorization header with "ApiKey" scheme
    const authHeader = request.headers["authorization"];
    if (authHeader?.startsWith("ApiKey ")) {
      return authHeader.slice(7);
    }

    return null;
  }

  /**
   * Get request object from execution context
   */
  private getRequest(context: ExecutionContext): any {
    const type = context.getType<GqlContextType>();

    if (type === "graphql") {
      const ctx = GqlExecutionContext.create(context);
      return ctx.getContext().req;
    }

    return context.switchToHttp().getRequest();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest(context);
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException("Missing API key");
    }

    // Hash the provided key for comparison
    const keyHash = this.hashKey(apiKey);

    // Look up the key in the database
    const keyRecord = await this.db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)),
    });

    if (!keyRecord) {
      throw new UnauthorizedException("Invalid API key");
    }

    // Check if key has expired
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      throw new UnauthorizedException("API key has expired");
    }

    // Get the team
    const team = await this.db.query.teams.findFirst({
      where: eq(teams.id, keyRecord.teamId),
    });

    if (!team) {
      throw new UnauthorizedException("Team not found");
    }

    // Get the user if associated
    let user: any = null;
    if (keyRecord.userId) {
      user = await this.db.query.users.findFirst({
        where: eq(users.id, keyRecord.userId),
      });
    } else {
      // Get the team owner as the user
      user = await this.db.query.users.findFirst({
        where: eq(users.id, team.ownerId),
      });
    }

    // Update last used timestamp (fire and forget)
    this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, keyRecord.id))
      .execute()
      .catch(() => {});

    // Set context on request
    request["user"] = user;
    request["team"] = team;
    request["apiKey"] = keyRecord;
    request["apiKeyType"] = keyRecord.type;

    // For JWT compatibility, create a fake token payload
    request["tokenPayload"] = {
      sub: user?.id,
      email: user?.email,
      teamId: team.id,
      apiKeyId: keyRecord.id,
      apiKeyType: keyRecord.type,
    };

    return true;
  }
}
