/**
 * SIC MAPPER SERVICE
 * ==================
 * Groups SIC codes into labeled categories on upload.
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
    propertyOwnershipLikelihood: number;
  }>;
}

@Injectable()
export class SicMapperService {
  private readonly logger = new Logger(SicMapperService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Process SIC codes and group into categories
   */
  async processSicCodes(
    teamId: string,
    codes: SicCodeInput[],
  ): Promise<SicUploadResult> {
    this.logger.log(`Processing ${codes.length} SIC codes for team ${teamId}`);

    const grouped = mapSicCodesToCategories(codes);

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
        const [newCategory] = await this.db
          .insert(targetingCategoriesTable)
          .values({
            teamId,
            name: data.category.name,
            slug: data.category.slug,
            classificationSystem: "sic",
            isActive: true,
            isGlobal: false,
          })
          .returning();

        categoryIdMap.set(slug, newCategory.id);
        categoriesCreated++;
      }
    }

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

    const summary = getSicCategorySummary(grouped);

    return {
      success: true,
      categoriesCreated,
      codesProcessed,
      summary,
    };
  }

  /**
   * Parse SIC list text (e.g. "8721 - Accounting - 156,789")
   */
  parseSicListText(text: string): SicCodeInput[] {
    const lines = text.split("\n").filter((l) => l.trim());
    const codes: SicCodeInput[] = [];

    for (const line of lines) {
      const match = line.match(/^(\d{4})\s*[-\t]\s*(.+?)\s*[-\t]\s*([\d,]+)$/);
      if (match) {
        codes.push({
          code: match[1],
          description: match[2].trim(),
          count: parseInt(match[3].replace(/,/g, ""), 10),
        });
      } else {
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

  getCategoryForCode(sicCode: string): SicCategoryMapping | null {
    return mapSicToCategory(sicCode);
  }

  getAllCategoryMappings(): SicCategoryMapping[] {
    return SIC_CATEGORY_MAPPINGS;
  }
}
