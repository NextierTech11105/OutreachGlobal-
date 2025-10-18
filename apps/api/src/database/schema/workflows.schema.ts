import {
  pgTable,
  varchar,
  text,
  jsonb,
  primaryKey,
  index,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../columns/timestamps";
import { AnyObject, WorkflowTaskType } from "@nextier/common";
import { primaryUlid, ulidColumn } from "../columns/ulid";
import { relations } from "drizzle-orm";
import { teamsRef } from "./teams.schema";

export const WORKFLOW_PK = "wf";
export const WORKFLOW_STEP_PK = "ws";
export const WORKFLOW_LINK_PK = "wl";
export const WORKFLOW_RUN_PK = "wr";
export const WORKFLOW_STEP_RUN_PK = "wsr";
export const WORKFLOW_VERSION_ID = "wver";

export const workflowTasks = pgTable("workflow_tasks", {
  id: varchar().notNull().unique(),
  version: varchar().notNull().default("0.1"),
  label: varchar().notNull(),
  description: varchar(),
  categories: text().array().notNull(),
  type: varchar().$type<WorkflowTaskType>().notNull(), //TRIGGER / ACTION / CONDITION / WAIT
  outputPorts: text().array().notNull(), //THEN, OTHERWISE
  inputPort: varchar(),
  paths: text().array().notNull(),
  objectTypes: text().array(),
  createdAt,
  updatedAt,
});

export const workflowFields = pgTable("workflow_fields", {
  key: varchar().unique().primaryKey(),
  label: varchar().notNull(),
  description: text(),
  resource: varchar(), // the resouce of input fields, usually refer to other table
  inputType: varchar().notNull(), //input text area select etc
  displayType: varchar(), //special input tike like displaying inside popover, modal etc
  valueType: varchar().notNull(), //string, number, boolean, object, array, etc
  validations: jsonb().$type<AnyObject>(), //JSON schema validation, must return object schema as top level validation
  possibleObjectTypes: text().array(),
  metadata: jsonb().$type<AnyObject>(),
  createdAt,
  updatedAt,
});

export const workflowTaskFields = pgTable(
  "workflow_task_fields",
  {
    taskId: varchar()
      .references(() => workflowTasks.id, { onDelete: "cascade" })
      .notNull(),
    fieldKey: varchar()
      .references(() => workflowFields.key, { onDelete: "cascade" })
      .notNull(),
    metadata: jsonb().$type<AnyObject>(),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.fieldKey] })],
);

export const workflows = pgTable(
  "workflows",
  {
    id: primaryUlid(WORKFLOW_PK),
    teamId: teamsRef({ onDelete: "cascade" }).notNull(),
    active: boolean().notNull().default(false),
    priority: integer().notNull().default(1),
    version: ulidColumn().notNull(),
    parentVersion: ulidColumn(),
    name: varchar().notNull(),
    description: text(),
    data: jsonb().$type<AnyObject>(),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.teamId)],
);

export const workflowSteps = pgTable(
  "workflow_steps",
  {
    id: primaryUlid(WORKFLOW_STEP_PK),
    workflowId: ulidColumn()
      .references(() => workflows.id, { onDelete: "cascade" })
      .notNull(),
    taskId: varchar()
      .references(() => workflowTasks.id, { onDelete: "cascade" })
      .notNull(),
    taskType: varchar().notNull().$type<WorkflowTaskType>(),
    position: jsonb().$type<{ x: number; y: number }>().notNull(),
    order: integer().notNull(),
    description: text(),
    conditions: jsonb().$type<any[]>(),
    data: jsonb().$type<AnyObject>(),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.workflowId), index().on(t.taskId)],
);

export const workflowLinks = pgTable(
  "workflow_links",
  {
    id: primaryUlid(WORKFLOW_LINK_PK),
    workflowId: ulidColumn()
      .notNull()
      .references(() => workflows.id, {
        onDelete: "cascade",
      }),
    sourceStepId: ulidColumn()
      .notNull()
      .references(() => workflowSteps.id, {
        onDelete: "cascade",
      }),
    targetStepId: ulidColumn()
      .notNull()
      .references(() => workflowSteps.id, {
        onDelete: "cascade",
      }),
    sourcePort: varchar().notNull(), //this will be combine id of step_{port}
    targetPort: varchar().notNull(), //this will be combine id of step_{port}
  },
  (t) => [
    index().on(t.workflowId),
    index().on(t.sourceStepId),
    index().on(t.targetStepId),
  ],
);

export const workflowStepFields = pgTable(
  "workflow_step_fields",
  {
    workflowId: ulidColumn()
      .references(() => workflows.id, { onDelete: "cascade" })
      .notNull(), // if this lead to redundant we remove this
    stepId: ulidColumn()
      .references(() => workflowSteps.id, { onDelete: "cascade" })
      .notNull(),
    key: varchar()
      .references(() => workflowFields.key, { onDelete: "cascade" })
      .notNull(),
    isReference: boolean().notNull().default(false),
    valueRef: varchar().notNull(),
    value: text(),
  },
  (t) => [
    primaryKey({
      columns: [t.stepId, t.key],
    }),
    index().on(t.workflowId),
  ],
);

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: primaryUlid(WORKFLOW_RUN_PK),
    workflowId: ulidColumn()
      .references(() => workflows.id, {
        onDelete: "cascade",
      })
      .notNull(),
    startedAt: timestamp().notNull(),
    status: varchar().notNull(),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.workflowId)],
);

export const workflowStepRuns = pgTable(
  "workflow_step_runs",
  {
    id: primaryUlid(WORKFLOW_STEP_RUN_PK),
    runId: ulidColumn()
      .references(() => workflowRuns.id, { onDelete: "cascade" })
      .notNull(),
    stepId: ulidColumn()
      .references(() => workflowSteps.id, { onDelete: "cascade" })
      .notNull(),
    failures: integer().notNull().default(0),
    retries: integer().notNull().default(0),
    successes: integer().notNull().default(0),
    inputData: jsonb().$type<AnyObject>(),
    outputData: jsonb().$type<AnyObject>(),
    createdAt,
    updatedAt,
  },
  (t) => [index().on(t.runId), index().on(t.stepId)],
);

/*
|-----------
| Relations
|-----------
*/
export const workflowRelations = relations(workflows, ({ many }) => ({
  steps: many(workflowSteps),
  links: many(workflowLinks),
}));

export const workflowStepRelations = relations(
  workflowSteps,
  ({ one, many }) => ({
    task: one(workflowTasks, {
      fields: [workflowSteps.taskId],
      references: [workflowTasks.id],
    }),
    fields: many(workflowStepFields),
    workflow: one(workflows, {
      fields: [workflowSteps.workflowId],
      references: [workflows.id],
    }),
  }),
);

export const workflowLinkRelations = relations(workflowLinks, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowLinks.workflowId],
    references: [workflows.id],
  }),
}));

export const workflowStepFieldRelations = relations(
  workflowStepFields,
  ({ one }) => ({
    step: one(workflowSteps, {
      fields: [workflowStepFields.stepId],
      references: [workflowSteps.id],
    }),
    field: one(workflowFields, {
      fields: [workflowStepFields.key],
      references: [workflowFields.key],
    }),
  }),
);

export const workflowTaskFieldRelations = relations(
  workflowTaskFields,
  ({ one }) => ({
    field: one(workflowFields, {
      fields: [workflowTaskFields.fieldKey],
      references: [workflowFields.key],
    }),
  }),
);
