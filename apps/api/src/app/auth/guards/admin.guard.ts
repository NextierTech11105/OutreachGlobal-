import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

/**
 * AdminGuard - Protects admin-only endpoints like /migrate and /setupdb
 *
 * Requires the X-Admin-Key header to match ADMIN_API_KEY environment variable.
 * In production, if ADMIN_API_KEY is not set, admin routes are disabled.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = request.headers["x-admin-key"];
    const expectedKey = process.env.ADMIN_API_KEY;

    // In production, admin routes must have ADMIN_API_KEY configured
    if (process.env.NODE_ENV === "production" && !expectedKey) {
      throw new ForbiddenException("Admin routes are disabled in production");
    }

    // In development, allow if no key is configured (for convenience)
    if (!expectedKey && process.env.NODE_ENV !== "production") {
      return true;
    }

    if (!adminKey) {
      throw new UnauthorizedException("Missing X-Admin-Key header");
    }

    if (adminKey !== expectedKey) {
      throw new UnauthorizedException("Invalid admin key");
    }

    return true;
  }
}
