import { AuthContext } from "@/features/auth/auth-provider";
import { AuthStore } from "@/stores/auth.store";
import { useContext } from "react";
import { type ExtractState, type StoreApi, useStore } from "zustand";

type SelectorFunction<U> = (state: AuthStore) => U;

export function useAuthStore(): ExtractState<StoreApi<AuthStore>>;
export function useAuthStore<U>(selector?: SelectorFunction<U>): U;
export function useAuthStore<U>(selector?: SelectorFunction<U>) {
  const store = useContext(AuthContext);
  /** the ! only to supressed type error */
  return useStore<StoreApi<AuthStore>, U>(store, selector!);
}

export const useAuthState = () => useAuthStore((state) => state.user);
