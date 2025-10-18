"use client";
import { CFC } from "@/types/element.type";
import { useReducer } from "react";
import { InboxContext, inboxReducer } from "./inbox.context";
import { inboxContextInitialState } from "./inbox.context";

export const InboxProvider: CFC = ({ children }) => {
  const [state, dispatch] = useReducer(inboxReducer, inboxContextInitialState);

  return (
    <InboxContext.Provider value={[state, dispatch]}>
      {children}
    </InboxContext.Provider>
  );
};
