/**
 * SkipTrace Response DTOs
 * Mapped from RealEstateAPI responses
 */

export interface SkipTraceResponseDto {
  requestId: string;
  success: boolean;
  errorMessage?: string;
  // Identity
  identity: SkipTraceIdentityDto;
  // Contact info
  phones: SkipTracePhoneDto[];
  emails: SkipTraceEmailDto[];
  addresses: SkipTraceAddressHistoryDto[];
  // Social
  socials: SkipTraceSocialDto[];
  // Demographics
  demographics: SkipTraceDemographicsDto;
  // Relationships
  relatives: SkipTraceRelativeDto[];
  associates: SkipTraceAssociateDto[];
  // Metadata
  matchConfidence: number;
  dataFreshness: string;
  rawResponse?: Record<string, unknown>;
}

export interface SkipTraceIdentityDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  aliases?: string[];
  age?: number;
  dateOfBirth?: string;
  gender?: string;
  ssn4?: string; // Last 4 digits only
}

export interface SkipTracePhoneDto {
  phoneNumber: string;
  phoneType: 'mobile' | 'landline' | 'voip' | 'unknown';
  carrier?: string;
  lineType?: string;
  isConnected?: boolean;
  isDoNotCall?: boolean;
  isPrimary: boolean;
  lastSeenDate?: string;
  score: number;
}

export interface SkipTraceEmailDto {
  emailAddress: string;
  emailType: 'personal' | 'business' | 'disposable' | 'unknown';
  isValid?: boolean;
  isDeliverable?: boolean;
  isPrimary: boolean;
  domain?: string;
  lastSeenDate?: string;
  score: number;
}

export interface SkipTraceAddressHistoryDto {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  zip4?: string;
  county?: string;
  addressType: 'residential' | 'commercial' | 'po_box' | 'unknown';
  isCurrent: boolean;
  moveInDate?: string;
  moveOutDate?: string;
  yearsAtAddress?: number;
  latitude?: number;
  longitude?: number;
}

export interface SkipTraceSocialDto {
  platform: 'linkedin' | 'facebook' | 'twitter' | 'instagram' | 'other';
  profileUrl: string;
  username?: string;
  displayName?: string;
  lastActiveDate?: string;
}

export interface SkipTraceDemographicsDto {
  education?: string;
  educationLevel?: 'high_school' | 'some_college' | 'bachelors' | 'masters' | 'doctorate' | 'unknown';
  occupation?: string;
  occupationCategory?: string;
  employer?: string;
  incomeRange?: string;
  incomeEstimate?: number;
  netWorthRange?: string;
  netWorthEstimate?: number;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'unknown';
  householdSize?: number;
  hasChildren?: boolean;
  numberOfChildren?: number;
  homeOwnerStatus?: 'owner' | 'renter' | 'unknown';
  lengthOfResidence?: number;
  interests?: string[];
  politicalAffiliation?: string;
  religion?: string;
  ethnicity?: string;
}

export interface SkipTraceRelativeDto {
  firstName: string;
  lastName: string;
  relationship?: string;
  age?: number;
  phone?: string;
  address?: string;
}

export interface SkipTraceAssociateDto {
  firstName: string;
  lastName: string;
  associationType?: string;
  phone?: string;
  address?: string;
}

// Bulk response
export interface SkipTraceBulkResponseDto {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  results: SkipTraceResponseDto[];
  estimatedCompletionTime?: string;
  createdAt: string;
  completedAt?: string;
}

// RealEstateAPI raw response format
export interface RealEstateApiSkipTraceResponse {
  success: boolean;
  input: Record<string, string>;
  output?: {
    identity?: {
      first_name?: string;
      last_name?: string;
      middle_name?: string;
      suffix?: string;
      aliases?: string[];
      dob?: string;
      age?: number;
      gender?: string;
    };
    phones?: Array<{
      phone_number: string;
      phone_type: string;
      carrier?: string;
      line_type?: string;
      is_connected?: boolean;
      is_primary?: boolean;
      last_seen?: string;
      score?: number;
    }>;
    emails?: Array<{
      email_address: string;
      email_type?: string;
      is_valid?: boolean;
      is_primary?: boolean;
      last_seen?: string;
      score?: number;
    }>;
    addresses?: Array<{
      street_address?: string;
      city?: string;
      state?: string;
      zip?: string;
      zip4?: string;
      county?: string;
      address_type?: string;
      is_current?: boolean;
      move_in_date?: string;
      move_out_date?: string;
      lat?: number;
      lng?: number;
    }>;
    social_profiles?: Array<{
      platform: string;
      url: string;
      username?: string;
    }>;
    demographics?: {
      education?: string;
      occupation?: string;
      employer?: string;
      income_range?: string;
      net_worth_range?: string;
      marital_status?: string;
      household_size?: number;
      has_children?: boolean;
      home_owner_status?: string;
      length_of_residence?: number;
      interests?: string[];
    };
    relatives?: Array<{
      first_name: string;
      last_name: string;
      relationship?: string;
      age?: number;
      phone?: string;
    }>;
    associates?: Array<{
      first_name: string;
      last_name: string;
      type?: string;
      phone?: string;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
  match_score?: number;
}
