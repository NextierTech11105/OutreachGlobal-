import { AnyObject } from "@nextier/common";

export interface ZohoAuthData {
  scope: string;
  api_domain: string;
  expires_in: number;
  token_type: string;
  access_token: string;
  refresh_token: string;
}

export interface ZohoRecordOptions {
  fields: string[];
  moduleName: string;
  pageToken?: string;
  perPage?: number;
}

export interface ZohoRecordResult {
  data: (AnyObject & { id: string })[];
  info: {
    per_page: number;
    next_page_token?: string;
    more_records: boolean;
  };
}
