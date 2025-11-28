import { $cookie } from "@/lib/cookie/client-cookie";
import { useState } from "react";

export function useLogout() {
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    try {
      $cookie.remove("session");
      $cookie.remove("current_team");
      location.href = "/";
    } catch (error) {
      //
    } finally {
      setLoading(false);
    }
  };

  return [logout, { loading, setLoading }] as const;
}
