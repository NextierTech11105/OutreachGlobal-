/**
 * SkipTrace Request DTOs
 * For RealEstateAPI SkipTrace endpoints
 */

export interface SkipTraceRequestDto {
  // Input identifiers - at least one required
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
  // Source reference for linking results
  sourceType: 'business' | 'property' | 'consumer';
  sourceId: string;
  personaId?: string;
}

export interface SkipTraceBulkRequestDto {
  requests: SkipTraceRequestDto[];
  callbackUrl?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface SkipTraceAwaitRequestDto {
  bulkJobId: string;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}

// RealEstateAPI format
export interface RealEstateApiSkipTraceInput {
  first_name?: string;
  last_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
}

export interface RealEstateApiBulkSkipTraceRequest {
  inputs: RealEstateApiSkipTraceInput[];
  webhook_url?: string;
}
