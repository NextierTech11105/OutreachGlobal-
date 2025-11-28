import type { MeQuery } from "@/graphql/types";
import { createStore } from "zustand";

export type UserState = MeQuery["me"];

interface State {
  user: UserState;
  loaded: boolean;
}

type TUpdateUser = Partial<UserState>;

interface Action {
  sync: (user: UserState) => void;
  update: (value: TUpdateUser) => void;
}

export type AuthStore = State & Action;

export const createAuthStore = (initProps?: Partial<State>) => {
  return createStore<AuthStore>()((set) => ({
    user: undefined as unknown as UserState,
    loaded: false,
    ...initProps,
    sync: (user) => {
      set({
        user,
        loaded: true,
      });
    },
    update: (value) => {
      set((state) => ({
        user: {
          ...state.user,
          ...value,
        },
      }));
    },
  }));
};
