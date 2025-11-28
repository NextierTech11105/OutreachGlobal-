import { ApolloClientInstance } from "@/lib/apollo/client";
import { $cookie } from "@/lib/cookie/client-cookie";

export function getApolloClient() {
  return ApolloClientInstance.getClient({
    uri: process.env.NEXT_PUBLIC_API_URL + "/graphql",
    authLinkContext: () => {
      const headers: Record<string, any> = {};
      if (typeof window !== "undefined") {
        const token = $cookie.get("session");
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }

      return headers;
    },
  });
}
