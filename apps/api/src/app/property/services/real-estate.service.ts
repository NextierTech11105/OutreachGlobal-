import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

@Injectable()
export class RealEstateService {
  private http: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.http = axios.create({
      baseURL: "https://api.realestateapi.com",
      headers: {
        "x-api-key": this.configService.get("REALESTATE_API_KEY"),
      },
    });
  }

  async propertySearch(params: {
    state?: string;
    city?: string;
    county?: string;
    neighborhood?: string;
    zipCode?: string;
    limit?: number;
  }) {
    const {
      state = "NY",
      city,
      county,
      neighborhood,
      zipCode,
      limit = 100,
    } = params;

    const requestBody: any = {
      limit,
      size: limit,
    };

    // Add location parameters
    if (state) requestBody.state = state;
    if (city) requestBody.city = city;
    if (county) requestBody.county = county;
    if (neighborhood) requestBody.neighborhood = neighborhood;
    if (zipCode) requestBody.zipCode = zipCode;

    const { data } = await this.http.post(
      "https://api.realestateapi.com/v2/PropertySearch",
      requestBody,
    );

    return data.data as any[];
  }
}
