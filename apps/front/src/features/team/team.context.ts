import type { TeamQuery } from "@/graphql/types";
import { type Dispatch, type Reducer, createContext, useContext } from "react";

export type TNavbarContent = "full" | "off" | "no_search";

type Team = TeamQuery["team"];

export interface TeamContextState {
  team: Team;
}

export type TeamContextAction = {
  type: "UPDATE";
  value: Partial<Team>;
};

export type TeamContextReducer = Reducer<TeamContextState, TeamContextAction>;

export type TTeamContext = [TeamContextState, Dispatch<TeamContextAction>];

// Safe initial state - team is null until loaded, components must handle this
export const teamContextInitialState: TeamContextState = {
  team: null as unknown as Team,
};

export const TeamContext = createContext<TTeamContext>([
  teamContextInitialState,
  () => {},
]);

export const teamReducer: TeamContextReducer = (state, action) => {
  switch (action.type) {
    case "UPDATE":
      return {
        ...state,
        team: {
          ...state.team,
          ...action.value,
        },
      };

    default:
      return state;
  }
};

/**
 * This hooks can be use directly within component without worry if it will return undefined.
 */
export const useCurrentTeam = () => {
  const [state, dispatch] = useContext(TeamContext);

  const update = (value: Partial<Team>) => {
    dispatch({ type: "UPDATE", value });
  };

  return {
    team: state.team,
    update,
  };
};
