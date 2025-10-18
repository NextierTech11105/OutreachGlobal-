import { createContext, Dispatch, Reducer, useContext } from "react";

export interface InboxContextState {
  activeTab: "all" | "email" | "sms" | "voice";
  activeItem: string;
}

export type InboxContextAction =
  | Partial<InboxContextState>
  | ((state: InboxContextState) => Partial<InboxContextState>);

export type InboxContextReducer = Reducer<
  InboxContextState,
  InboxContextAction
>;

export const inboxContextInitialState: InboxContextState = {
  activeTab: "all",
  activeItem: "inbox",
};

export const InboxContext = createContext<
  [InboxContextState, Dispatch<InboxContextAction>]
>([inboxContextInitialState, () => {}]);

export const inboxReducer: InboxContextReducer = (state, action) => {
  if (typeof action === "function") {
    const newState = action(state);
    return {
      ...state,
      newState,
    };
  }

  return {
    ...state,
    ...action,
  };
};

export const useInboxContext = () => {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error(
      "useInboxContext must be used within a InboxContextProvider",
    );
  }
  return context;
};
