export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

export type LeadSource =
  | "Website"
  | "Referral"
  | "Campaign"
  | "Cold Call"
  | "Social Media"
  | "Event"
  | "Other";

export type LeadPriority = "Low" | "Medium" | "High" | "Urgent";

export type PhoneLineType =
  | "mobile"
  | "landline"
  | "voip"
  | "toll_free"
  | "premium"
  | "unknown";

export interface PhoneNumber {
  number: string;
  label: string;
  isPrimary: boolean;
  lineType?: PhoneLineType;
  carrier?: string;
  verified: boolean;
  lastVerified?: string;
}

export interface Lead {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyValue: number;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  yearBuilt?: number;
  email?: string;
  phone?: string; // Keeping for backward compatibility
  phoneNumbers: PhoneNumber[]; // New field for multiple phone numbers with line type
  company?: string;
  status: LeadStatus;
  source: LeadSource;
  priority: LeadPriority;
  assignedTo?: string;
  lastContactDate?: string;
  nextFollowUp?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilter {
  status?: LeadStatus[];
  source?: LeadSource[];
  priority?: LeadPriority[];
  assignedTo?: string[];
  propertyType?: string[];
  minPropertyValue?: number;
  maxPropertyValue?: number;
  tags?: string[];
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
}
