"use client";
import { useEffect, useReducer } from "react";
import {
  TeamContext,
  teamContextInitialState,
  teamReducer,
} from "./team.context";
import type { TeamQuery } from "@/graphql/types";

interface Props {
  children: React.ReactNode;
  team: TeamQuery["team"];
}

export const TeamProvider: React.FC<Props> = ({ team, children }) => {
  const [state, dispatch] = useReducer(teamReducer, {
    ...teamContextInitialState,
    team,
  });

  useEffect(() => {
    if (team) {
      dispatch({ type: "UPDATE", value: team });
    }
  }, [team]);

  return (
    <TeamContext.Provider value={[state, dispatch]}>
      {children}
    </TeamContext.Provider>
  );
};
