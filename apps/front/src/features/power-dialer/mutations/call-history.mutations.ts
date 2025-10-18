import type {
  CreateCallHistoryMutation,
  CreateCallHistoryMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const CREATE_CALL_HISTORY_MUTATION: TypedDocumentNode<
  CreateCallHistoryMutation,
  CreateCallHistoryMutationVariables
> = gql`
  mutation CreateCallHistory(
    $teamId: ID!
    $powerDialerId: ID!
    $dialerContactId: ID!
    $markAsCompleted: Boolean
    $input: CreateCallHistoryInput!
  ) {
    createCallHistory(
      teamId: $teamId
      powerDialerId: $powerDialerId
      dialerContactId: $dialerContactId
      markAsCompleted: $markAsCompleted
      input: $input
    ) {
      callHistory {
        id
      }
    }
  }
`;
