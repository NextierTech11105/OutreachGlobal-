import { workflowStepsTable } from "@/database/schema-alias";

export type WorkflowStepInsert = typeof workflowStepsTable.$inferInsert;
