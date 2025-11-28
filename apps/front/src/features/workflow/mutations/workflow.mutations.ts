import {
  CreateWorkflowMutation,
  CreateWorkflowMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const CREATE_WORKFLOW_MUTATION: TypedDocumentNode<
  CreateWorkflowMutation,
  CreateWorkflowMutationVariables
> = gql`
  mutation CreateWorkflow($teamId: ID!, $input: CreateWorkflowInput!) {
    createWorkflow(teamId: $teamId, input: $input) {
      workflow {
        id
        name
      }
    }
  }
`;
