import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import {
  ContentCategory,
  ContentCategoryConnection,
} from "../models/content-category.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { ContentCategoryService } from "../services/content-category.service";
import { User } from "@/app/user/models/user.model";
import {
  ContentCategoriesArgs,
  FindOneContentCategoryArgs,
  CreateContentCategoryArgs,
  UpdateContentCategoryArgs,
  DeleteContentCategoryArgs,
} from "../args/content-category.args";
import {
  CreateContentCategoryPayload,
  UpdateContentCategoryPayload,
  DeleteContentCategoryPayload,
} from "../objects/content-category.object";

@Resolver(() => ContentCategory)
@UseAuthGuard()
export class ContentCategoryResolver extends BaseResolver(ContentCategory) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: ContentCategoryService,
  ) {
    super();
  }

  @Query(() => [ContentCategory])
  async contentCategories(
    @Auth() user: User,
    @Args() args: ContentCategoriesArgs,
  ): Promise<ContentCategory[]> {
    // If teamId provided, verify access
    if (args.teamId) {
      const team = await this.teamService.findById(args.teamId);
      await this.teamPolicy.can().read(user, team);
    }

    return this.service.findMany({
      teamId: args.teamId ?? undefined,
      parentId: args.parentId,
      includeSystem: args.includeSystem ?? true,
    });
  }

  @Query(() => ContentCategory, { nullable: true })
  async contentCategory(
    @Auth() user: User,
    @Args() args: FindOneContentCategoryArgs,
  ): Promise<ContentCategory | null> {
    try {
      const category = await this.service.findById(args.id);

      // Verify team access if team-specific
      if (category.teamId) {
        const team = await this.teamService.findById(category.teamId);
        await this.teamPolicy.can().read(user, team);
      }

      return category;
    } catch {
      return null;
    }
  }

  @Query(() => [ContentCategory])
  async contentCategoryTree(
    @Auth() user: User,
    @Args("teamId", { nullable: true }) teamId?: string,
  ): Promise<ContentCategory[]> {
    if (teamId) {
      const team = await this.teamService.findById(teamId);
      await this.teamPolicy.can().read(user, team);
    }

    return this.service.getCategoryTree(teamId);
  }

  @Mutation(() => CreateContentCategoryPayload)
  async createContentCategory(
    @Auth() user: User,
    @Args() args: CreateContentCategoryArgs,
  ): Promise<CreateContentCategoryPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.create(team.id, args.input);
  }

  @Mutation(() => UpdateContentCategoryPayload)
  async updateContentCategory(
    @Auth() user: User,
    @Args() args: UpdateContentCategoryArgs,
  ): Promise<UpdateContentCategoryPayload> {
    const category = await this.service.findById(args.id);

    // Verify team access if team-specific
    if (category.teamId) {
      const team = await this.teamService.findById(category.teamId);
      await this.teamPolicy.can().read(user, team);
    }

    return this.service.update(args.id, args.input);
  }

  @Mutation(() => DeleteContentCategoryPayload)
  async deleteContentCategory(
    @Auth() user: User,
    @Args() args: DeleteContentCategoryArgs,
  ): Promise<DeleteContentCategoryPayload> {
    const category = await this.service.findById(args.id);

    // Verify team access if team-specific
    if (category.teamId) {
      const team = await this.teamService.findById(category.teamId);
      await this.teamPolicy.can().read(user, team);
    }

    return this.service.delete(args.id);
  }

  @ResolveField(() => ContentCategory, { nullable: true })
  async parent(
    @Parent() category: ContentCategory,
  ): Promise<ContentCategory | null> {
    if (!category.parentId) return null;
    try {
      return await this.service.findById(category.parentId);
    } catch {
      return null;
    }
  }

  @ResolveField(() => [ContentCategory])
  async children(
    @Parent() category: ContentCategory,
  ): Promise<ContentCategory[]> {
    return this.service.getChildren(category.id);
  }

  @ResolveField(() => Number)
  async itemCount(@Parent() category: ContentCategory): Promise<number> {
    return this.service.getItemCount(category.id);
  }
}
