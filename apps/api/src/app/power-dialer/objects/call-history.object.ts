import { Field, ObjectType } from "@nestjs/graphql";
import { CallHistory, CallHistorySelect } from "../models/call-history.model";

@ObjectType()
export class CreateCallHistoryPayload {
  @Field(() => CallHistory)
  callHistory: CallHistorySelect;
}
