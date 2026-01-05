import { JwtService } from "@/lib/jwt/jwt.service";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { JwtGuard } from "./jwt.guard";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { apiKeys, teams, users, tenants } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";

/**
 * Combined Auth Guard
 *
 * Tries JWT authentication first, then falls back to API key authentication.
 * This allows both login-based and API key-based access to work seamlessly.
 *
 * When using API key auth, also fetches the tenant for scope-based authorization.
 */
@Injectable()
export class CombinedAuthGuard extends JwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
  }

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
   * Try to authenticate with API key
   */
  private async tryApiKeyAuth(request: any): Promise<boolean> {
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      return false;
    }

    // Hash the provided key for comparison
    const keyHash = this.hashKey(apiKey);

    // Look up the key in the database
    const keyRecord = await this.db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)),
    });

    if (!keyRecord) {
      return false;
    }

    // Check if key has expired
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return false;
    }

    // Get the tenant (if the key has a tenantId)
    let tenant: any = null;
    if (keyRecord.tenantId) {
      tenant = await this.db.query.tenants.findFirst({
        where: eq(tenants.id, keyRecord.tenantId),
      });
    }

    // Get the team (optional - key may be tenant-level only)
    let team: any = null;
    if (keyRecord.teamId) {
      team = await this.db.query.teams.findFirst({
        where: eq(teams.id, keyRecord.teamId),
      });
    }

    // Get the user if associated
    let user: any = null;
    if (keyRecord.createdByUserId) {
      user = await this.db.query.users.findFirst({
        where: eq(users.id, keyRecord.createdByUserId),
      });
    } else if (team) {
      // Get the team owner as the user
      user = await this.db.query.users.findFirst({
        where: eq(users.id, team.ownerId),
      });
    }

    // Update last used timestamp and IP (fire and forget)
    const clientIp =
      request.ip || request.headers["x-forwarded-for"] || "unknown";
    this.db
      .update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        lastUsedFromIp:
          typeof clientIp === "string" ? clientIp.slice(0, 45) : null,
      })
      .where(eq(apiKeys.id, keyRecord.id))
      .execute()
      .catch(() => {});

    // Set context on request
    request["user"] = user;
    request["team"] = team;
    request["tenant"] = tenant;
    request["apiKey"] = keyRecord;
    request["apiKeyType"] = keyRecord.type;

    // For JWT compatibility, create a fake token payload
    request["tokenPayload"] = {
      sub: user?.id,
      email: user?.email,
      teamId: team?.id,
      tenantId: tenant?.id,
      apiKeyId: keyRecord.id,
      apiKeyType: keyRecord.type,
    };

    return true;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const type = context.getType<GqlContextType>();
    const request = this.getRequest(context);

    // For GraphQL, check if already authenticated (from context middleware)
    if (type === "graphql") {
      if (request["user"] && request["tokenPayload"]) {
        return true;
      }
    }

    // Try JWT authentication first
    const token = this.extractTokenFromHeader(request);
    if (token) {
      try {
        const { payload } = await this.jwtService.verify(token);
        const user = await this.authService.getUser(payload);
        request["user"] = user;
        request["tokenPayload"] = payload;
        return true;
      } catch {
        // JWT failed, try API key
      }
    }

    // Try API key authentication
    const apiKeySuccess = await this.tryApiKeyAuth(request);
    if (apiKeySuccess) {
      return true;
    }

    // Neither worked
    throw new UnauthorizedException(
      "Authentication required. Provide a valid JWT token or API key.",
    );
  }
}
