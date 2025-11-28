import { IdField, IntField, StringField } from "@/app/apollo/decorators";
import { Field, InputType } from "@nestjs/graphql";
import { DialerMode } from "@nextier/common";

@InputType()
export class CreateCallHistoryInput {
  @IdField({ nullable: true })
  aiSdrAvatarId?: string;

  @StringField({ nullable: true })
  sid?: string;

  @StringField({ nullable: true })
  notes?: string;

  @StringField({ nullable: true })
  disposition?: string;

  @IntField({ nullable: true })
  duration?: number;

  @Field()
  dialerMode: DialerMode;
}
