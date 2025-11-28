/**
 * Supported filters for RealEstateAPI property search.
 * Only defined values are sent to the upstream API.
 */
export interface RealEstatePropertySearchOptions {
  state?: string;
  limit?: number;
  size?: number;
  reverseMortgage?: boolean; // reverse_mortgage
  death?: boolean; // probate indicator
  judgment?: boolean; // judgment lien
  reo?: boolean; // bank owned
  noticeType?: "FOR" | "NOD" | "NOL" | "NTS" | "REO";
  negativeEquity?: boolean;
  ltvMin?: number;
  ltvMax?: number;
}
