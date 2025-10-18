import { gql, TypedDocumentNode } from "@apollo/client";
import type {
  CreateMessageTemplateMutation,
  CreateMessageTemplateMutationVariables,
  DeleteMessageTemplateMutation,
  DeleteMessageTemplateMutationVariables,
  UpdateMessageTemplateMutation,
  UpdateMessageTemplateMutationVariables,
  GenerateMessageTemplateMutation,
  GenerateMessageTemplateMutationVariables,
} from "@/graphql/types";

export const CREATE_MESSAGE_TEMPLATE_MUTATION: TypedDocumentNode<
  CreateMessageTemplateMutation,
  CreateMessageTemplateMutationVariables
> = gql`
  mutation CreateMessageTemplate(
    $teamId: ID!
    $input: CreateMessageTemplateInput!
    $type: MessageTemplateType!
  ) {
    createMessageTemplate(teamId: $teamId, input: $input, type: $type) {
      messageTemplate {
        id
        type
        name
        data
      }
    }
  }
`;

export const UPDATE_MESSAGE_TEMPLATE_MUTATION: TypedDocumentNode<
  UpdateMessageTemplateMutation,
  UpdateMessageTemplateMutationVariables
> = gql`
  mutation UpdateMessageTemplate(
    $teamId: ID!
    $id: ID!
    $input: UpdateMessageTemplateInput!
    $type: MessageTemplateType!
  ) {
    updateMessageTemplate(
      teamId: $teamId
      id: $id
      input: $input
      type: $type
    ) {
      messageTemplate {
        id
        type
        name
        data
      }
    }
  }
`;

export const DELETE_MESSAGE_TEMPLATE_MUTATION: TypedDocumentNode<
  DeleteMessageTemplateMutation,
  DeleteMessageTemplateMutationVariables
> = gql`
  mutation DeleteMessageTemplate($teamId: ID!, $id: ID!) {
    deleteMessageTemplate(teamId: $teamId, id: $id) {
      deletedMessageTemplateId
    }
  }
`;

export const GENERATE_MESSAGE_TEMPLATE_MUTATION: TypedDocumentNode<
  GenerateMessageTemplateMutation,
  GenerateMessageTemplateMutationVariables
> = gql`
  mutation GenerateMessageTemplate($teamId: ID!, $prompt: String!) {
    generateMessageTemplate(teamId: $teamId, prompt: $prompt) {
      content
    }
  }
`;
