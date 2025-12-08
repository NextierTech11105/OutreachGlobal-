/**
 * Property Owner DTOs
 * Links properties to persona identities
 */

export interface PropertyOwnerLinkDto {
  id: string;
  propertyId: string;
  personaId: string;
  // Ownership details
  ownershipType: 'sole' | 'joint' | 'trust' | 'corporate' | 'estate';
  ownershipPercent?: number;
  ownerPosition: 1 | 2 | 3 | 4; // Owner 1, Owner 2, etc.
  // Name as recorded
  nameAsRecorded: string;
  // Dates
  acquisitionDate?: string;
  vestingDate?: string;
  // Mailing
  mailingAddressId?: string;
  // Status
  isCurrent: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  // Source
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePropertyOwnerLinkDto {
  propertyId: string;
  personaId: string;
  ownershipType: 'sole' | 'joint' | 'trust' | 'corporate' | 'estate';
  ownershipPercent?: number;
  ownerPosition: 1 | 2 | 3 | 4;
  nameAsRecorded: string;
  acquisitionDate?: string;
  mailingAddressId?: string;
  source: string;
}

export interface PropertyPortfolioDto {
  personaId: string;
  personaName: string;
  totalProperties: number;
  totalEstimatedValue: number;
  totalEstimatedEquity: number;
  properties: PropertyPortfolioItemDto[];
}

export interface PropertyPortfolioItemDto {
  propertyId: string;
  address: string;
  propertyType: string;
  estimatedValue?: number;
  estimatedEquity?: number;
  ownershipType: string;
  ownershipPercent?: number;
  acquisitionDate?: string;
  yearsOwned?: number;
  hasDistress: boolean;
  distressSignals: string[];
}
