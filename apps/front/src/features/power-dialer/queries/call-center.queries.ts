import type {
  CallCenterReportQuery,
  CallCenterReportQueryVariables,
} from "@/graphql/types";
import { Cache, gql, TypedDocumentNode } from "@apollo/client";

export const CALL_CENTER_REPORT_EVICT: Cache.EvictOptions = {
  id: "ROOT_QUERY",
  fieldName: "callCenterReport",
};

export const CALL_CENTER_REPORT_QUERY: TypedDocumentNode<
  CallCenterReportQuery,
  CallCenterReportQueryVariables
> = gql`
  query CallCenterReport($teamId: ID!) {
    callCenterReport(teamId: $teamId) {
      totalCalls
      successRate
      averageCallDuration
      aiSdrCalls
    }
  }
`;
