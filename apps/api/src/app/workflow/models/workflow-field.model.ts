import { workflowFieldsTable } from "@/database/schema-alias";

export type WorkflowFieldSelect = typeof workflowFieldsTable.$inferSelect;
export type WorkflowFieldInsert = typeof workflowFieldsTable.$inferInsert;
