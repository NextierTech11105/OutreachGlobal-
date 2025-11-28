export interface WorkflowAction {
  type: string;
  config: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  actions: WorkflowAction[];
  status: "active" | "draft" | "archived";
  createdAt: string;
  lastRunAt?: string;
}
