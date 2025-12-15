import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import {
  ContentItemRepository,
  ContentItemFilter,
  PaginationOptions,
} from "../repositories/content-item.repository";
import {
  ContentItemInsert,
  ContentItemSelect,
} from "../models/content-item.model";
import {
  CreateContentItemInput,
  UpdateContentItemInput,
} from "../inputs/content-item.input";
import {
  ContentItemType,
  ContentUsedIn,
  ContentVisibility,
} from "@nextier/common";

@Injectable()
export class ContentItemService {
  constructor(private repository: ContentItemRepository) {}

  async findById(id: string): Promise<ContentItemSelect> {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundException("Content item not found");
    }
    return item;
  }

  async findMany(
    filter: ContentItemFilter,
    pagination?: PaginationOptions,
  ): Promise<ContentItemSelect[]> {
    return this.repository.findMany(filter, pagination);
  }

  async paginate(args: ContentItemFilter & PaginationOptions) {
    const { first, after, ...filter } = args;
    const items = await this.findMany(filter, {
      first: first ? first + 1 : undefined,
      after,
    });

    const hasNextPage = first ? items.length > first : false;
    const edges = hasNextPage ? items.slice(0, first) : items;

    return {
      edges: edges.map((node) => ({
        node,
        cursor: node.id,
      })),
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!after,
        startCursor: edges[0]?.id,
        endCursor: edges[edges.length - 1]?.id,
      },
    };
  }

  async create(
    teamId: string,
    userId: string,
    input: CreateContentItemInput,
  ): Promise<{ contentItem: ContentItemSelect }> {
    const value: ContentItemInsert = {
      teamId,
      createdById: userId,
      categoryId: input.categoryId,
      title: input.title,
      content: input.content,
      description: input.description,
      contentType: input.contentType ?? ContentItemType.PROMPT,
      tags: input.tags ?? [],
      variables: input.variables ?? [],
      visibility: input.visibility ?? ContentVisibility.TEAM,
      isActive: true,
      isFavorite: false,
      usageCount: 0,
    };

    const contentItem = await this.repository.create(value);
    return { contentItem };
  }

  async update(
    id: string,
    userId: string,
    input: UpdateContentItemInput,
  ): Promise<{ contentItem: ContentItemSelect }> {
    const existing = await this.findById(id);

    // Check if user can update this item
    // System items (null teamId) cannot be edited by regular users
    if (!existing.teamId) {
      throw new ForbiddenException("System content cannot be modified");
    }

    // Private items can only be edited by their creator
    if (
      existing.visibility === ContentVisibility.PRIVATE &&
      existing.createdById !== userId
    ) {
      throw new ForbiddenException(
        "You can only edit your own private content",
      );
    }

    const updateData: Partial<ContentItemInsert> = {};

    if (input.categoryId !== undefined)
      updateData.categoryId = input.categoryId;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.contentType !== undefined)
      updateData.contentType = input.contentType;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.variables !== undefined) updateData.variables = input.variables;
    if (input.visibility !== undefined)
      updateData.visibility = input.visibility;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.isFavorite !== undefined)
      updateData.isFavorite = input.isFavorite;

    const contentItem = await this.repository.update(id, updateData);
    return { contentItem };
  }

  async delete(
    id: string,
    userId: string,
  ): Promise<{ deletedContentItemId: string }> {
    const item = await this.findById(id);

    // System items cannot be deleted
    if (!item.teamId) {
      throw new ForbiddenException("System content cannot be deleted");
    }

    // Private items can only be deleted by their creator
    if (
      item.visibility === ContentVisibility.PRIVATE &&
      item.createdById !== userId
    ) {
      throw new ForbiddenException(
        "You can only delete your own private content",
      );
    }

    await this.repository.delete(id);
    return { deletedContentItemId: id };
  }

  async use(
    id: string,
    userId: string,
    teamId: string,
    usedIn: ContentUsedIn,
  ): Promise<{ success: boolean; newUsageCount: number }> {
    const item = await this.findById(id);

    // Increment usage count
    const updated = await this.repository.incrementUsageCount(id);

    // Log usage
    await this.repository.logUsage(id, userId, teamId, usedIn);

    return {
      success: true,
      newUsageCount: updated.usageCount ?? 0,
    };
  }

  async duplicate(
    id: string,
    teamId: string,
    userId: string,
  ): Promise<{ contentItem: ContentItemSelect }> {
    const original = await this.findById(id);

    const value: ContentItemInsert = {
      teamId,
      createdById: userId,
      categoryId: original.categoryId,
      title: `${original.title} (Copy)`,
      content: original.content,
      description: original.description,
      contentType: original.contentType,
      tags: original.tags ?? [],
      variables: original.variables ?? [],
      visibility: ContentVisibility.TEAM,
      isActive: true,
      isFavorite: false,
      usageCount: 0,
    };

    const contentItem = await this.repository.create(value);
    return { contentItem };
  }

  async toggleFavorite(
    id: string,
  ): Promise<{ contentItem: ContentItemSelect }> {
    const contentItem = await this.repository.toggleFavorite(id);
    return { contentItem };
  }
}
