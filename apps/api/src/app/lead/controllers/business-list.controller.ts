import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BadRequestException, Controller, Param, Post } from "@nestjs/common";
import { BusinessListService } from "../services/business-list.service";
import { BaseController } from "@/app/base.controller";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { TeamSettingService } from "@/app/team/services/team-setting.service";
import { User } from "@/app/user/models/user.model";
import { BusinessListSettings } from "@/app/team/objects/business-list-settings.object";
import { z } from "@nextier/dto";

@Controller("rest/:teamId/business-list")
@UseAuthGuard()
export class BusinessListController extends BaseController {
  constructor(
    private service: BusinessListService,
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private settingService: TeamSettingService,
  ) {
    super();
  }

  @Post()
  async search(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().read(user, team);

    const input = this.validate(
      z.object({
        searchQuery: z.string().default(""),
        state: z.optional(z.array(z.string())),
        title: z.optional(z.array(z.string())),
        company_name: z.optional(z.array(z.string())),
        company_domain: z.optional(z.array(z.string())),
        industry: z.optional(z.array(z.string())),
      }),
    );

    return await this.service.search({
      token: "", // Token not needed for RealEstateAPI (uses env var)
      ...input,
      q: input.searchQuery,
      limit: 10,
    });
  }
}
