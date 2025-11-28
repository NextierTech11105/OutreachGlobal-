import { InitialMessageCategory, MessageTone } from "@nextier/common";

export interface InitialMessageFilter {
  teamId: string;
  category?: InitialMessageCategory;
  tone?: MessageTone;
  isActive?: boolean;
  sdrId?: string;
  searchQuery?: string;
}

export interface MessagePerformanceMetrics {
  timesUsed: number;
  responseRate: number;
  positiveResponseRate: number;
  avgResponseTime?: number;
}

export interface PersonalizationToken {
  token: string;
  description: string;
  example: string;
}
