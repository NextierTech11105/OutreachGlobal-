import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { workflowsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";

export type WorkflowSelect = typeof workflowsTable.$inferSelect;
export type WorkflowInsert = typeof workflowsTable.$inferInsert;

@ObjectType()
export class Workflow extends TimestampModel implements WorkflowSelect {
  teamId: string;

  @Field()
  version: string;

  parentVersion: string | null;

  @IntField()
  priority: number;

  @Field()
  active: boolean;

  @Field()
  name: string;

  @StringField({ nullable: true })
  description: string | null;

  data: AnyObject | null;
}

@ObjectType()
export class WorkflowEdge extends WithEdge(Workflow) {}

@ObjectType()
export class WorkflowConnection extends WithConnection(WorkflowEdge) {}
