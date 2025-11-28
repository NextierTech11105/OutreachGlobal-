import { ObjectType, Field } from "@nestjs/graphql";
import { Lead, LeadSelect } from "../models/lead.model";
import {
  LeadPhoneNumber,
  LeadPhoneNumberSelect,
} from "../models/lead-phone-number.model";

@ObjectType()
export class CreateLeadPayload {
  @Field(() => Lead)
  lead: LeadSelect;
}

@ObjectType()
export class UpdateLeadPayload {
  @Field(() => Lead)
  lead: LeadSelect;
}

@ObjectType()
export class DeleteLeadPayload {
  @Field()
  deletedLeadId: string;
}

@ObjectType()
export class BulkDeleteLeadPayload {
  @Field()
  deletedLeadsCount: number;
}

@ObjectType()
export class LeadPhoneNumberPayload {
  @Field(() => LeadPhoneNumber)
  leadPhoneNumber: LeadPhoneNumberSelect;
}

@ObjectType()
export class DeleteLeadPhoneNumberPayload {
  @Field()
  deletedLeadPhoneNumberId: string;
}

@ObjectType()
export class UpdateLeadPositionPayload {
  @Field(() => Lead)
  lead: LeadSelect;
}
