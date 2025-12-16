/**
 * White Label Controller
 * REST endpoints for white-label configuration
 */
import { Controller, Get, Param, Query, Logger } from "@nestjs/common";
import { WhiteLabelService, WhiteLabelConfig } from "./white-label.service";

@Controller("white-labels")
export class WhiteLabelController {
  private readonly logger = new Logger(WhiteLabelController.name);

  constructor(private whiteLabelService: WhiteLabelService) {}

  /**
   * Get white-label config by slug (public endpoint for frontend)
   * Used during app initialization to load branding
   */
  @Get("config")
  async getConfigBySlug(
    @Query("slug") slug?: string,
    @Query("domain") domain?: string,
  ): Promise<WhiteLabelConfig | null> {
    if (domain) {
      return this.whiteLabelService.getByDomain(domain);
    }
    if (slug) {
      return this.whiteLabelService.getBySlug(slug);
    }
    // Default to Nextier
    return this.whiteLabelService.getBySlug("nextier");
  }

  /**
   * Get all active white-labels
   */
  @Get()
  async getAll(): Promise<WhiteLabelConfig[]> {
    return this.whiteLabelService.getAll();
  }

  /**
   * Get white-label by ID
   */
  @Get(":id")
  async getById(@Param("id") id: string): Promise<WhiteLabelConfig | null> {
    return this.whiteLabelService.getById(id);
  }
}
