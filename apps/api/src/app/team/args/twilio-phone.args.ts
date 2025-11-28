import { ArgsType, Field } from "@nestjs/graphql";
import { BaseTeamArgs } from "./team.args";
import { IdField } from "@/app/apollo/decorators";

@ArgsType()
export class FindManyTwilioPhoneArgs extends BaseTeamArgs {}

@ArgsType()
export class PurchaseTwilioPhoneArgs extends BaseTeamArgs {
  @Field(() => String, { description: "Area code" })
  areaCode: string;

  @Field(() => String, { description: "Friendly name" })
  friendlyName: string;
}

@ArgsType()
export class DeleteTwilioPhoneArgs extends BaseTeamArgs {
  @IdField()
  sid: string;
}
