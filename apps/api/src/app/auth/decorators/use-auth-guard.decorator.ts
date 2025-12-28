import { applyDecorators, UseGuards } from "@nestjs/common";
import { CombinedAuthGuard, RolesGuard } from "../guards";
import { Roles } from "./roles.decorator";

/**
 * UseAuthGuard - Protects routes with authentication
 *
 * Now supports BOTH:
 * - JWT tokens (from login)
 * - API keys (X-API-Key header)
 *
 * Tries JWT first, falls back to API key.
 */
export const UseAuthGuard = (roles?: string[]) => {
  const decorators = [UseGuards(CombinedAuthGuard, RolesGuard)];
  if (roles?.length) {
    decorators.push(Roles(...roles));
  }
  return applyDecorators(...decorators);
};
