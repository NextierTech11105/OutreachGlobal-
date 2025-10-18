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

  async propertySearch() {
    const { data } = await this.http.post(
      "https://api.realestateapi.com/v2/PropertySearch",
      {
        limit: 50,
        state: "FL",
        size: 50,
      },
    );

    return data.data as any[];
  }
}
