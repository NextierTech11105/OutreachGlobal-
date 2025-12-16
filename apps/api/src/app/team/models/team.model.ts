import { TimestampModel } from "@/app/apollo/base-model";
import { StringField } from "@/app/apollo/decorators";
import { teamsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type TeamSelect = typeof teamsTable.$inferSelect;
export type TeamInsert = typeof teamsTable.$inferInsert;

@ObjectType()
export class Team extends TimestampModel implements TeamSelect {
  ownerId: string;

  @StringField({ nullable: true })
  whiteLabelId: string | null;

  @Field()
  name: string;

  @Field()
  slug: string;

  @StringField({ nullable: true })
  description: string | null;
}
