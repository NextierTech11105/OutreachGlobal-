/**
 * AI Queue Constants
 * Queue names and job types for async AI operations
 */

export const AI_QUEUE = "ai-orchestrator";

export const AiJobs = {
  // Research tasks (background, higher latency OK)
  RESEARCH_DEEP: "research-deep",
  RESEARCH_VERIFY: "research-verify",

  // Batch processing
  BATCH_CLASSIFY: "batch-classify",
  BATCH_GENERATE: "batch-generate",

  // Scheduled/periodic
  MEETING_BRIEF: "meeting-brief",
} as const;

export type AiJobType = (typeof AiJobs)[keyof typeof AiJobs];

// Job data interfaces
export interface ResearchDeepJobData {
  teamId: string;
  userId?: string;
  leadId?: string;
  traceId: string;
  query: string;
  callbackUrl?: string;
}

export interface ResearchVerifyJobData {
  teamId: string;
  userId?: string;
  leadId?: string;
  traceId: string;
  businessName: string;
  businessAddress?: string;
  ownerName?: string;
  callbackUrl?: string;
}

export interface BatchClassifyJobData {
  teamId: string;
  userId?: string;
  traceId: string;
  messages: Array<{
    id: string;
    leadId: string;
    conversationId?: string;
    message: string;
    conversationHistory?: string[];
  }>;
  callbackUrl?: string;
}

export interface BatchGenerateJobData {
  teamId: string;
  userId?: string;
  traceId: string;
  requests: Array<{
    id: string;
    leadId: string;
    conversationId?: string;
    incomingMessage: string;
    conversationHistory: string[];
    leadName: string;
    intent?: string;
  }>;
  callbackUrl?: string;
}

export interface MeetingBriefJobData {
  teamId: string;
  userId?: string;
  leadId: string;
  traceId: string;
  meetingTime: string;
  attendees: string[];
  context?: string;
  callbackUrl?: string;
}

// Union type for all job data
export type AiJobData =
  | ResearchDeepJobData
  | ResearchVerifyJobData
  | BatchClassifyJobData
  | BatchGenerateJobData
  | MeetingBriefJobData;
