import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { JwtGuard } from "@/app/auth/guards/jwt.guard";
import { Auth } from "@/app/auth/decorators";
import { User } from "@/app/user/models/user.model";
import { RealEstateAdvancedService } from "../services/real-estate-advanced.service";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { leads } from "@/database/schema";

interface ImportPropertiesDto {
  teamId: string;
  propertyIds?: string[];
  searchCriteria?: any;
}

@Controller("api/properties")
@UseGuards(JwtGuard)
export class PropertyImportController {
  constructor(
    private realEstateService: RealEstateAdvancedService,
    @InjectDB() private db: DrizzleClient
  ) {}

  /**
   * Import properties as leads
   * POST /api/properties/import-to-leads
   */
  @Post("import-to-leads")
  async importToLeads(
    @Auth() user: User,
    @Body() dto: ImportPropertiesDto
  ) {
    try {
      let properties: any[] = [];

      // If property IDs provided, fetch those specific properties
      if (dto.propertyIds && dto.propertyIds.length > 0) {
        for (const id of dto.propertyIds) {
          const result = await this.realEstateService.getPropertyDetail(id);
          properties.push(result.data);
        }
      }
      // Otherwise search with criteria
      else if (dto.searchCriteria) {
        const result = await this.realEstateService.searchProperties({
          ...dto.searchCriteria,
          size: dto.searchCriteria.size || 50,
        });
        properties = result.data;
      }

      // Convert properties to leads
      const leadsToInsert = properties.map((property) => ({
        teamId: dto.teamId,
        firstName: property.ownerFirstName || "",
        lastName: property.ownerLastName || "",
        email: property.ownerEmail,
        phone: property.ownerPhone,
        company: property.address,
        city: property.city,
        state: property.state,
        zip: property.zip,
        address: property.address,
        propertyType: property.propertyType,
        estimatedValue: property.estimatedValue,
        equityPercent: property.equityPercent,
        yearsOwned: property.yearsOwned,
        source: "RealEstateAPI",
        status: "new",
        score: this.calculateLeadScore(property),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Insert leads into database
      const insertedLeads = await this.db
        .insert(leads)
        .values(leadsToInsert)
        .returning();

      return {
        success: true,
        imported: insertedLeads.length,
        leads: insertedLeads,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Legacy endpoint for backwards compatibility
   * POST /api/export-to-leads
   */
  @Post("/export-to-leads")
  async exportToLeads(
    @Auth() user: User,
    @Body() dto: ImportPropertiesDto
  ) {
    return this.importToLeads(user, dto);
  }

  /**
   * Calculate lead score based on property characteristics
   */
  private calculateLeadScore(property: any): number {
    let score = 50; // Base score

    // High equity is good
    if (property.equityPercent >= 50) score += 20;
    else if (property.equityPercent >= 30) score += 10;

    // Years owned (longer = more equity, better lead)
    if (property.yearsOwned >= 10) score += 15;
    else if (property.yearsOwned >= 5) score += 10;

    // Absentee owner (higher priority)
    if (property.absenteeOwner) score += 15;

    // Has contact info
    if (property.ownerEmail) score += 5;
    if (property.ownerPhone) score += 5;

    // Property value
    if (property.estimatedValue >= 500000) score += 10;
    else if (property.estimatedValue >= 250000) score += 5;

    return Math.min(100, Math.max(0, score));
  }
}
