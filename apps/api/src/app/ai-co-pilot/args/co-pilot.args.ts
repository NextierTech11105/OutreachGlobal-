import { ArgsType, Field, ID, InputType, Int } from "@nestjs/graphql";
import { ResponseTone } from "../models/response-suggestion.model";

@ArgsType()
export class GenerateResponsesArgs {
  @Field(() => ID)
  teamId!: string;

  @Field()
  phoneNumber!: string;

  @Field()
  message!: string;

  @Field(() => ID)
  conversationId!: string;

  @Field(() => Int, { nullable: true, defaultValue: 3 })
  maxSuggestions?: number;

  @Field(() => ResponseTone, { nullable: true })
  preferredTone?: ResponseTone;

  @Field({ nullable: true, defaultValue: true })
  includeReasoning?: boolean;
}

@ArgsType()
export class AcceptSuggestionArgs {
  @Field(() => ID)
  teamId!: string;

  @Field(() => ID)
  suggestionId!: string;
}

@ArgsType()
export class RejectSuggestionArgs {
  @Field(() => ID)
  teamId!: string;

  @Field(() => ID)
  suggestionId!: string;

  @Field({ nullable: true })
  reason?: string;
}

@ArgsType()
export class GetPhoneConfigArgs {
  @Field(() => ID)
  teamId!: string;

  @Field()
  phoneNumber!: string;
}

@InputType()
export class CoPilotSettingsInput {
  @Field({ nullable: true })
  coPilotEnabled?: boolean;

  @Field(() => ResponseTone, { nullable: true })
  defaultTone?: ResponseTone;

  @Field({ nullable: true })
  aiAgent?: string;

  @Field({ nullable: true })
  autoSuggest?: boolean;
}

@ArgsType()
export class UpdateCoPilotSettingsArgs {
  @Field(() => ID)
  teamId!: string;

  @Field()
  phoneNumber!: string;

  @Field(() => CoPilotSettingsInput)
  input!: CoPilotSettingsInput;
}
