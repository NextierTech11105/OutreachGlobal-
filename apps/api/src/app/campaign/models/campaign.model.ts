import { TimestampModel } from "@/app/apollo/base-model";
import { DateField, IntField, StringField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { JSONScalar } from "@/app/apollo/scalars/json.scalar";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { campaignsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type CampaignSelect = typeof campaignsTable.$inferSelect;
export type CampaignInsert = typeof campaignsTable.$inferInsert;

@ObjectType()
export class Campaign extends TimestampModel implements CampaignSelect {
  teamId: string;

  sdrId: MaybeString;

  @Field()
  name: string;

  @StringField({ nullable: true })
  description: MaybeString;

  @Field()
  targetMethod: string;

  @Field()
  minScore: number;

  @Field()
  maxScore: number;

  @Field(() => JSONScalar, { nullable: true })
  location: Record<string, any> | null;

  @Field()
  status: string;

  @IntField()
  estimatedLeadsCount: number;

  @Field()
  startsAt: Date;

  @DateField({ nullable: true })
  endsAt: Date;

  @DateField({ nullable: true })
  pausedAt: Date;

  @DateField({ nullable: true })
  resumedAt: Date;

  @StringField({ nullable: true })
  approvedBy: MaybeString;

  @DateField({ nullable: true })
  approvedAt: Date | null;

  metadata: Record<string, any> | null;
}

@ObjectType()
export class CampaignEdge extends WithEdge(Campaign) {}

@ObjectType()
export class CampaignConnection extends WithConnection(CampaignEdge) {}
