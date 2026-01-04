import { gql, type TypedDocumentNode } from "@apollo/client";
import type { AutoTrigger } from "../queries/auto-trigger.queries";

export interface CreateAutoTriggerInput {
  name: string;
  type: string;
  templateId: string;
  templateName: string;
  config?: Record<string, unknown>;
}

export interface CreateAutoTriggerMutation {
  createAutoTrigger: {
    trigger: AutoTrigger;
  };
}

export interface CreateAutoTriggerMutationVariables {
  teamId: string;
  input: CreateAutoTriggerInput;
}

export const CREATE_AUTO_TRIGGER_MUTATION: TypedDocumentNode<
  CreateAutoTriggerMutation,
  CreateAutoTriggerMutationVariables
> = gql`
  mutation CreateAutoTrigger($teamId: ID!, $input: CreateAutoTriggerInput!) {
    createAutoTrigger(teamId: $teamId, input: $input) {
      trigger {
        id
        name
        type
        enabled
        templateId
        templateName
        config
        firedCount
        lastFiredAt
        createdAt
        updatedAt
      }
    }
  }
`;

export interface ToggleAutoTriggerMutation {
  toggleAutoTrigger: {
    trigger: AutoTrigger;
  };
}

export interface ToggleAutoTriggerMutationVariables {
  teamId: string;
  id: string;
  enabled: boolean;
}

export const TOGGLE_AUTO_TRIGGER_MUTATION: TypedDocumentNode<
  ToggleAutoTriggerMutation,
  ToggleAutoTriggerMutationVariables
> = gql`
  mutation ToggleAutoTrigger($teamId: ID!, $id: ID!, $enabled: Boolean!) {
    toggleAutoTrigger(teamId: $teamId, id: $id, enabled: $enabled) {
      trigger {
        id
        name
        type
        enabled
        templateId
        templateName
        config
        firedCount
        lastFiredAt
        createdAt
        updatedAt
      }
    }
  }
`;

export interface DeleteAutoTriggerMutation {
  deleteAutoTrigger: {
    success: boolean;
    deletedId: string;
  };
}

export interface DeleteAutoTriggerMutationVariables {
  teamId: string;
  id: string;
}

export const DELETE_AUTO_TRIGGER_MUTATION: TypedDocumentNode<
  DeleteAutoTriggerMutation,
  DeleteAutoTriggerMutationVariables
> = gql`
  mutation DeleteAutoTrigger($teamId: ID!, $id: ID!) {
    deleteAutoTrigger(teamId: $teamId, id: $id) {
      success
      deletedId
    }
  }
`;
