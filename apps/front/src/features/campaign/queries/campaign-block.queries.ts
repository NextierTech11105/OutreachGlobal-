import { gql, type TypedDocumentNode } from "@apollo/client";

export interface CampaignBlock {
  id: string;
  campaignId: string;
  blockNumber: number;
  status: "preparing" | "active" | "paused" | "completed";
  leadsLoaded: number;
  maxLeads: number;
  currentTouch: number;
  maxTouches: number;
  touchesSent: number;
  targetTouches: number;
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignBlocksQuery {
  campaignBlocks: {
    nodes: CampaignBlock[];
    totalCount: number;
  };
}

export interface CampaignBlocksQueryVariables {
  teamId: string;
  campaignId?: string;
  status?: string;
}

export const CAMPAIGN_BLOCKS_QUERY: TypedDocumentNode<
  CampaignBlocksQuery,
  CampaignBlocksQueryVariables
> = gql`
  query CampaignBlocks($teamId: ID!, $campaignId: String, $status: String) {
    campaignBlocks(teamId: $teamId, campaignId: $campaignId, status: $status) {
      nodes {
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
      totalCount
    }
  }
`;

export interface CampaignBlockQuery {
  campaignBlock: CampaignBlock;
}

export interface CampaignBlockQueryVariables {
  teamId: string;
  id: string;
}

export const CAMPAIGN_BLOCK_QUERY: TypedDocumentNode<
  CampaignBlockQuery,
  CampaignBlockQueryVariables
> = gql`
  query CampaignBlock($teamId: ID!, $id: ID!) {
    campaignBlock(teamId: $teamId, id: $id) {
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
`;
