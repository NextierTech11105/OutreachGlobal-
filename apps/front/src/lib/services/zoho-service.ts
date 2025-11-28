// Zoho CRM Service

export interface ZohoAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
  accessToken?: string;
  tokenExpiry?: number;
}

export interface ZohoRecord {
  id: string;
  module: string;
  data: Record<string, any>;
  createdTime?: string;
  modifiedTime?: string;
}

export interface ZohoFieldMapping {
  sourceField: string;
  targetField: string;
  direction: "both" | "to_zoho" | "from_zoho";
  transform?: (value: any) => any;
}

export interface ZohoSyncConfig {
  modules: {
    [key: string]: {
      localEntity: string;
      fieldMappings: ZohoFieldMapping[];
      identifierField: string;
      syncDirection: "both" | "to_zoho" | "from_zoho";
      syncFrequency: "realtime" | "hourly" | "daily" | "weekly";
    };
  };
}

export interface ZohoSyncResult {
  module: string;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ record: any; error: string }>;
}

class ZohoService {
  private authConfig: ZohoAuthConfig | null = null;
  private syncConfig: ZohoSyncConfig | null = null;
  private baseUrl = "https://www.zohoapis.com/crm/v3";

  constructor() {
    // Initialize with empty configs
  }

  /**
   * Configure the Zoho service with authentication details
   */
  configure(authConfig: ZohoAuthConfig, syncConfig: ZohoSyncConfig) {
    this.authConfig = authConfig;
    this.syncConfig = syncConfig;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    if (!this.authConfig) {
      throw new Error("Zoho service not configured");
    }

    // Check if we have a valid token
    if (
      this.authConfig.accessToken &&
      this.authConfig.tokenExpiry &&
      this.authConfig.tokenExpiry > Date.now()
    ) {
      return this.authConfig.accessToken;
    }

    // Need to refresh the token
    if (!this.authConfig.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          refresh_token: this.authConfig.refreshToken,
          client_id: this.authConfig.clientId,
          client_secret: this.authConfig.clientSecret,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const data = await response.json();

      // Update the auth config
      this.authConfig.accessToken = data.access_token;
      this.authConfig.tokenExpiry = Date.now() + data.expires_in * 1000;

      return data.access_token;
    } catch (error) {
      console.error("Error refreshing Zoho token:", error);
      throw error;
    }
  }

  /**
   * Make an authenticated request to the Zoho API
   */
  async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    data?: any,
  ): Promise<T> {
    const accessToken = await this.getAccessToken();

    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zoho API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in Zoho API request to ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Search for records in a module
   */
  async searchRecords(
    module: string,
    criteria: string,
    page = 1,
    perPage = 100,
  ): Promise<ZohoRecord[]> {
    try {
      const response = await this.request<any>(
        `/${module}/search?criteria=${encodeURIComponent(criteria)}&page=${page}&per_page=${perPage}`,
      );

      return response.data.map((record: any) => ({
        id: record.id,
        module,
        data: record,
        createdTime: record.Created_Time,
        modifiedTime: record.Modified_Time,
      }));
    } catch (error) {
      console.error(`Error searching ${module} records:`, error);
      throw error;
    }
  }

  /**
   * Get a record by ID
   */
  async getRecord(module: string, id: string): Promise<ZohoRecord | null> {
    try {
      const response = await this.request<any>(`/${module}/${id}`);

      if (!response.data || response.data.length === 0) {
        return null;
      }

      const record = response.data[0];
      return {
        id: record.id,
        module,
        data: record,
        createdTime: record.Created_Time,
        modifiedTime: record.Modified_Time,
      };
    } catch (error) {
      console.error(`Error getting ${module} record ${id}:`, error);
      // If 404, return null instead of throwing
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new record
   */
  async createRecord(
    module: string,
    data: Record<string, any>,
  ): Promise<string> {
    try {
      const response = await this.request<any>(`/${module}`, "POST", {
        data: [data],
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No data returned from create operation");
      }

      return response.data[0].details.id;
    } catch (error) {
      console.error(`Error creating ${module} record:`, error);
      throw error;
    }
  }

  /**
   * Update an existing record
   */
  async updateRecord(
    module: string,
    id: string,
    data: Record<string, any>,
  ): Promise<boolean> {
    try {
      const response = await this.request<any>(`/${module}/${id}`, "PUT", {
        data: [data],
      });

      return (
        response.data &&
        response.data.length > 0 &&
        response.data[0].status === "success"
      );
    } catch (error) {
      console.error(`Error updating ${module} record ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record
   */
  async deleteRecord(module: string, id: string): Promise<boolean> {
    try {
      const response = await this.request<any>(`/${module}/${id}`, "DELETE");

      return (
        response.data &&
        response.data.length > 0 &&
        response.data[0].status === "success"
      );
    } catch (error) {
      console.error(`Error deleting ${module} record ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all modules (entities) in the Zoho CRM
   */
  async getModules(): Promise<string[]> {
    try {
      const response = await this.request<any>("/settings/modules");

      return response.modules
        .filter((module: any) => module.api_supported)
        .map((module: any) => module.api_name);
    } catch (error) {
      console.error("Error getting modules:", error);
      throw error;
    }
  }

  /**
   * Get fields for a specific module
   */
  async getFields(module: string): Promise<any[]> {
    try {
      const response = await this.request<any>(
        `/settings/fields?module=${module}`,
      );

      return response.fields;
    } catch (error) {
      console.error(`Error getting fields for ${module}:`, error);
      throw error;
    }
  }

  /**
   * Sync records from local database to Zoho
   */
  async syncToZoho(
    module: string,
    records: Record<string, any>[],
    fieldMappings: ZohoFieldMapping[],
  ): Promise<ZohoSyncResult> {
    if (!this.syncConfig) {
      throw new Error("Sync configuration not set");
    }

    const moduleConfig = this.syncConfig.modules[module];
    if (!moduleConfig) {
      throw new Error(`No sync configuration for module ${module}`);
    }

    const result: ZohoSyncResult = {
      module,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (const record of records) {
      try {
        // Transform the record according to field mappings
        const zohoRecord: Record<string, any> = {};

        for (const mapping of fieldMappings) {
          if (mapping.direction === "both" || mapping.direction === "to_zoho") {
            const value = record[mapping.sourceField];
            zohoRecord[mapping.targetField] = mapping.transform
              ? mapping.transform(value)
              : value;
          }
        }

        // Check if record exists in Zoho
        const identifierValue = record[moduleConfig.identifierField];
        const searchCriteria = `(${moduleConfig.identifierField}:equals:${identifierValue})`;
        const existingRecords = await this.searchRecords(
          module,
          searchCriteria,
        );

        if (existingRecords.length > 0) {
          // Update existing record
          const zohoId = existingRecords[0].id;
          await this.updateRecord(module, zohoId, zohoRecord);
          result.updated++;
        } else {
          // Create new record
          await this.createRecord(module, zohoRecord);
          result.created++;
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          record,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Sync records from Zoho to local database
   */
  async syncFromZoho(
    module: string,
    lastSyncTime: string,
    fieldMappings: ZohoFieldMapping[],
  ): Promise<ZohoRecord[]> {
    // Get records modified since last sync
    const criteria = `(Modified_Time:greater_than:${lastSyncTime})`;
    const records = await this.searchRecords(module, criteria, 1, 200);

    return records;
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(scope: string[] = ["ZohoCRM.modules.ALL"]): string {
    if (!this.authConfig) {
      throw new Error("Zoho service not configured");
    }

    const params = new URLSearchParams({
      client_id: this.authConfig.clientId,
      redirect_uri: this.authConfig.redirectUri,
      scope: scope.join(","),
      response_type: "code",
      access_type: "offline",
    });

    return `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<ZohoAuthConfig> {
    if (!this.authConfig) {
      throw new Error("Zoho service not configured");
    }

    try {
      const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: this.authConfig.clientId,
          client_secret: this.authConfig.clientSecret,
          redirect_uri: this.authConfig.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to exchange code: ${response.statusText}`);
      }

      const data = await response.json();

      // Update the auth config
      this.authConfig.accessToken = data.access_token;
      this.authConfig.refreshToken = data.refresh_token;
      this.authConfig.tokenExpiry = Date.now() + data.expires_in * 1000;

      return this.authConfig;
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      throw error;
    }
  }

  /**
   * Test the connection to Zoho
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getModules();
      return true;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }
}

export const zohoService = new ZohoService();
