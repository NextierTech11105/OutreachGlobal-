export interface WorkflowAction {
  type: string;
  config: Record<string, any>;
}

export interface WorkflowConfig {
  agent?: string; // GIANNA, CATHY, SABRINA
  templateIds?: string[];
  delayDays?: number;
  usesDifferentNumber?: boolean;
  campaignType?: string;
}

export interface Workflow {
  id: string;
  teamId?: string;
  name: string;
  description?: string;
  stage?: string; // initial_message, retarget, nudger, content_nurture, book_appt
  trigger?: string;
  actions?: WorkflowAction[];
  status: "active" | "draft" | "archived";
  priority?: number;
  config?: WorkflowConfig;
  runsCount?: number;
  createdAt: string;
  updatedAt?: string;
  lastRunAt?: string;
}
