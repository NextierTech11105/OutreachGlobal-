import { gql, type TypedDocumentNode } from "@apollo/client";

export interface TemplatePerformanceMetrics {
  id: string;
  templateId: string;
  templateName: string;
  campaignId: string | null;
  campaignLane: string | null;
  periodStart: string;
  periodEnd: string;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalReplied: number;
  positiveReplies: number;
  negativeReplies: number;
  questionReplies: number;
  neutralReplies: number;
  emailsCaptured: number;
  callsScheduled: number;
  meetingsBooked: number;
  optOuts: number;
  wrongNumbers: number;
  complaints: number;
  deliveryRate: number | null;
  replyRate: number | null;
  positiveRate: number | null;
  conversionRate: number | null;
  optOutRate: number | null;
  compositeScore: number | null;
  touch1Sent: number | null;
  touch1Replied: number | null;
  touch2Sent: number | null;
  touch2Replied: number | null;
  touch3Sent: number | null;
  touch3Replied: number | null;
  touch4Sent: number | null;
  touch4Replied: number | null;
  touch5Sent: number | null;
  touch5Replied: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatePerformanceQuery {
  templatePerformance: {
    nodes: TemplatePerformanceMetrics[];
    totalCount: number;
  };
}

export interface TemplatePerformanceQueryVariables {
  teamId: string;
  templateId?: string;
  campaignId?: string;
  period?: string;
}

export const TEMPLATE_PERFORMANCE_QUERY: TypedDocumentNode<
  TemplatePerformanceQuery,
  TemplatePerformanceQueryVariables
> = gql`
  query TemplatePerformance(
    $teamId: ID!
    $templateId: String
    $campaignId: String
    $period: String
  ) {
    templatePerformance(
      teamId: $teamId
      templateId: $templateId
      campaignId: $campaignId
      period: $period
    ) {
      nodes {
        id
        templateId
        templateName
        campaignId
        campaignLane
        periodStart
        periodEnd
        totalSent
        totalDelivered
        totalFailed
        totalReplied
        positiveReplies
        negativeReplies
        questionReplies
        neutralReplies
        emailsCaptured
        callsScheduled
        meetingsBooked
        optOuts
        wrongNumbers
        complaints
        deliveryRate
        replyRate
        positiveRate
        conversionRate
        optOutRate
        compositeScore
        touch1Sent
        touch1Replied
        touch2Sent
        touch2Replied
        touch3Sent
        touch3Replied
        touch4Sent
        touch4Replied
        touch5Sent
        touch5Replied
        createdAt
        updatedAt
      }
      totalCount
    }
  }
`;
