export enum ContentItemType {
  PROMPT = "PROMPT",
  TEMPLATE = "TEMPLATE",
  SCRIPT = "SCRIPT",
  DOCUMENTATION = "DOCUMENTATION",
  SQL_QUERY = "SQL_QUERY",
  CODE_SNIPPET = "CODE_SNIPPET",
}

export enum ContentVisibility {
  PUBLIC = "PUBLIC", // visible to all teams (admin only)
  TEAM = "TEAM", // visible to team members
  PRIVATE = "PRIVATE", // visible only to creator
}

export enum ContentUsedIn {
  AI = "AI",
  CAMPAIGN = "CAMPAIGN",
  MANUAL = "MANUAL",
  API = "API",
}

export interface ContentVariable {
  name: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
}
