import { TimestampModel } from "@/app/apollo/base-model";
import { JSONScalar } from "@/app/apollo/scalars/json.scalar";
import { integrationsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";

export type IntegrationSelect = typeof integrationsTable.$inferSelect;
export type IntegrationInsert = typeof integrationsTable.$inferInsert;

@ObjectType()
export class Integration extends TimestampModel implements IntegrationSelect {
  teamId: string;

  @Field()
  name: string;

  @Field()
  enabled: boolean;

  @Field(() => JSONScalar, { nullable: true })
  settings: AnyObject | null;

  authData: AnyObject | null;

  tokenExpiresAt: Date | null;
}
