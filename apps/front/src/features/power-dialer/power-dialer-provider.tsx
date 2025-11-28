"use client";

import { PowerDialerDetailsQuery } from "@/graphql/types";
import { CFC } from "@/types/element.type";
import {
  PowerDialerContext,
  powerDialerContextInitialState,
  powerDialerReducer,
} from "./power-dialer.context";
import { useReducer } from "react";

interface Props {
  powerDialer: PowerDialerDetailsQuery["powerDialer"];
}

export const PowerDialerProvider: CFC<Props> = ({ powerDialer, children }) => {
  const reducer = useReducer(powerDialerReducer, {
    ...powerDialerContextInitialState,
    powerDialer,
  });

  return <PowerDialerContext value={reducer}>{children}</PowerDialerContext>;
};
