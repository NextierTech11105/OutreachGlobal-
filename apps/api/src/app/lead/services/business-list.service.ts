import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError, AxiosInstance } from "axios";
import {
  SearchBusinessListOptions,
  SearchBusinessListResult,
} from "../types/business-list.type";
import { SearchFacetsArgs } from "../args/facet.args";

@Injectable()
export class BusinessListService {
  private http: AxiosInstance;
  constructor(private configService: ConfigService) {
    const API_URL = this.configService.get("BUSINESS_LIST_API_URL");
    this.http = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  getFilters(options: SearchBusinessListOptions) {
    const filter: string[] = [];
    const filterKeys: string[] = [
      "city",
      "state",
      "title",
      "company_domain",
      "company_name",
      "industry",
    ];

    filterKeys.forEach((key) => {
      if (options[key]) {
        const values = options[key].map((val) => `"${val}"`);
        filter.push(`${key} IN [${values.join(",")}]`);
      }
    });
    return filter;
  }

  async searchFacets(options: SearchFacetsArgs & { token: string }) {
    try {
      const { data } = await this.http.post(
        "/rest/search/facet-search",
        {
          facetName: options.name,
          facetQuery: options.facetQuery || undefined,
          q: options.query || undefined,
          limit: 10,
          indexUid: "us_business_data",
        },
        {
          headers: {
            Authorization: `Bearer ${options.token}`,
          },
        },
      );

      return {
        hits: data.facetHits,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new InternalServerErrorException(
          error.response?.data || "internal server error",
        );
      }

      throw new InternalServerErrorException(error);
    }
  }

  async search(options: SearchBusinessListOptions) {
    try {
      const searchParams = {
        query: options.q,
        limit: options.limit || 1,
        offset: options.offset || 0,
        filter: this.getFilters(options),
        indexUid: "us_business_data",
      };

      const { data } = await this.http.post<SearchBusinessListResult>(
        "/rest/search/indexes",
        searchParams,
        {
          headers: {
            Authorization: `Bearer ${options.token}`,
          },
        },
      );
      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new InternalServerErrorException(
          error.response?.data || "internal server error",
        );
      }

      throw new InternalServerErrorException(error);
    }
  }
}
