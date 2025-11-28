import type {
  UpsertDialerContactMutation,
  UpsertDialerContactMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const UPSERT_DIALER_CONTACT_MUTATION: TypedDocumentNode<
  UpsertDialerContactMutation,
  UpsertDialerContactMutationVariables
> = gql`
  mutation upsertDialerContact(
    $teamId: ID!
    $powerDialerId: ID!
    $leadIds: [ID!]!
  ) {
    upsertDialerContact(
      teamId: $teamId
      powerDialerId: $powerDialerId
      leadIds: $leadIds
    ) {
      newLeadsCount
    }
  }
`;
