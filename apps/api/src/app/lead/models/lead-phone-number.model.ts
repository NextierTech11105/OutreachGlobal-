import { TimestampModel } from "@/app/apollo/base-model";
import { leadPhoneNumbersTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type LeadPhoneNumberSelect = typeof leadPhoneNumbersTable.$inferSelect;
export type LeadPhoneNumberInsert = typeof leadPhoneNumbersTable.$inferInsert;

@ObjectType()
export class LeadPhoneNumber
  extends TimestampModel
  implements LeadPhoneNumberSelect
{
  leadId: string;

  @Field()
  phone: string;

  @Field()
  label: string;
}
