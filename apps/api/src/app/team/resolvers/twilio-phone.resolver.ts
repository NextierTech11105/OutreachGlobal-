import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  DeleteTwilioPhonePayload,
  PurchaseTwilioPhonePayload,
  TwilioPhone,
} from "../objects/twilio-phone.object";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "../services/team.service";
import { TeamPolicy } from "../policies/team.policy";
import { TeamSettingService } from "../services/team-setting.service";
import { TwilioService } from "@/lib/twilio/twilio.service";
import { User } from "@/app/user/models/user.model";
import {
  DeleteTwilioPhoneArgs,
  FindManyTwilioPhoneArgs,
  PurchaseTwilioPhoneArgs,
} from "../args/twilio-phone.args";
import { BadRequestException } from "@nestjs/common";

@Resolver(() => TwilioPhone)
@UseAuthGuard()
export class TwilioPhoneResolver extends BaseResolver(TwilioPhone) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private setting: TeamSettingService,
    private twilioService: TwilioService,
  ) {
    super();
  }

  @Query(() => [TwilioPhone])
  async twilioPhones(
    @Auth() user: User,
    @Args() args: FindManyTwilioPhoneArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const twilioSettings = await this.setting.getMapped(args.teamId, "twilio");
    const client = this.twilioService.createClient({
      accountSid: twilioSettings.twilioAccountSid,
      authToken: twilioSettings.twilioAuthToken,
    });
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    return phoneNumbers;
  }

  @Mutation(() => PurchaseTwilioPhonePayload)
  async purchaseTwilioPhone(
    @Auth() user: User,
    @Args() args: PurchaseTwilioPhoneArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);
    const twilioSettings = await this.setting.getMapped(args.teamId, "twilio");
    const client = this.twilioService.createClient({
      accountSid: twilioSettings.twilioAccountSid,
      authToken: twilioSettings.twilioAuthToken,
    });
    try {
      const phoneNumber = await client.incomingPhoneNumbers.create({
        areaCode: args.areaCode,
        friendlyName: args.friendlyName,
      });
      return { phone: phoneNumber };
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Mutation(() => DeleteTwilioPhonePayload)
  async deleteTwilioPhone(
    @Auth() user: User,
    @Args() args: DeleteTwilioPhoneArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().manage(user, team);
    const twilioSettings = await this.setting.getMapped(args.teamId, "twilio");
    const client = this.twilioService.createClient({
      accountSid: twilioSettings.twilioAccountSid,
      authToken: twilioSettings.twilioAuthToken,
    });
    try {
      await client.incomingPhoneNumbers(args.sid).remove();
      return { deletedSid: args.sid };
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
