import { TimestampModel } from "@/app/apollo/base-model";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { integrationTasksTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";

export type IntegrationTaskSelect = typeof integrationTasksTable.$inferSelect;
export type IntegrationTaskInsert = typeof integrationTasksTable.$inferInsert;

@ObjectType()
export class IntegrationTask
  extends TimestampModel
  implements IntegrationTaskSelect
{
  integrationId: string;

  @Field()
  moduleName: string;

  @Field()
  status: string;

  @Field()
  type: string;

  metadata: AnyObject | null;
}

@ObjectType()
export class IntegrationTaskEdge extends WithEdge(IntegrationTask) {}

@ObjectType()
export class IntegrationTaskConnection extends WithConnection(
  IntegrationTaskEdge,
) {}
