/**
 * USBizData CSV format interface
 *
 * This interface represents the column headers from USBizData CSV exports.
 * Each property corresponds to a column in the exported CSV file.
 */
export interface USBizDataRow {
  "Company Name": string;
  "Contact Name": string;
  "Email Address": string;
  "Street Address": string;
  City: string;
  State: string;
  "Zip Code": string;
  County: string;
  "Area Code": string;
  "Phone Number": string;
  "Website URL": string;
  "Number of Employees": string;
  "Annual Revenue": string;
  "SIC Code": string;
  "SIC Description": string;
}

/**
 * Headers that identify a USBizData CSV format
 */
export const US_BIZ_DATA_HEADERS = [
  "Company Name",
  "Contact Name",
  "Email Address",
  "Street Address",
  "City",
  "State",
  "Zip Code",
  "County",
  "Area Code",
  "Phone Number",
  "Website URL",
  "Number of Employees",
  "Annual Revenue",
  "SIC Code",
  "SIC Description",
] as const;
