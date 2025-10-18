"use client";
import { createContext, useEffect } from "react";
import { StoreApi } from "zustand";
import { useRef } from "react";
import { $cookie } from "@/lib/cookie/client-cookie";
import { AuthStore, createAuthStore, UserState } from "@/stores/auth.store";

export const AuthContext = createContext<StoreApi<AuthStore>>(
  null as unknown as any,
);

interface Props {
  children: React.ReactNode;
  user?: UserState;
}

export const AuthProvider: React.FC<Props> = ({ children, user }) => {
  const store = useRef(createAuthStore({ user, loaded: true })).current;
  useEffect(() => {
    if (!user?.id) {
      $cookie.remove("session");
    }
  }, [user?.id]);

  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
};
