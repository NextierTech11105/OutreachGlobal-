import * as argon from "argon2";

/**
 * Hash a password using argon2
 * Compatible with the backend auth service
 */
export function hashPassword(plain: string): Promise<string> {
  return argon.hash(plain);
}

/**
 * Generate a temporary 12-character alphanumeric password
 */
export function generateTempPassword(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}
