import { Controller, Post, Body } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { eq, and, sql, or, ilike } from "drizzle-orm";
import { businesses } from "@/database/schema/business-owner.schema";

interface BusinessSearchRequest {
  businessType?: string;
  businessName?: string;
  ownerName?: string;
  state?: string;
  revenue?: {
    min?: number;
    max?: number;
  };
  employeeCount?: {
    min?: number;
    max?: number;
  };
  limit?: number;
  offset?: number;
}

interface BusinessSearchResult {
  id: string;
  businessName: string;
  businessAddress: string;
  ownerName: string;
  ownerType: string;
  ownershipPercentage?: number;
  revenue?: number;
  employeeCount?: number;
  phone?: string;
  email?: string;
  website?: string;
  sicCode?: string;
  sicDescription?: string;
}

@Controller("business")
export class BusinessSearchController {
  constructor(@InjectDB() private db: DrizzleClient) {}

  @Post("search")
  async searchBusinesses(
    @Body() searchRequest: BusinessSearchRequest,
  ): Promise<{
    results: BusinessSearchResult[];
    total: number;
  }> {
    const {
      businessType,
      businessName,
      ownerName,
      state,
      revenue,
      employeeCount,
      limit = 100,
      offset = 0,
    } = searchRequest;

    // Build where conditions
    const whereConditions: any[] = [];

    if (businessName) {
      whereConditions.push(
        sql`${businesses.name} ILIKE ${`%${businessName}%`}`,
      );
    }

    if (state) {
      whereConditions.push(sql`${businesses.state} ILIKE ${`%${state}%`}`);
    }

    // Filter by business type keywords
    if (businessType === "motel" || businessType === "hotel") {
      whereConditions.push(
        or(
          sql`${businesses.name} ILIKE ${"%motel%"}`,
          sql`${businesses.name} ILIKE ${"%hotel%"}`,
          sql`${businesses.name} ILIKE ${"%inn%"}`,
          sql`${businesses.name} ILIKE ${"%lodge%"}`,
        ),
      );
    } else if (businessType === "car_dealership" || businessType === "auto") {
      whereConditions.push(
        or(
          sql`${businesses.name} ILIKE ${"%auto%"}`,
          sql`${businesses.name} ILIKE ${"%car%"}`,
          sql`${businesses.name} ILIKE ${"%dealership%"}`,
          sql`${businesses.name} ILIKE ${"%motor%"}`,
        ),
      );
    } else if (businessType === "campground" || businessType === "rv_park") {
      whereConditions.push(
        or(
          sql`${businesses.name} ILIKE ${"%campground%"}`,
          sql`${businesses.name} ILIKE ${"%rv%"}`,
          sql`${businesses.name} ILIKE ${"%park%"}`,
          sql`${businesses.name} ILIKE ${"%resort%"}`,
        ),
      );
    }

    // Execute search
    const results = await this.db
      .select()
      .from(businesses)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(businesses)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const total = totalResult[0]?.count || 0;

    // Format results
    const formattedResults: BusinessSearchResult[] = results.map((row) => ({
      id: row.id,
      businessName: row.name,
      businessAddress:
        `${row.street || ""} ${row.city || ""} ${row.state || ""} ${row.zip || ""}`.trim(),
      ownerName: "Owner data pending", // TODO: Join with businessOwners table
      ownerType: "unknown",
      ownershipPercentage: undefined,
      revenue: row.annualRevenue || undefined,
      employeeCount: row.employeeCount || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
      website: row.website || undefined,
      sicCode: row.sicCode || undefined,
      sicDescription: row.sicDescription || undefined,
    }));

    return {
      results: formattedResults,
      total,
    };
  }
}
