import { Auth, UseAuthGuard } from "@/app/auth/decorators";
import { BadRequestException, Body, Controller, Param, Post } from "@nestjs/common";
import { RealEstateService } from "../services/real-estate.service";
import { SpacesStorageService } from "../services/spaces-storage.service";
import { ApolloEnrichmentService } from "../services/apollo-enrichment.service";
import { BaseController } from "@/app/base.controller";
import { TeamService } from "@/app/team/services/team.service";
import { TeamPolicy } from "@/app/team/policies/team.policy";
import { User } from "@/app/user/models/user.model";
import { z } from "@nextier/dto";

@Controller("rest/:teamId/realestate-api")
// @UseAuthGuard() // DISABLED FOR TESTING
export class RealEstateAPIController extends BaseController {
  constructor(
    private realEstateService: RealEstateService,
    private spacesStorageService: SpacesStorageService,
    private apolloEnrichmentService: ApolloEnrichmentService,
    private teamService: TeamService,
    private teamPolicy: TeamPolicy,
  ) {
    super();
  }

  /**
   * PROPERTY SEARCH - Main search endpoint
   */
  @Post("property-search")
  async propertySearch(@Param("teamId") teamId: string) {
    // BYPASS AUTH FOR TESTING
    // const team = await this.teamService.findById(teamId);
    // await this.teamPolicy.can().read(user, team);

    const input = this.validate(
      z.object({
        // Geographic
        state: z.optional(z.string()),
        city: z.optional(z.string()),
        county: z.optional(z.string()),
        zipCode: z.optional(z.string()),

        // Property Type & Use
        propertyType: z.optional(z.string()),
        propertyUseCode: z.optional(z.array(z.number())),  // Commercial codes

        // Building & Lot
        buildingSizeMin: z.optional(z.number()),
        buildingSizeMax: z.optional(z.number()),
        lotSizeMin: z.optional(z.number()),
        lotSizeMax: z.optional(z.number()),
        zoning: z.optional(z.string()),
        landUse: z.optional(z.string()),

        // Value
        valueMin: z.optional(z.number()),
        valueMax: z.optional(z.number()),

        // Equity
        equityPercentMin: z.optional(z.number()),
        equityPercentMax: z.optional(z.number()),
        highEquity: z.optional(z.boolean()),
        freeClear: z.optional(z.boolean()),

        // Portfolio (Investors)
        propertiesOwnedMin: z.optional(z.number()),
        propertiesOwnedMax: z.optional(z.number()),
        portfolioValueMin: z.optional(z.number()),

        // Active Buyer
        portfolioPurchasedLast12Min: z.optional(z.number()),

        // Distress
        preForeclosure: z.optional(z.boolean()),
        foreclosure: z.optional(z.boolean()),
        vacant: z.optional(z.boolean()),
        lisPendens: z.optional(z.boolean()),
        auction: z.optional(z.boolean()),
        soldLast12Months: z.optional(z.boolean()),

        // Owner
        absenteeOwner: z.optional(z.boolean()),
        outOfStateOwner: z.optional(z.boolean()),
        corporateOwned: z.optional(z.boolean()),
        ownerOccupied: z.optional(z.boolean()),
        owned5YearsPlus: z.optional(z.boolean()),

        // Characteristics
        bedsMin: z.optional(z.number()),
        bedsMax: z.optional(z.number()),
        bathsMin: z.optional(z.number()),
        bathsMax: z.optional(z.number()),
        unitsMin: z.optional(z.number()),
        unitsMax: z.optional(z.number()),
        yearBuiltMin: z.optional(z.number()),
        yearBuiltMax: z.optional(z.number()),

        // Sort Parameters
        sortBy: z.optional(z.string()),
        sortDirection: z.optional(z.enum(["asc", "desc"])),

        // Limit
        size: z.optional(z.number()).default(50),
      }),
    );

    return await this.realEstateService.propertySearch(input);
  }

  /**
   * PROPERTY COUNT - Get total count for query (used before saving searches)
   */
  @Post("property-count")
  async propertyCount(@Param("teamId") teamId: string) {
    const input = this.validate(
      z.object({
        // Geographic
        state: z.optional(z.string()),
        city: z.optional(z.string()),
        county: z.optional(z.string()),
        zipCode: z.optional(z.string()),
        neighborhood: z.optional(z.string()),

        // Property Type
        propertyType: z.optional(z.string()),
        propertyCode: z.optional(z.string()),

        // Filters (for count estimation)
        filters: z.optional(z.object({
          absenteeOwner: z.optional(z.boolean()),
          vacant: z.optional(z.boolean()),
          preForeclosure: z.optional(z.boolean()),
          lisPendens: z.optional(z.boolean()),
          minValue: z.optional(z.number()),
          maxValue: z.optional(z.number()),
        })),
      }),
    );

    return await this.realEstateService.propertyCount(input);
  }

  /**
   * PROPERTY DETAIL - Get full details for a property
   */
  @Post("property-detail/:propertyId")
  async propertyDetail(
    @Auth() user: User,
    @Param("teamId") teamId: string,
    @Param("propertyId") propertyId: string,
  ) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().read(user, team);

    return await this.realEstateService.propertyDetail(propertyId);
  }

  /**
   * SKIP TRACE - Get owner contact data
   */
  @Post("skip-trace")
  async skipTrace(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().read(user, team);

    const input = this.validate(
      z.object({
        propertyId: z.string(),
      }),
    );

    return await this.realEstateService.skipTrace(input.propertyId);
  }

  /**
   * CREATE SAVED SEARCH - Automate daily property tracking
   */
  @Post("saved-search/create")
  async createSavedSearch(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        searchName: z.string(),
        searchQuery: z.record(z.string(), z.any()),
      }),
    );

    return await this.realEstateService.createSavedSearch(
      teamId,
      input.searchName,
      input.searchQuery,
    );
  }

  /**
   * LIST SAVED SEARCHES
   */
  @Post("saved-search/list")
  async listSavedSearches(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().read(user, team);

    return await this.realEstateService.listSavedSearches(teamId);
  }

  /**
   * DELETE SAVED SEARCH
   */
  @Post("saved-search/delete")
  async deleteSavedSearch(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        searchId: z.string(),
      }),
    );

    return await this.realEstateService.deleteSavedSearch(input.searchId);
  }

  /**
   * IMPORT TO CAMPAIGN - Create leads and launch campaign
   */
  @Post("import-to-campaign")
  async importToCampaign(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        propertyIds: z.array(z.string()),
        campaignName: z.string(),
        messageTemplateId: z.optional(z.string()),
      }),
    );

    // 1. Get property details + skip trace
    // 2. Create leads in Nextier
    // 3. Create campaign
    // 4. Execute via Twilio Studio + SignalHouse.io

    return await this.realEstateService.importToCampaign(
      teamId,
      input.propertyIds,
      input.campaignName,
      input.messageTemplateId,
    );
  }

  @Post("automation/run-daily")
  async runDailyAutomation(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        savedSearchIds: z.array(z.string()),
      }),
    );

    // Process saved searches (max 2k/day)
    return await this.realEstateService.runDailyAutomation(
      teamId,
      input.savedSearchIds,
    );
  }

  @Post("automation/monitor-events")
  async monitorPropertyEvents(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        propertyIds: z.array(z.string()),
      }),
    );

    return await this.realEstateService.monitorPropertyEvents(input.propertyIds);
  }

  /**
   * UPLOAD TO SPACES - Export property data to CSV in DigitalOcean Spaces
   */
  @Post("export/csv-to-spaces")
  async exportToSpaces(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        savedSearchId: z.string(),
        searchName: z.string(),
        properties: z.array(z.any()),
      }),
    );

    const result = await this.spacesStorageService.uploadPropertyCSV(
      input.savedSearchId,
      input.properties,
      input.searchName,
    );

    return {
      success: true,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      recordCount: result.recordCount,
    };
  }

  /**
   * APOLLO BUSINESS ENRICHMENT - Cross-enrich business properties
   */
  @Post("enrich/apollo-business")
  async enrichBusinessProperty(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        propertyData: z.any(),
      }),
    );

    const enriched = await this.apolloEnrichmentService.enrichBusinessProperty(
      input.propertyData,
    );

    return enriched;
  }

  /**
   * APOLLO BATCH ENRICHMENT - Enrich multiple business properties
   */
  @Post("enrich/apollo-business-batch")
  async enrichBusinessBatch(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        properties: z.array(z.any()),
      }),
    );

    const enrichedBatch = await this.apolloEnrichmentService.enrichBusinessBatch(
      input.properties,
    );

    return {
      total: enrichedBatch.length,
      successful: enrichedBatch.filter((p) => p.enrichmentStatus === "success").length,
      partial: enrichedBatch.filter((p) => p.enrichmentStatus === "partial").length,
      failed: enrichedBatch.filter((p) => p.enrichmentStatus === "failed").length,
      results: enrichedBatch,
    };
  }

  /**
   * FILTER BLUE COLLAR BUSINESSES
   */
  @Post("enrich/filter-blue-collar")
  async filterBlueCollar(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        enrichedProperties: z.array(z.any()),
      }),
    );

    const blueCollarProperties =
      await this.apolloEnrichmentService.filterBlueCollarBusinesses(
        input.enrichedProperties,
      );

    return {
      total: input.enrichedProperties.length,
      blueCollarCount: blueCollarProperties.length,
      results: blueCollarProperties,
    };
  }

  /**
   * GET BUSINESS CONTACTS - Get decision makers from Apollo
   */
  @Post("enrich/get-business-contacts")
  async getBusinessContacts(@Auth() user: User, @Param("teamId") teamId: string) {
    const team = await this.teamService.findById(teamId);
    await this.teamPolicy.can().manage(user, team);

    const input = this.validate(
      z.object({
        organizationId: z.string(),
        jobTitles: z.optional(z.array(z.string())),
      }),
    );

    const contacts = await this.apolloEnrichmentService.getBusinessContacts(
      input.organizationId,
      input.jobTitles,
    );

    return {
      organizationId: input.organizationId,
      contactsFound: contacts.length,
      contacts,
    };
  }

}
