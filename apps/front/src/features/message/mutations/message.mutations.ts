import type {
  CreateMessageMutation,
  CreateMessageMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const CREATE_MESSAGE_MUTATION: TypedDocumentNode<
  CreateMessageMutation,
  CreateMessageMutationVariables
> = gql`
  mutation CreateMessage(
    $teamId: ID!
    $type: String!
    $input: CreateMessageInput!
    $leadId: ID
  ) {
    createMessage(
      teamId: $teamId
      type: $type
      input: $input
      leadId: $leadId
    ) {
      message {
        id
        body
        direction
        type
        createdAt
        updatedAt
      }
    }
  }
`;
