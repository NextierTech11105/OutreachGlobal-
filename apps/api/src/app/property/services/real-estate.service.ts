import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { RealEstatePropertySearchOptions } from "../types/real-estate.type";

@Injectable()
export class RealEstateService {
  private http: AxiosInstance;

  constructor(private configService: ConfigService) {
    const baseURL =
      this.configService.get("REALESTATE_API_URL") ||
      "https://api.realestateapi.com/v2";
    this.http = axios.create({
      baseURL,
      headers: {
        "x-api-key": this.configService.get("REALESTATE_API_KEY"),
      },
    });
  }

  /**
   * Expose the configured Axios instance for advanced scenarios
   */
  get client() {
    return this.http;
  }

  async request<T = any>(config: AxiosRequestConfig) {
    const { data } = await this.http.request<T>(config);
    return data;
  }

  async propertySearch(options: RealEstatePropertySearchOptions = {}) {
    const {
      state = "FL",
      limit = 50,
      size = 50,
      reverseMortgage,
      death,
      judgment,
      reo,
      noticeType,
      negativeEquity,
      ltvMin,
      ltvMax,
    } = options;

    const payload: Record<string, unknown> = {
      state,
      limit,
      size,
    };

    // Only pass filters that are provided so we do not change default API behavior.
    if (reverseMortgage !== undefined)
      payload.reverse_mortgage = reverseMortgage;
    if (death !== undefined) payload.death = death;
    if (judgment !== undefined) payload.judgment = judgment;
    if (reo !== undefined) payload.reo = reo;
    if (noticeType) payload.notice_type = noticeType;
    if (negativeEquity !== undefined) payload.negative_equity = negativeEquity;
    if (ltvMin !== undefined) payload.ltv_min = ltvMin;
    if (ltvMax !== undefined) payload.ltv_max = ltvMax;

    const { data } = await this.http.post("/v2/PropertySearch", payload);

    return data.data as any[];
  }
}
