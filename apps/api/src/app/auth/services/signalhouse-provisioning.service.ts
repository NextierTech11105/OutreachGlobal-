import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { tenants } from "@/database/schema/api-keys.schema";
import { eq } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════════════
// SIGNALHOUSE PROVISIONING SERVICE
// ═══════════════════════════════════════════════════════════════════════════
//
// This service manages SignalHouse SubGroup provisioning for multi-tenant
// isolation. Each Nextier tenant gets their own SignalHouse SubGroup.
//
// Architecture:
//   Nextier Tenant 1:1 SignalHouse SubGroup
//
// The master SignalHouse API key (company_admin) is used to create and manage
// SubGroups. All tenant-specific API calls include the subGroupId for isolation.
//
// ═══════════════════════════════════════════════════════════════════════════

interface SignalHouseSubGroup {
  subGroupId: string;
  name: string;
  description?: string;
  createdAt?: string;
}

interface SignalHouseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

@Injectable()
export class SignalHouseProvisioningService {
  private readonly logger = new Logger(SignalHouseProvisioningService.name);
  private readonly apiBase = "https://api.signalhouse.io/api/v1";
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient,
  ) {
    this.apiKey = this.configService.get("SIGNALHOUSE_API_KEY") || "";
  }

  /**
   * Check if SignalHouse is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Create a SignalHouse SubGroup for a new tenant
   *
   * This is called automatically when a tenant is created.
   * The SubGroup provides data isolation for all SignalHouse resources.
   */
  async createSubGroupForTenant(
    tenantId: string,
    tenantName: string,
    tenantSlug: string,
  ): Promise<{ success: boolean; subGroupId?: string; error?: string }> {
    if (!this.isConfigured()) {
      this.logger.warn("SignalHouse not configured, skipping SubGroup creation");
      return { success: false, error: "SignalHouse not configured" };
    }

    try {
      // Create the SubGroup in SignalHouse
      const response = await fetch(`${this.apiBase}/user/subGroup/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apiKey": this.apiKey,
        },
        body: JSON.stringify({
          name: `Nextier: ${tenantName}`,
          description: `Auto-provisioned for Nextier tenant ${tenantSlug} (${tenantId})`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error(
          `Failed to create SignalHouse SubGroup for tenant ${tenantId}: ${result.message || result.error}`,
        );
        return {
          success: false,
          error: result.message || result.error || "Failed to create SubGroup"
        };
      }

      // Extract subGroupId from response
      const subGroupId = result.subGroupId || result.data?.subGroupId || result.id;

      if (!subGroupId) {
        this.logger.error(`SignalHouse SubGroup created but no ID returned for tenant ${tenantId}`);
        return { success: false, error: "No SubGroup ID returned" };
      }

      // Update the tenant record with the SignalHouse SubGroup ID
      await this.db
        .update(tenants)
        .set({ signalhouseSubGroupId: subGroupId })
        .where(eq(tenants.id, tenantId));

      this.logger.log(
        `Created SignalHouse SubGroup ${subGroupId} for tenant ${tenantId} (${tenantSlug})`,
      );

      return { success: true, subGroupId };
    } catch (error) {
      this.logger.error(
        `Error creating SignalHouse SubGroup for tenant ${tenantId}: ${error}`,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get all SubGroups (for debugging/admin)
   */
  async listSubGroups(): Promise<SignalHouseResponse<SignalHouseSubGroup[]>> {
    if (!this.isConfigured()) {
      return { success: false, error: "SignalHouse not configured" };
    }

    try {
      const response = await fetch(`${this.apiBase}/user/subGroup/get`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apiKey": this.apiKey,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || result.error || "Failed to list SubGroups"
        };
      }

      return { success: true, data: result.data || result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get SubGroup details
   */
  async getSubGroup(subGroupId: string): Promise<SignalHouseResponse<SignalHouseSubGroup>> {
    if (!this.isConfigured()) {
      return { success: false, error: "SignalHouse not configured" };
    }

    try {
      const response = await fetch(
        `${this.apiBase}/user/subGroup/Details/${subGroupId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apiKey": this.apiKey,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || result.error || "Failed to get SubGroup"
        };
      }

      return { success: true, data: result.data || result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Delete a SubGroup (use with caution - for tenant deletion)
   */
  async deleteSubGroup(subGroupId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "SignalHouse not configured" };
    }

    try {
      const response = await fetch(`${this.apiBase}/user/subGroup/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "apiKey": this.apiKey,
        },
        body: JSON.stringify({ subGroupId }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || result.error || "Failed to delete SubGroup"
        };
      }

      this.logger.log(`Deleted SignalHouse SubGroup ${subGroupId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Verify SignalHouse connection and API key
   */
  async verifyConnection(): Promise<{
    success: boolean;
    user?: { userId: string; email: string; companyName?: string };
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { success: false, error: "SignalHouse not configured" };
    }

    try {
      const response = await fetch(`${this.apiBase}/user/info`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apiKey": this.apiKey,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || result.error || "Connection failed"
        };
      }

      return {
        success: true,
        user: {
          userId: result.userId || result.data?.userId,
          email: result.email || result.data?.email || result.emailId,
          companyName: result.companyName || result.data?.companyName,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed"
      };
    }
  }
}
