/**
 * SIC MAPPER SERVICE
 * ==================
 * Auto-maps SIC codes to targeting categories on upload.
 * Supports USBizData, Apollo, and manual CSV imports.
 */
import { Injectable, Logger } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, sql, and } from "drizzle-orm";
import {
  targetingCategoriesTable,
  industryCodesTable,
} from "@/database/schema-alias";
import {
  SIC_CATEGORY_MAPPINGS,
  mapSicToCategory,
  mapSicCodesToCategories,
  getSicCategorySummary,
  SicCategoryMapping,
} from "@/database/seeds/sic-category-mappings";

export interface SicCodeInput {
  code: string;
  description?: string;
  count: number;
}

export interface SicUploadResult {
  success: boolean;
  categoriesCreated: number;
  codesProcessed: number;
  summary: Array<{
    slug: string;
    name: string;
    totalCodes: number;
    totalRecords: number;
    priorityTier: string;
    valueTier: string;
    dollarPerMinute: number;
  }>;
}

@Injectable()
export class SicMapperService {
  private readonly logger = new Logger(SicMapperService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Process SIC codes and auto-map to categories
   * Creates categories if they don't exist, upserts codes with counts
   */
  async processSicCodes(
    teamId: string,
    codes: SicCodeInput[],
  ): Promise<SicUploadResult> {
    this.logger.log(`Processing ${codes.length} SIC codes for team ${teamId}`);

    // 1. Group codes by category
    const grouped = mapSicCodesToCategories(codes);

    // 2. Ensure categories exist
    let categoriesCreated = 0;
    const categoryIdMap = new Map<string, string>();

    for (const [slug, data] of grouped) {
      const [existingCategory] = await this.db
        .select()
        .from(targetingCategoriesTable)
        .where(
          and(
            eq(targetingCategoriesTable.slug, slug),
            eq(targetingCategoriesTable.teamId, teamId),
          ),
        )
        .limit(1);

      if (existingCategory) {
        categoryIdMap.set(slug, existingCategory.id);
      } else {
        // Create category
        const [newCategory] = await this.db
          .insert(targetingCategoriesTable)
          .values({
            teamId,
            name: data.category.name,
            slug: data.category.slug,
            classificationSystem: "sic",
            priorityTier: data.category.priorityTier,
            valueTier: data.category.valueTier,
            avgDealValue: data.category.avgDealValue,
            avgConversionRate: data.category.avgConversionRate,
            dollarPerMinute: data.category.dollarPerMinute,
            propertyOwnershipLikelihood: data.category.propertyOwnershipLikelihood,
            isActive: true,
            isGlobal: false,
          })
          .returning();

        categoryIdMap.set(slug, newCategory.id);
        categoriesCreated++;
        this.logger.log(`Created category: ${data.category.name}`);
      }
    }

    // 3. Upsert industry codes with counts
    let codesProcessed = 0;

    for (const [slug, data] of grouped) {
      const categoryId = categoryIdMap.get(slug);
      if (!categoryId) continue;

      for (const codeItem of data.codes) {
        await this.db
          .insert(industryCodesTable)
          .values({
            categoryId,
            system: "sic",
            code: codeItem.code,
            description: codeItem.description || `SIC ${codeItem.code}`,
            totalCount: codeItem.count,
            qualifiedCount: codeItem.count,
            countLastUpdated: new Date(),
            isActive: true,
            priority: Math.round(data.category.dollarPerMinute * 10),
          })
          .onConflictDoUpdate({
            target: [industryCodesTable.system, industryCodesTable.code],
            set: {
              categoryId,
              totalCount: sql`${industryCodesTable.totalCount} + ${codeItem.count}`,
              countLastUpdated: new Date(),
            },
          });

        codesProcessed++;
      }
    }

    // 4. Generate summary
    const summary = getSicCategorySummary(grouped);

    this.logger.log(
      `Processed ${codesProcessed} codes into ${grouped.size} categories (${categoriesCreated} new)`,
    );

    return {
      success: true,
      categoriesCreated,
      codesProcessed,
      summary,
    };
  }

  /**
   * Parse USBizData SIC list format
   * Input: "8721 - Accounting, Auditing, and Bookkeeping Services - 156,789"
   */
  parseSicListText(text: string): SicCodeInput[] {
    const lines = text.split("\n").filter((l) => l.trim());
    const codes: SicCodeInput[] = [];

    for (const line of lines) {
      // Pattern: "CODE - Description - COUNT" or "CODE\tDescription\tCOUNT"
      const match = line.match(/^(\d{4})\s*[-\t]\s*(.+?)\s*[-\t]\s*([\d,]+)$/);
      if (match) {
        codes.push({
          code: match[1],
          description: match[2].trim(),
          count: parseInt(match[3].replace(/,/g, ""), 10),
        });
      } else {
        // Try simpler format: "CODE - COUNT"
        const simpleMatch = line.match(/^(\d{4})\s*[-\t]\s*([\d,]+)$/);
        if (simpleMatch) {
          codes.push({
            code: simpleMatch[1],
            description: `SIC ${simpleMatch[1]}`,
            count: parseInt(simpleMatch[2].replace(/,/g, ""), 10),
          });
        }
      }
    }

    return codes;
  }

  /**
   * Get category for a single SIC code
   */
  getCategoryForCode(sicCode: string): SicCategoryMapping | null {
    return mapSicToCategory(sicCode);
  }

  /**
   * Get all predefined category mappings
   */
  getAllCategoryMappings(): SicCategoryMapping[] {
    return SIC_CATEGORY_MAPPINGS;
  }

  /**
   * Get category stats for a team
   */
  async getCategoryStats(teamId: string) {
    const categories = await this.db
      .select()
      .from(targetingCategoriesTable)
      .where(eq(targetingCategoriesTable.teamId, teamId));

    const stats: Array<{
      id: string;
      name: string;
      slug: string;
      priorityTier: string | null;
      valueTier: string | null;
      dollarPerMinute: number | null;
      propertyOwnershipLikelihood: number | null;
      totalCodes: number;
      totalRecords: number;
    }> = [];

    for (const cat of categories) {
      const codes = await this.db
        .select()
        .from(industryCodesTable)
        .where(eq(industryCodesTable.categoryId, cat.id));

      const totalRecords = codes.reduce((sum, c) => sum + (c.totalCount || 0), 0);

      stats.push({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        priorityTier: cat.priorityTier,
        valueTier: cat.valueTier,
        dollarPerMinute: cat.dollarPerMinute,
        propertyOwnershipLikelihood: cat.propertyOwnershipLikelihood,
        totalCodes: codes.length,
        totalRecords,
      });
    }

    return stats.sort((a, b) => (b.dollarPerMinute || 0) - (a.dollarPerMinute || 0));
  }
}
