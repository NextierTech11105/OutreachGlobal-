import {
  BucketType,
  InboxPriority,
  ResponseClassification,
} from "@nextier/common";

export interface InboxFilter {
  teamId: string;
  bucket?: BucketType;
  priority?: InboxPriority;
  classification?: ResponseClassification;
  isProcessed?: boolean;
  isRead?: boolean;
  isStarred?: boolean;
  searchQuery?: string;
  leadId?: string;
  campaignId?: string;
  assignedSdrId?: string;
}

export interface PriorityCalculationInput {
  classification: ResponseClassification;
  classificationConfidence: number;
  sentiment: string;
  intent: string;
  messageAge: number;
  leadScore?: number;
  hasActiveSDR: boolean;
}

export interface SabrinaAssignmentResult {
  sdrId: string;
  sdrName: string;
  campaignId: string;
  campaignName: string;
  initialMessageId: string;
  initialMessageContent: string;
  responseDelay: number;
}

export interface ClassificationResult {
  type: ResponseClassification;
  confidence: number;
  sentiment: string;
  intent: string;
}
