import { TimestampModel } from "@/app/apollo/base-model";
import { DateField, IdField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { MaybeDate } from "@/app/apollo/types/maybe.type";
import { campaignLeadsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type CampaignLeadSelect = typeof campaignLeadsTable.$inferSelect;
export type CampaignLeadInsert = typeof campaignLeadsTable.$inferInsert;

@ObjectType()
export class CampaignLead extends TimestampModel implements CampaignLeadSelect {
  campaignId: string;

  @IdField()
  leadId: string;

  currentSequencePosition: number;

  @Field()
  currentSequenceStatus: string;

  @DateField({ nullable: true })
  lastSequenceExecutedAt: MaybeDate;

  @DateField({ nullable: true })
  nextSequenceRunAt: MaybeDate;

  @Field()
  status: string;
}

@ObjectType()
export class CampaignLeadEdge extends WithEdge(CampaignLead) {}

@ObjectType()
export class CampaignLeadConnection extends WithConnection(CampaignLeadEdge) {}
