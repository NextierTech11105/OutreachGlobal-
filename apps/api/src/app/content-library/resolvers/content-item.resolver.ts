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
  ContentItem,
  ContentItemConnection,
} from "../models/content-item.model";
import { ContentCategory } from "../models/content-category.model";
import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { ContentItemService } from "../services/content-item.service";
import { ContentCategoryService } from "../services/content-category.service";
import { User } from "@/app/user/models/user.model";
import {
  ContentItemConnectionArgs,
  FindOneContentItemArgs,
  CreateContentItemArgs,
  UpdateContentItemArgs,
  DeleteContentItemArgs,
  UseContentItemArgs,
  DuplicateContentItemArgs,
  ToggleFavoriteArgs,
} from "../args/content-item.args";
import {
  CreateContentItemPayload,
  UpdateContentItemPayload,
  DeleteContentItemPayload,
  UseContentItemPayload,
} from "../objects/content-item.object";
import { ContentUsedIn } from "@nextier/common";

@Resolver(() => ContentItem)
@UseAuthGuard()
export class ContentItemResolver extends BaseResolver(ContentItem) {
  constructor(
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
    private service: ContentItemService,
    private categoryService: ContentCategoryService,
  ) {
    super();
  }

  @Query(() => ContentItemConnection)
  async contentItems(
    @Auth() user: User,
    @Args() args: ContentItemConnectionArgs,
  ) {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);

    return this.service.paginate({
      teamId: team.id,
      categoryId: args.categoryId ?? undefined,
      contentType: args.contentType,
      searchQuery: args.searchQuery ?? undefined,
      tags: args.tags,
      isActive: args.isActive,
      favoritesOnly: args.favoritesOnly,
      first: args.first,
      after: args.after ?? undefined,
    });
  }

  @Query(() => ContentItem, { nullable: true })
  async contentItem(
    @Auth() user: User,
    @Args() args: FindOneContentItemArgs,
  ): Promise<ContentItem | null> {
    try {
      const item = await this.service.findById(args.id);

      // Verify team access if team-specific
      if (item.teamId) {
        const team = await this.teamService.findById(item.teamId);
        await this.teamPolicy.can().read(user, team);
      }

      return item as ContentItem;
    } catch {
      return null;
    }
  }

  @Mutation(() => CreateContentItemPayload)
  async createContentItem(
    @Auth() user: User,
    @Args() args: CreateContentItemArgs,
  ): Promise<CreateContentItemPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.create(team.id, user.id, args.input);
  }

  @Mutation(() => UpdateContentItemPayload)
  async updateContentItem(
    @Auth() user: User,
    @Args() args: UpdateContentItemArgs,
  ): Promise<UpdateContentItemPayload> {
    const item = await this.service.findById(args.id);

    // Verify team access if team-specific
    if (item.teamId) {
      const team = await this.teamService.findById(item.teamId);
      await this.teamPolicy.can().read(user, team);
    }

    return this.service.update(args.id, user.id, args.input);
  }

  @Mutation(() => DeleteContentItemPayload)
  async deleteContentItem(
    @Auth() user: User,
    @Args() args: DeleteContentItemArgs,
  ): Promise<DeleteContentItemPayload> {
    const item = await this.service.findById(args.id);

    // Verify team access if team-specific
    if (item.teamId) {
      const team = await this.teamService.findById(item.teamId);
      await this.teamPolicy.can().read(user, team);
    }

    return this.service.delete(args.id, user.id);
  }

  @Mutation(() => UseContentItemPayload)
  async useContentItem(
    @Auth() user: User,
    @Args() args: UseContentItemArgs,
  ): Promise<UseContentItemPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.use(args.id, user.id, team.id, args.usedIn);
  }

  @Mutation(() => CreateContentItemPayload)
  async duplicateContentItem(
    @Auth() user: User,
    @Args() args: DuplicateContentItemArgs,
  ): Promise<CreateContentItemPayload> {
    const team = await this.teamService.findById(args.teamId);
    await this.teamPolicy.can().read(user, team);
    return this.service.duplicate(args.id, team.id, user.id);
  }

  @Mutation(() => UpdateContentItemPayload)
  async toggleContentItemFavorite(
    @Auth() user: User,
    @Args() args: ToggleFavoriteArgs,
  ): Promise<UpdateContentItemPayload> {
    const item = await this.service.findById(args.id);

    // Verify team access if team-specific
    if (item.teamId) {
      const team = await this.teamService.findById(item.teamId);
      await this.teamPolicy.can().read(user, team);
    }

    return this.service.toggleFavorite(args.id);
  }

  @ResolveField(() => ContentCategory, { nullable: true })
  async category(@Parent() item: ContentItem): Promise<ContentCategory | null> {
    if (!item.categoryId) return null;
    try {
      return await this.categoryService.findById(item.categoryId);
    } catch {
      return null;
    }
  }
}
