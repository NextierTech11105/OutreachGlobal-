import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { sql } from "drizzle-orm";

/**
 * Tenant Context Interceptor
 *
 * Sets the PostgreSQL session variable `app.team_id` for Row Level Security (RLS).
 * This interceptor should run AFTER authentication to ensure we have the team context.
 *
 * RLS policies use: `team_id = current_setting('app.team_id', true)`
 * This interceptor ensures that setting is populated for every request.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(@InjectDB() private db: DrizzleClient) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const type = context.getType<GqlContextType>();
    let teamId: string | null = null;

    // Extract team ID based on context type
    if (type === "graphql") {
      const gqlContext = GqlExecutionContext.create(context);
      const request = gqlContext.getContext().req;

      // Get team from request (set by auth guard)
      teamId = request?.team?.id || request?.tokenPayload?.teamId;
    } else {
      // HTTP context
      const request = context.switchToHttp().getRequest();
      teamId = request?.team?.id || request?.tokenPayload?.teamId;
    }

    // Set tenant context in PostgreSQL session
    if (teamId) {
      try {
        // Set the session variable for RLS
        await this.db.execute(sql`SET app.team_id = ${teamId}`);
      } catch (error) {
        console.error("[TenantContextInterceptor] Failed to set tenant context:", error);
        // Continue anyway - RLS will just return no rows which is safe
      }
    } else {
      // Clear tenant context if no team (e.g., super admin operations)
      try {
        await this.db.execute(sql`SET app.team_id = ''`);
      } catch (error) {
        // Ignore errors when clearing
      }
    }

    return next.handle();
  }
}
