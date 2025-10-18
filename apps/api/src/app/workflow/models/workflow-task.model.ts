import { TimestampModel } from "@/app/apollo/base-model";
import { StringField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { workflowTasksTable } from "@/database/schema-alias";
import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";
import { WorkflowTaskType } from "@nextier/common";

export type WorkflowTaskSelect = typeof workflowTasksTable.$inferSelect;
export type WorkflowTaskInsert = typeof workflowTasksTable.$inferInsert;

registerEnumType(WorkflowTaskType, {
  name: "WorkflowTaskType",
});

@ObjectType()
export class WorkflowTask extends TimestampModel implements WorkflowTaskSelect {
  @Field()
  version: string;

  @Field()
  label: string;

  @StringField()
  description: string | null;

  @Field(() => [String])
  categories: string[];

  @Field(() => WorkflowTaskType)
  type: WorkflowTaskType;

  @Field(() => [String])
  outputPorts: string[];

  @StringField({ nullable: true })
  inputPort: string | null;

  @Field(() => [String])
  paths: string[];

  @Field(() => [String], { nullable: true })
  objectTypes: string[] | null;
}

@ObjectType()
export class WorkflowTaskEdge extends WithEdge(WorkflowTask) {}

@ObjectType()
export class WorkflowTaskConnection extends WithConnection(WorkflowTaskEdge) {}
