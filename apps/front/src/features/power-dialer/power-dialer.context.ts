import type {
  AiSdrAvatarsQuery,
  DialerContactsQuery,
  ExtractNode,
  PowerDialerDetailsQuery,
} from "@/graphql/types";
import { DialerMode } from "@nextier/common";
import type { Call, Device } from "@twilio/voice-sdk";
import { createContext, Dispatch, Reducer, useContext } from "react";

type Contact = ExtractNode<DialerContactsQuery["dialerContacts"]>;
type AiSdr = ExtractNode<AiSdrAvatarsQuery["aiSdrAvatars"]>;

export interface PowerDialerContextState {
  powerDialer: PowerDialerDetailsQuery["powerDialer"];
  activeCall?: Call | null;
  device?: Device | null;
  token?: string | null;
  activeContact?: Contact | null;
  mode: DialerMode;
  aiSdrAvatar?: AiSdr | null;
}

export type PowerDialerContextAction =
  | Partial<PowerDialerContextState>
  | ((state: PowerDialerContextState) => Partial<PowerDialerContextState>);

export type PowerDialerContextReducer = Reducer<
  PowerDialerContextState,
  PowerDialerContextAction
>;

export const powerDialerContextInitialState: PowerDialerContextState = {
  powerDialer: undefined as unknown as PowerDialerDetailsQuery["powerDialer"],
  activeCall: null,
  device: null,
  token: null,
  activeContact: null,
  mode: DialerMode.MANUAL,
  aiSdrAvatar: null,
};

export const PowerDialerContext = createContext<
  [PowerDialerContextState, Dispatch<PowerDialerContextAction>]
>([powerDialerContextInitialState, () => {}]);

export const powerDialerReducer: PowerDialerContextReducer = (
  state,
  action,
) => {
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

export const usePowerDialerContext = () => {
  const context = useContext(PowerDialerContext);
  if (!context) {
    throw new Error(
      "usePowerDialerContext must be used within a PowerDialerContextProvider",
    );
  }
  return context;
};
