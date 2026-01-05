export enum CampaignStatus {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
}

export enum CampaignSequenceStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
}

export enum CampaignExecutionStatus {
  PENDING = "PENDING",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
  BLOCKED = "BLOCKED", // Blocked by OutboundGate (suppressed, DNC, opt-out)
}

export enum CampaignEventName {
  SENT = "SENT",
  OPENED = "OPENED",
  CLICKED = "CLICKED",
  DELIVERED = "DELIVERED",
  BOUNCED = "BOUNCED",
}
