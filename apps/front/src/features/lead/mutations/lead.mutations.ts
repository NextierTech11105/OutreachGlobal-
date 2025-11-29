"use client";

import type {
  BulkDeleteLeadMutation,
  BulkDeleteLeadMutationVariables,
  CreateLeadMutation,
  CreateLeadMutationVariables,
  UpdateLeadMutation,
  UpdateLeadMutationVariables,
  CreateLeadPhoneNumberMutation,
  CreateLeadPhoneNumberMutationVariables,
  UpdateLeadPhoneNumberMutation,
  UpdateLeadPhoneNumberMutationVariables,
  DeleteLeadPhoneNumberMutation,
  DeleteLeadPhoneNumberMutationVariables,
  UpdateLeadPositionMutation,
  UpdateLeadPositionMutationVariables,
  ImportLeadFromBusinessListMutation,
  ImportLeadFromBusinessListMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const CREATE_LEAD_MUTATION: TypedDocumentNode<
  CreateLeadMutation,
  CreateLeadMutationVariables
> = gql`
  mutation CreateLead($teamId: ID!, $input: CreateLeadInput!) {
    createLead(teamId: $teamId, input: $input) {
      lead {
        id
      }
    }
  }
`;

export const UPDATE_LEAD_MUTATION: TypedDocumentNode<
  UpdateLeadMutation,
  UpdateLeadMutationVariables
> = gql`
  mutation UpdateLead($teamId: ID!, $id: ID!, $input: UpdateLeadInput!) {
    updateLead(teamId: $teamId, id: $id, input: $input) {
      lead {
        id
      }
    }
  }
`;

export const BULK_DELETE_LEAD_MUTATION: TypedDocumentNode<
  BulkDeleteLeadMutation,
  BulkDeleteLeadMutationVariables
> = gql`
  mutation BulkDeleteLead($teamId: ID!, $leadIds: [ID!]!) {
    bulkDeleteLead(teamId: $teamId, leadIds: $leadIds) {
      deletedLeadsCount
    }
  }
`;

export const CREATE_LEAD_PHONE_NUMBER_MUTATION: TypedDocumentNode<
  CreateLeadPhoneNumberMutation,
  CreateLeadPhoneNumberMutationVariables
> = gql`
  mutation CreateLeadPhoneNumber(
    $teamId: ID!
    $leadId: ID!
    $input: CreateLeadPhoneNumberInput!
  ) {
    createLeadPhoneNumber(teamId: $teamId, leadId: $leadId, input: $input) {
      leadPhoneNumber {
        id
      }
    }
  }
`;

export const UPDATE_LEAD_PHONE_NUMBER_MUTATION: TypedDocumentNode<
  UpdateLeadPhoneNumberMutation,
  UpdateLeadPhoneNumberMutationVariables
> = gql`
  mutation UpdateLeadPhoneNumber(
    $teamId: ID!
    $leadId: ID!
    $leadPhoneNumberId: ID!
    $label: String!
  ) {
    updateLeadPhoneNumber(
      teamId: $teamId
      leadId: $leadId
      leadPhoneNumberId: $leadPhoneNumberId
      label: $label
    ) {
      leadPhoneNumber {
        id
      }
    }
  }
`;

export const DELETE_LEAD_PHONE_NUMBER_MUTATION: TypedDocumentNode<
  DeleteLeadPhoneNumberMutation,
  DeleteLeadPhoneNumberMutationVariables
> = gql`
  mutation DeleteLeadPhoneNumber(
    $teamId: ID!
    $leadId: ID!
    $leadPhoneNumberId: ID!
  ) {
    deleteLeadPhoneNumber(
      teamId: $teamId
      leadId: $leadId
      leadPhoneNumberId: $leadPhoneNumberId
    ) {
      deletedLeadPhoneNumberId
    }
  }
`;

export const UPDATE_LEAD_POSITION_MUTATION: TypedDocumentNode<
  UpdateLeadPositionMutation,
  UpdateLeadPositionMutationVariables
> = gql`
  mutation UpdateLeadPosition(
    $teamId: ID!
    $id: ID!
    $newPosition: Int!
    $oldPosition: Int!
    $status: String!
  ) {
    updateLeadPosition(
      teamId: $teamId
      id: $id
      newPosition: $newPosition
      oldPosition: $oldPosition
      status: $status
    ) {
      lead {
        id
      }
    }
  }
`;

export const IMPORT_LEAD_FROM_BUSINESS_LIST_MUTATION: TypedDocumentNode<
  ImportLeadFromBusinessListMutation,
  ImportLeadFromBusinessListMutationVariables
> = gql`
  mutation ImportLeadFromBusinessList(
    $teamId: ID!
    $input: ImportBusinessListInput!
    $presetId: ID
  ) {
    importLeadFromBusinessList(
      teamId: $teamId
      input: $input
      presetId: $presetId
    )
  }
`;
