export enum ContentItemType {
  PROMPT = "PROMPT",
  TEMPLATE = "TEMPLATE",
  SCRIPT = "SCRIPT",
  DOCUMENTATION = "DOCUMENTATION",
  SQL_QUERY = "SQL_QUERY",
  CODE_SNIPPET = "CODE_SNIPPET",
  // Link types for AI copilot distribution
  MEDIUM_ARTICLE = "MEDIUM_ARTICLE",
  NEWSLETTER = "NEWSLETTER",
  EXTERNAL_LINK = "EXTERNAL_LINK",
  EBOOK = "EBOOK",
  ONE_PAGER = "ONE_PAGER",
  CASE_STUDY = "CASE_STUDY",
  VIDEO = "VIDEO",
  // Social media content types
  SOCIAL_POST = "SOCIAL_POST",
  SOCIAL_AD = "SOCIAL_AD",
  SOCIAL_CAROUSEL = "SOCIAL_CAROUSEL",
  SOCIAL_STORY = "SOCIAL_STORY",
  SOCIAL_REEL = "SOCIAL_REEL",
  // SMS content link types
  SMS_CONTENT_LINK = "SMS_CONTENT_LINK",
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
