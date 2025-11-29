import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { RealEstateService } from "../services/real-estate.service";

@Controller("property")
export class PropertyController {
  constructor(private readonly realEstateService: RealEstateService) {}

  @Post("search")
  async searchProperties(@Body() body: any) {
    try {
      // Pass through to RealEstateAPI
      const response = await this.realEstateService.client.post(
        "/PropertySearch",
        body,
      );
      return response.data;
    } catch (error: any) {
      return {
        error: true,
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
      };
    }
  }

  @Get("search")
  async searchPropertiesGet(@Query() query: any) {
    try {
      const response = await this.realEstateService.client.post(
        "/PropertySearch",
        query,
      );
      return response.data;
    } catch (error: any) {
      return {
        error: true,
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
      };
    }
  }

  @Post("detail")
  async getPropertyDetail(@Body() body: { id: string }) {
    try {
      const response = await this.realEstateService.client.post(
        "/PropertyDetail",
        body,
      );
      return response.data;
    } catch (error: any) {
      return {
        error: true,
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
      };
    }
  }

  @Get("detail")
  async getPropertyDetailGet(@Query("id") id: string) {
    try {
      const response = await this.realEstateService.client.post(
        "/PropertyDetail",
        { id },
      );
      return response.data;
    } catch (error: any) {
      return {
        error: true,
        message: error.response?.data?.message || error.message,
        statusCode: error.response?.status || 500,
      };
    }
  }
}
