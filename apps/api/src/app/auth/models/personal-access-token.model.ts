import { Field, ObjectType } from "@nestjs/graphql";
import { UserAgent } from "../objects/user-agent.object";
import { personalAccessTokensTable } from "@/database/schema-alias";
import { TimestampModel } from "@/app/apollo/base-model";
import { DateField, StringField } from "@/app/apollo/decorators";

export type PersonalAccessTokenSelect =
  typeof personalAccessTokensTable.$inferSelect;
export type PersonalAccessTokenInsert =
  typeof personalAccessTokensTable.$inferInsert;

@ObjectType()
export class PersonalAccessToken
  extends TimestampModel
  implements PersonalAccessTokenSelect
{
  userId: string;

  @StringField({ nullable: true })
  name: string;

  @DateField({ nullable: true })
  expiredAt: Date | null;

  @DateField({ nullable: true })
  lastUsedAt: Date | null;

  @Field(() => UserAgent, { nullable: true })
  userAgent: UserAgent;
}
