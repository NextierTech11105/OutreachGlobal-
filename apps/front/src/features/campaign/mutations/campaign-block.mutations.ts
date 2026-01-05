import { gql, type TypedDocumentNode } from "@apollo/client";
import type { CampaignBlock } from "../queries/campaign-block.queries";

export interface CreateCampaignBlockInput {
  campaignId: string;
  maxLeads?: number;
  maxTouches?: number;
}

export interface CreateCampaignBlockMutation {
  createCampaignBlock: {
    block: CampaignBlock;
  };
}

export interface CreateCampaignBlockMutationVariables {
  teamId: string;
  input: CreateCampaignBlockInput;
}

export const CREATE_CAMPAIGN_BLOCK_MUTATION: TypedDocumentNode<
  CreateCampaignBlockMutation,
  CreateCampaignBlockMutationVariables
> = gql`
  mutation CreateCampaignBlock(
    $teamId: ID!
    $input: CreateCampaignBlockInput!
  ) {
    createCampaignBlock(teamId: $teamId, input: $input) {
      block {
        id
        campaignId
        blockNumber
        status
        leadsLoaded
        maxLeads
        currentTouch
        maxTouches
        touchesSent
        targetTouches
        startedAt
        pausedAt
        completedAt
        createdAt
        updatedAt
      }
    }
  }
`;

export interface UpdateCampaignBlockStatusMutation {
  updateCampaignBlockStatus: {
    block: CampaignBlock;
  };
}

export interface UpdateCampaignBlockStatusMutationVariables {
  teamId: string;
  id: string;
  status: string;
}

export const UPDATE_CAMPAIGN_BLOCK_STATUS_MUTATION: TypedDocumentNode<
  UpdateCampaignBlockStatusMutation,
  UpdateCampaignBlockStatusMutationVariables
> = gql`
  mutation UpdateCampaignBlockStatus($teamId: ID!, $id: ID!, $status: String!) {
    updateCampaignBlockStatus(teamId: $teamId, id: $id, status: $status) {
      block {
        id
        campaignId
        blockNumber
        status
        leadsLoaded
        maxLeads
        currentTouch
        maxTouches
        touchesSent
        targetTouches
        startedAt
        pausedAt
        completedAt
        createdAt
        updatedAt
      }
    }
  }
`;
