import type {
  BasicTeamReportQuery,
  BasicTeamReportQueryVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const BASIC_TEAM_REPORT_QUERY: TypedDocumentNode<
  BasicTeamReportQuery,
  BasicTeamReportQueryVariables
> = gql`
  query BasicTeamReport($teamId: ID!) {
    teamReport(teamId: $teamId) {
      propertiesCount
      verifiedLeadsCount
      highScoreLeadsCount
      enrichedLeadsCount
    }
  }
`;
