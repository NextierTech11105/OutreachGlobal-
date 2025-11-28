import type {
  CreatePowerDialerMutation,
  CreatePowerDialerMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const CREATE_POWER_DIALER_MUTATION: TypedDocumentNode<
  CreatePowerDialerMutation,
  CreatePowerDialerMutationVariables
> = gql`
  mutation CreatePowerDialer($teamId: ID!, $input: CreatePowerDialerInput!) {
    createPowerDialer(teamId: $teamId, input: $input) {
      powerDialer {
        id
        title
      }
    }
  }
`;
