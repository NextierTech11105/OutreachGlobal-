import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface PropertyHuntSearchOptions {
  state?: string;
  city?: string;
  zipCode?: string;
  minValue?: number;
  maxValue?: number;
  propertyType?: string;
  limit?: number;
}

export interface PropertyHuntResult {
  properties: Array<{
    address: string;
    city: string;
    state: string;
    zipCode: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    ownerEmail?: string;
    ownerPhone?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    yearBuilt?: number;
    estimatedValue?: number;
    lastSaleDate?: string;
    lastSalePrice?: number;
  }>;
  total: number;
}

@Injectable()
export class PropertyHuntService {
  private http: AxiosInstance;
  private apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiUrl =
      (this.configService.get("PROPERTY_HUNT_API_URL") as string) ||
      "https://property-hunt-api-yahrg.ondigitalocean.app";

    this.http = axios.create({
      baseURL: this.apiUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async searchProperties(options: PropertyHuntSearchOptions): Promise<PropertyHuntResult> {
    try {
      const { data } = await this.http.post("/api/search", {
        state: options.state,
        city: options.city,
        zipCode: options.zipCode,
        minValue: options.minValue,
        maxValue: options.maxValue,
        propertyType: options.propertyType,
        limit: options.limit || 50,
      });

      return data;
    } catch (error: any) {
      console.error("Property Hunt Search Error:", error.response?.data || error.message);
      throw error;
    }
  }

  async getPropertyDetails(propertyId: string) {
    try {
      const { data } = await this.http.get(`/api/properties/${propertyId}`);
      return data;
    } catch (error: any) {
      console.error("Property Hunt Details Error:", error.response?.data || error.message);
      throw error;
    }
  }

  async enrichProperty(address: string, city: string, state: string, zipCode: string) {
    try {
      const { data } = await this.http.post("/api/enrich", {
        address,
        city,
        state,
        zipCode,
      });
      return data;
    } catch (error: any) {
      console.error("Property Hunt Enrich Error:", error.response?.data || error.message);
      throw error;
    }
  }

  async importToLeads(teamId: string, propertyIds: string[]) {
    try {
      const { data } = await this.http.post("/api/export-to-leads", {
        teamId,
        propertyIds,
      });
      return data;
    } catch (error: any) {
      console.error("Property Hunt Import Error:", error.response?.data || error.message);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const { data } = await this.http.get("/health");
      return { healthy: true, ...data };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}
