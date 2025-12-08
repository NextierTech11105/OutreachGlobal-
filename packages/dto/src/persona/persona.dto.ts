/**
 * Persona Identity DTOs
 * Core identity representation across all data sources
 */

export interface PersonaIdentityDto {
  id: string;
  // Core identity
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  fullName: string;
  // Normalized for matching
  normalizedFirstName: string;
  normalizedLastName: string;
  // Demographics
  age?: number;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'unknown';
  // Identity confidence
  confidenceScore: number;
  mergedFromIds: string[];
  // Source tracking
  primarySource: 'business' | 'property' | 'consumer' | 'skiptrace' | 'apollo';
  // Enrichment status
  skipTraceCompleted: boolean;
  apolloCompleted: boolean;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastEnrichedAt?: Date;
}

export interface CreatePersonaDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  primarySource: 'business' | 'property' | 'consumer' | 'skiptrace' | 'apollo';
}

export interface UpdatePersonaDto {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  suffix?: string;
  age?: number;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'unknown';
  confidenceScore?: number;
  skipTraceCompleted?: boolean;
  apolloCompleted?: boolean;
}

export interface PersonaPhoneDto {
  id: string;
  personaId: string;
  phoneNumber: string;
  phoneType: 'mobile' | 'landline' | 'voip' | 'unknown';
  carrier?: string;
  lineType?: string;
  isValid: boolean;
  isPrimary: boolean;
  isDoNotCall: boolean;
  source: string;
  lastVerifiedAt?: Date;
  createdAt: Date;
}

export interface PersonaEmailDto {
  id: string;
  personaId: string;
  emailAddress: string;
  emailType: 'personal' | 'business' | 'unknown';
  isValid: boolean;
  isPrimary: boolean;
  isUnsubscribed: boolean;
  source: string;
  lastVerifiedAt?: Date;
  createdAt: Date;
}

export interface PersonaAddressDto {
  id: string;
  personaId: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  zip4?: string;
  county?: string;
  country: string;
  addressType: 'residential' | 'commercial' | 'mailing' | 'unknown';
  isCurrent: boolean;
  isPrimary: boolean;
  latitude?: number;
  longitude?: number;
  source: string;
  moveInDate?: Date;
  moveOutDate?: Date;
  createdAt: Date;
}

export interface PersonaSocialDto {
  id: string;
  personaId: string;
  platform: 'linkedin' | 'facebook' | 'twitter' | 'instagram' | 'other';
  profileUrl: string;
  username?: string;
  isVerified: boolean;
  source: string;
  createdAt: Date;
}

export interface PersonaDemographicsDto {
  id: string;
  personaId: string;
  education?: string;
  occupation?: string;
  incomeRange?: string;
  netWorthRange?: string;
  maritalStatus?: string;
  homeOwnerStatus?: 'owner' | 'renter' | 'unknown';
  lengthOfResidence?: number;
  hasChildren?: boolean;
  interests?: string[];
  source: string;
  createdAt: Date;
  updatedAt: Date;
}
