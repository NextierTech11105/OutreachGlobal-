import { Mutation, Resolver, Args, Query } from "@nestjs/graphql";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { User } from "@/app/user/models/user.model";
import { IntegrationFieldService } from "../services/integration-field.service";
import {
  FindIntegrationFieldsArgs,
  UpsertIntegrationFieldsArgs,
} from "../args/integration-field.args";
import { UpsertIntegrationFieldPayload } from "../objects/integration-field.object";
import {
  IntegrationField,
  IntegrationFieldSelect,
} from "../models/integration-field.model";
import { IntegrationService } from "../services/integration.service";
import { LEAD_FIELDS } from "@/app/lead/lead-fields";

@Resolver()
@UseAuthGuard()
export class IntegrationFieldResolver {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private integrationFieldService: IntegrationFieldService,
    private integrationService: IntegrationService,
  ) {}

  @Query(() => [IntegrationField])
  async integrationFields(
    @Auth() user: User,
    @Args() args: FindIntegrationFieldsArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    const integration = await this.integrationService.findOneOrFail({
      id: args.integrationId,
      teamId: team.id,
    });

    const fields = await this.integrationFieldService.findMany({
      integrationId: integration.id,
      moduleName: args.moduleName,
    });

    return LEAD_FIELDS.map((field) => {
      const value: IntegrationFieldSelect = {
        id: `${field}_${integration.id}`,
        sourceField: field,
        targetField: "",
        subField: null,
        createdAt: new Date(),
        updatedAt: null,
        integrationId: integration.id,
        moduleName: args.moduleName,
        metadata: null,
      };

      const existingField = fields.find(
        (integrationField) => integrationField.sourceField === field,
      );

      if (existingField) {
        return existingField;
      }
      return value;
    });
  }

  @Mutation(() => UpsertIntegrationFieldPayload)
  async upsertIntegrationFields(
    @Auth() user: User,
    @Args() args: UpsertIntegrationFieldsArgs,
  ): Promise<UpsertIntegrationFieldPayload> {
    // Verify team access
    const team = await this.teamService.findById(args.teamId);

    // Check policy
    await this.teamPolicy.can().read(user, team);

    // Perform the upsert operation
    const fields = await this.integrationFieldService.upsert(args);

    return { fields };
  }
}
