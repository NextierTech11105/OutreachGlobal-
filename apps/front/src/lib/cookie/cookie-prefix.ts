export const COOKIE_PREFIX = "nextier_";

export function withCookiePrefix(key: string) {
  return COOKIE_PREFIX + key;
}
