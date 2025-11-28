import { TimestampModel } from "@/app/apollo/base-model";
import { StringField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { JSONScalar } from "@/app/apollo/scalars/json.scalar";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { campaignSequencesTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { PgUpdateSetSource } from "drizzle-orm/pg-core";

export type CampaignSequenceSelect = typeof campaignSequencesTable.$inferSelect;
export type CampaignSequenceInsert = typeof campaignSequencesTable.$inferInsert;
export type CampaignSequenceUpdate = PgUpdateSetSource<
  typeof campaignSequencesTable
>;

@ObjectType()
export class CampaignSequence
  extends TimestampModel
  implements CampaignSequenceSelect
{
  campaignId: string;

  @Field()
  type: string;

  @Field()
  name: string;

  @Field()
  position: number;

  @Field()
  content: string;

  @StringField({ nullable: true })
  subject: MaybeString;

  @StringField({ nullable: true })
  voiceType: MaybeString;

  @Field()
  delayDays: number;

  @Field()
  delayHours: number;

  @Field(() => JSONScalar, { nullable: true })
  metadata: Record<string, any> | null;
}

@ObjectType()
export class CampaignSequenceEdge extends WithEdge(CampaignSequence) {}

@ObjectType()
export class CampaignSequenceConnection extends WithConnection(
  CampaignSequenceEdge,
) {}
