import { ArgsType, Field } from "@nestjs/graphql";
import { BaseTeamArgs } from "./team.args";
import { TwilioSettingsInput } from "../inputs/twilio-settings.input";
import { SendgridSettingsInput } from "../inputs/sendgrid-settings.input";

@ArgsType()
export class UpdateTwilioSettingsArgs extends BaseTeamArgs {
  @Field()
  input: TwilioSettingsInput;
}

@ArgsType()
export class UpdateSendgridSettingsArgs extends BaseTeamArgs {
  @Field()
  input: SendgridSettingsInput;
}

@ArgsType()
export class TestSendgridSendEmailArgs extends BaseTeamArgs {
  @Field()
  email: string;
}

@ArgsType()
export class TestTwilioSendSmsArgs extends BaseTeamArgs {}
