import { gql, type TypedDocumentNode } from "@apollo/client";

export interface AutoTrigger {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  templateId: string;
  templateName: string;
  config: Record<string, unknown>;
  firedCount: number;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerExecution {
  id: string;
  triggerId: string;
  leadId: string;
  status: "pending" | "sent" | "failed";
  sentAt: string | null;
  failedAt: string | null;
  failedReason: string | null;
  eventType: string | null;
  eventData: Record<string, unknown> | null;
  createdAt: string;
}

export interface AutoTriggersQuery {
  autoTriggers: {
    nodes: AutoTrigger[];
    totalCount: number;
  };
}

export interface AutoTriggersQueryVariables {
  teamId: string;
  type?: string;
  enabled?: boolean;
}

export const AUTO_TRIGGERS_QUERY: TypedDocumentNode<
  AutoTriggersQuery,
  AutoTriggersQueryVariables
> = gql`
  query AutoTriggers($teamId: ID!, $type: String, $enabled: Boolean) {
    autoTriggers(teamId: $teamId, type: $type, enabled: $enabled) {
      nodes {
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
      totalCount
    }
  }
`;

export interface TriggerExecutionsQuery {
  triggerExecutions: {
    nodes: TriggerExecution[];
    totalCount: number;
  };
}

export interface TriggerExecutionsQueryVariables {
  teamId: string;
  triggerId?: string;
  limit?: number;
}

export const TRIGGER_EXECUTIONS_QUERY: TypedDocumentNode<
  TriggerExecutionsQuery,
  TriggerExecutionsQueryVariables
> = gql`
  query TriggerExecutions($teamId: ID!, $triggerId: ID, $limit: Int) {
    triggerExecutions(teamId: $teamId, triggerId: $triggerId, limit: $limit) {
      nodes {
        id
        triggerId
        leadId
        status
        sentAt
        failedAt
        failedReason
        eventType
        eventData
        createdAt
      }
      totalCount
    }
  }
`;
