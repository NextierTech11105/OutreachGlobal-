/**
 * Property Detail DTOs
 * From RealEstateAPI Property endpoints
 */

export interface PropertyDetailDto {
  id: string;
  // Address
  address: PropertyAddressDto;
  apn?: string;
  fips?: string;
  // Property characteristics
  propertyType: string;
  propertyUse?: string;
  propertySubType?: string;
  // Building info
  bedrooms?: number;
  bathrooms?: number;
  bathroomsFull?: number;
  bathroomsHalf?: number;
  squareFeet?: number;
  livingArea?: number;
  grossArea?: number;
  yearBuilt?: number;
  effectiveYearBuilt?: number;
  stories?: number;
  units?: number;
  rooms?: number;
  fireplaces?: number;
  basement?: string;
  basementSqFt?: number;
  garage?: string;
  garageSpaces?: number;
  pool?: boolean;
  poolType?: string;
  construction?: string;
  roofType?: string;
  heating?: string;
  cooling?: string;
  flooring?: string;
  condition?: string;
  quality?: string;
  // Lot info
  lotSqFt?: number;
  lotAcres?: number;
  lotWidth?: number;
  lotDepth?: number;
  lotShape?: string;
  lotTopography?: string;
  frontage?: number;
  // Zoning
  zoning?: string;
  zoningCode?: string;
  zoningDescription?: string;
  landUseCode?: string;
  landUseDescription?: string;
  // FAR / Development
  allowedFAR?: number;
  currentFAR?: number;
  unusedFAR?: number;
  buildableSqFt?: number;
  allowedUnits?: number;
  allowedStories?: number;
  setbacks?: PropertySetbacksDto;
  // Valuation
  estimatedValue?: number;
  estimatedValueLow?: number;
  estimatedValueHigh?: number;
  pricePerSqFt?: number;
  assessedValue?: number;
  assessedLandValue?: number;
  assessedImprovementValue?: number;
  assessmentYear?: number;
  // Tax
  taxAmount?: number;
  taxYear?: number;
  taxStatus?: string;
  taxDelinquent?: boolean;
  taxDelinquentAmount?: number;
  taxDelinquentYear?: number;
  // Sales history
  lastSaleDate?: string;
  lastSalePrice?: number;
  lastSaleType?: string;
  priorSaleDate?: string;
  priorSalePrice?: number;
  salesHistory?: PropertySaleDto[];
  // Mortgage / Equity
  estimatedEquity?: number;
  equityPercent?: number;
  ltvRatio?: number;
  openLoans?: PropertyLoanDto[];
  combinedLoanAmount?: number;
  // Owner
  owner?: PropertyOwnerDto;
  ownerOccupied?: boolean;
  absenteeOwner?: boolean;
  outOfState?: boolean;
  yearsOwned?: number;
  // Distress signals
  preForeclosure?: boolean;
  preForeclosureDate?: string;
  foreclosure?: boolean;
  foreclosureDate?: string;
  auction?: boolean;
  auctionDate?: string;
  taxLien?: boolean;
  taxLienAmount?: number;
  taxLienDate?: string;
  judgment?: boolean;
  judgmentAmount?: number;
  judgmentDate?: string;
  bankruptcy?: boolean;
  bankruptcyDate?: string;
  bankruptcyChapter?: string;
  divorce?: boolean;
  divorceDate?: string;
  probate?: boolean;
  probateDate?: string;
  estate?: boolean;
  inherited?: boolean;
  vacant?: boolean;
  vacantIndicators?: string[];
  // MLS / Listing
  listed?: boolean;
  listingId?: string;
  listingDate?: string;
  listingPrice?: number;
  originalListPrice?: number;
  priceReductions?: number;
  lastPriceChange?: string;
  lastPriceChangeAmount?: number;
  daysOnMarket?: number;
  cumulativeDaysOnMarket?: number;
  mlsStatus?: string;
  mlsStatusDate?: string;
  mlsExpired?: boolean;
  mlsCancelled?: boolean;
  mlsWithdrawn?: boolean;
  listingAgent?: string;
  listingBroker?: string;
  // HOA
  hoaFee?: number;
  hoaFrequency?: string;
  hoaName?: string;
  // School
  schoolDistrict?: string;
  elementarySchool?: string;
  middleSchool?: string;
  highSchool?: string;
  // Census
  censusTract?: string;
  censusBlock?: string;
  censusBlockGroup?: string;
  // Flood
  floodZone?: string;
  floodRisk?: string;
  // Source
  source: string;
  lastUpdated: string;
  // Raw
  rawResponse?: Record<string, unknown>;
}

export interface PropertyAddressDto {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  zip4?: string;
  county?: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  formattedAddress: string;
  // Parsed components
  streetNumber?: string;
  streetName?: string;
  streetSuffix?: string;
  streetDirection?: string;
  unitType?: string;
  unitNumber?: string;
}

export interface PropertySetbacksDto {
  front?: number;
  rear?: number;
  left?: number;
  right?: number;
}

export interface PropertySaleDto {
  saleDate: string;
  salePrice: number;
  saleType?: string;
  documentType?: string;
  documentNumber?: string;
  buyerNames?: string[];
  sellerNames?: string[];
  lenderName?: string;
  loanAmount?: number;
}

export interface PropertyLoanDto {
  loanAmount: number;
  loanDate: string;
  loanType?: string;
  interestRate?: number;
  interestRateType?: 'fixed' | 'adjustable' | 'unknown';
  loanTerm?: number;
  maturityDate?: string;
  lenderName?: string;
  loanPosition?: number;
  documentNumber?: string;
}

export interface PropertyOwnerDto {
  ownerType: 'individual' | 'corporate' | 'trust' | 'estate' | 'government' | 'unknown';
  // Individual owners
  owner1FirstName?: string;
  owner1MiddleName?: string;
  owner1LastName?: string;
  owner1Suffix?: string;
  owner2FirstName?: string;
  owner2MiddleName?: string;
  owner2LastName?: string;
  owner2Suffix?: string;
  // Corporate/Trust
  corporateName?: string;
  trustName?: string;
  // Contact
  mailingAddress?: PropertyAddressDto;
  phone?: string;
  email?: string;
}

// Bulk property detail request/response
export interface PropertyDetailBulkRequestDto {
  propertyIds?: string[];
  addresses?: PropertyAddressDto[];
  apns?: string[];
}

export interface PropertyDetailBulkResponseDto {
  success: boolean;
  total: number;
  found: number;
  notFound: number;
  properties: PropertyDetailDto[];
  errors?: Array<{ input: string; error: string }>;
}
