import { Field, ObjectType } from "@nestjs/graphql";
import { PowerDialer, PowerDialerSelect } from "../models/power-dialer.model";

@ObjectType()
export class CreatePowerDialerPayload {
  @Field(() => PowerDialer)
  powerDialer: PowerDialerSelect;
}
