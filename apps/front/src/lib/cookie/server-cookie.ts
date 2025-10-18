import { cookies } from "next/headers";
import { withCookiePrefix } from "./cookie-prefix";

export async function getAccessTokenCookie() {
  const key = withCookiePrefix("session");
  const cookie = await cookies();
  return cookie.get(key)?.value;
}
