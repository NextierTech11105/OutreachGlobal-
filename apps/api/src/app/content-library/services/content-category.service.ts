import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  ContentCategoryRepository,
  ContentCategoryFilter,
} from "../repositories/content-category.repository";
import {
  ContentCategoryInsert,
  ContentCategorySelect,
} from "../models/content-category.model";
import {
  CreateContentCategoryInput,
  UpdateContentCategoryInput,
} from "../inputs/content-category.input";

@Injectable()
export class ContentCategoryService {
  constructor(private repository: ContentCategoryRepository) {}

  async findById(id: string): Promise<ContentCategorySelect> {
    const category = await this.repository.findById(id);
    if (!category) {
      throw new NotFoundException("Content category not found");
    }
    return category;
  }

  async findMany(
    filter: ContentCategoryFilter,
  ): Promise<ContentCategorySelect[]> {
    return this.repository.findMany(filter);
  }

  async findBySlug(
    slug: string,
    teamId?: string | null,
  ): Promise<ContentCategorySelect | undefined> {
    return this.repository.findBySlug(slug, teamId);
  }

  async create(
    teamId: string,
    input: CreateContentCategoryInput,
  ): Promise<{ category: ContentCategorySelect }> {
    // Check for duplicate slug in this team
    const existing = await this.repository.findBySlug(input.slug, teamId);
    if (existing) {
      throw new BadRequestException("A category with this slug already exists");
    }

    const value: ContentCategoryInsert = {
      teamId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      icon: input.icon,
      color: input.color,
      parentId: input.parentId,
      sortOrder: input.sortOrder ?? 0,
      isSystem: false,
    };

    const category = await this.repository.create(value);
    return { category };
  }

  async update(
    id: string,
    input: UpdateContentCategoryInput,
  ): Promise<{ category: ContentCategorySelect }> {
    const existing = await this.findById(id);

    // System categories can have limited updates
    if (existing.isSystem) {
      // Only allow updating sortOrder and description for system categories
      const allowedUpdates: Partial<ContentCategoryInsert> = {};
      if (input.sortOrder !== undefined)
        allowedUpdates.sortOrder = input.sortOrder;
      if (input.description !== undefined)
        allowedUpdates.description = input.description;

      if (Object.keys(allowedUpdates).length === 0) {
        throw new BadRequestException(
          "System categories can only update sortOrder and description",
        );
      }

      const category = await this.repository.update(id, allowedUpdates);
      return { category };
    }

    // Check for duplicate slug if updating
    if (input.slug && input.slug !== existing.slug) {
      const duplicate = await this.repository.findBySlug(
        input.slug,
        existing.teamId,
      );
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          "A category with this slug already exists",
        );
      }
    }

    const category = await this.repository.update(id, input);
    return { category };
  }

  async delete(id: string): Promise<{ deletedCategoryId: string }> {
    const category = await this.findById(id);

    if (category.isSystem) {
      throw new BadRequestException("System categories cannot be deleted");
    }

    // Check if category has children
    const children = await this.repository.getChildren(id);
    if (children.length > 0) {
      throw new BadRequestException(
        "Cannot delete category with children. Delete or move children first.",
      );
    }

    await this.repository.delete(id);
    return { deletedCategoryId: id };
  }

  async getItemCount(categoryId: string): Promise<number> {
    return this.repository.getItemCount(categoryId);
  }

  async getChildren(parentId: string): Promise<ContentCategorySelect[]> {
    return this.repository.getChildren(parentId);
  }

  async getCategoryTree(teamId?: string): Promise<ContentCategorySelect[]> {
    // Get all root categories (no parent)
    const rootCategories = await this.repository.findMany({
      teamId,
      parentId: null,
      includeSystem: true,
    });

    // For each root, get children recursively
    const result: ContentCategorySelect[] = [];
    for (const category of rootCategories) {
      const withChildren = await this.populateChildren(category);
      result.push(withChildren);
    }

    return result;
  }

  private async populateChildren(
    category: ContentCategorySelect,
  ): Promise<ContentCategorySelect & { children?: ContentCategorySelect[] }> {
    const children = await this.repository.getChildren(category.id);

    if (children.length === 0) {
      return { ...category, children: [] };
    }

    const populatedChildren = await Promise.all(
      children.map((child) => this.populateChildren(child)),
    );

    return { ...category, children: populatedChildren };
  }
}
