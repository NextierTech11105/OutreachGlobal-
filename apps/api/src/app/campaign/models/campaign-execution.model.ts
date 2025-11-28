import { TimestampModel } from "@/app/apollo/base-model";
import { StringField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { campaignExecutionsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";

export type CampaignExecutionSelect =
  typeof campaignExecutionsTable.$inferSelect;

@ObjectType()
export class CampaignExecution
  extends TimestampModel
  implements CampaignExecutionSelect
{
  campaignId: string;
  leadId: string;
  sequenceId: string;

  @Field()
  status: string;

  @StringField({ nullable: true })
  failedReason: MaybeString;

  metadata: Maybe<AnyObject>;
}

@ObjectType()
export class CampaignExecutionEdge extends WithEdge(CampaignExecution) {}

@ObjectType()
export class CampaignExecutionConnection extends WithConnection(
  CampaignExecutionEdge,
) {}
