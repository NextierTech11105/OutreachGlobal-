import type {
  CreateCampaignMutation,
  CreateCampaignMutationVariables,
  UpdateCampaignMutation,
  UpdateCampaignMutationVariables,
  DeleteCampaignMutation,
  DeleteCampaignMutationVariables,
  ToggleCampaignStatusMutation,
  ToggleCampaignStatusMutationVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";

export const CREATE_CAMPAIGN_MUTATION: TypedDocumentNode<
  CreateCampaignMutation,
  CreateCampaignMutationVariables
> = gql`
  mutation CreateCampaign($teamId: ID!, $input: CreateCampaignInput!) {
    createCampaign(teamId: $teamId, input: $input) {
      campaign {
        id
        name
        description
      }
    }
  }
`;

export const UPDATE_CAMPAIGN_MUTATION: TypedDocumentNode<
  UpdateCampaignMutation,
  UpdateCampaignMutationVariables
> = gql`
  mutation UpdateCampaign(
    $teamId: ID!
    $id: ID!
    $input: UpdateCampaignInput!
  ) {
    updateCampaign(teamId: $teamId, id: $id, input: $input) {
      campaign {
        id
        name
        status
        estimatedLeadsCount
        createdAt
        updatedAt
        aiSdrAvatar {
          id
          name
        }
      }
    }
  }
`;

export const DELETE_CAMPAIGN_MUTATION: TypedDocumentNode<
  DeleteCampaignMutation,
  DeleteCampaignMutationVariables
> = gql`
  mutation DeleteCampaign($teamId: ID!, $id: ID!) {
    deleteCampaign(teamId: $teamId, id: $id) {
      deletedCampaignId
    }
  }
`;

export const TOGGLE_CAMPAIGN_STATUS_MUTATION: TypedDocumentNode<
  ToggleCampaignStatusMutation,
  ToggleCampaignStatusMutationVariables
> = gql`
  mutation ToggleCampaignStatus($teamId: ID!, $id: ID!) {
    toggleCampaignStatus(teamId: $teamId, id: $id) {
      campaign {
        id
        status
      }
    }
  }
`;
