import type {
  CreatePromptMutation,
  CreatePromptMutationVariables,
  UpdatePromptMutation,
  UpdatePromptMutationVariables,
  DeletePromptMutation,
  DeletePromptMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const CREATE_PROMPT_MUTATION: TypedDocumentNode<
  CreatePromptMutation,
  CreatePromptMutationVariables
> = gql`
  mutation CreatePrompt($teamId: ID!, $input: CreatePromptInput!) {
    createPrompt(teamId: $teamId, input: $input) {
      prompt {
        id
        name
        description
        content
        type
        category
        tags
        createdAt
        updatedAt
      }
    }
  }
`;

export const UPDATE_PROMPT_MUTATION: TypedDocumentNode<
  UpdatePromptMutation,
  UpdatePromptMutationVariables
> = gql`
  mutation UpdatePrompt($teamId: ID!, $id: ID!, $input: UpdatePromptInput!) {
    updatePrompt(teamId: $teamId, id: $id, input: $input) {
      prompt {
        id
        name
        description
        content
        type
        category
        tags
        createdAt
        updatedAt
      }
    }
  }
`;

export const DELETE_PROMPT_MUTATION: TypedDocumentNode<
  DeletePromptMutation,
  DeletePromptMutationVariables
> = gql`
  mutation DeletePrompt($teamId: ID!, $id: ID!) {
    deletePrompt(teamId: $teamId, id: $id) {
      deletedPromptId
    }
  }
`;
