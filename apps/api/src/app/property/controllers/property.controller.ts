import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { Body, Controller, Param, Post } from "@nestjs/common";
import { RealEstateService } from "../services/real-estate.service";
import { BaseController } from "@/app/base.controller";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { User } from "@/app/user/models/user.model";
import { z } from "@nextier/dto";

@Controller("rest/:teamId/property")
@UseAuthGuard()
export class PropertyController extends BaseController {
  constructor(
    private realEstateService: RealEstateService,
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
  ) {
    super();
  }

  @Post("search")
  async search(
    @Auth() user: User,
    @Param("teamId") teamId: string,
    @Body() body: Record<string, any>,
  ) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().read(user, team);

    const input = this.validate(
      z.object({
        state: z.string().optional(),
        city: z.string().optional(),
        county: z.string().optional(),
        neighborhood: z.string().optional(),
        zipCode: z.string().optional(),
        limit: z.number().default(100),
      }),
      body,
    );

    return await this.realEstateService.propertySearch({
      state: input.state || "NY",
      city: input.city,
      county: input.county,
      neighborhood: input.neighborhood,
      zipCode: input.zipCode,
      limit: input.limit,
    });
  }

  @Post("count")
  async count(
    @Auth() user: User,
    @Param("teamId") teamId: string,
    @Body() body: Record<string, any>,
  ) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().read(user, team);

    const input = this.validate(
      z.object({
        state: z.string().optional(),
        city: z.string().optional(),
        county: z.string().optional(),
        neighborhood: z.string().optional(),
        zipCode: z.string().optional(),
        propertyType: z.string().optional(),
        propertyCode: z.string().optional(),
      }),
      body,
    );

    return await this.realEstateService.propertyCount({
      state: input.state,
      city: input.city,
      county: input.county,
      neighborhood: input.neighborhood,
      zipCode: input.zipCode,
      propertyType: input.propertyType,
      propertyCode: input.propertyCode,
    });
  }
}
