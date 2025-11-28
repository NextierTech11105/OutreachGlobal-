// Server only Apollo Context
import "server-only";
import { getAccessTokenCookie } from "@/lib/cookie/server-cookie";

export const apolloAuthContext = async () => {
  const token = await getAccessTokenCookie();
  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }
};
