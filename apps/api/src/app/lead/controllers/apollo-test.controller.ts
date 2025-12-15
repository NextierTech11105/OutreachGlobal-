import { Controller, Post, Body } from "@nestjs/common";
import axios from "axios";

@Controller("apollo")
export class ApolloTestController {
  private readonly apolloApiBase = "https://api.apollo.io/v1";

  @Post("test")
  async test(@Body() body: { apiKey: string }) {
    const { apiKey } = body;

    if (!apiKey) {
      return { error: "API key is required" };
    }

    try {
      const response = await axios.post(
        `${this.apolloApiBase}/mixed_people/search`,
        { page: 1, per_page: 1 },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": apiKey,
          },
        },
      );

      return {
        success: true,
        message: "Connection successful",
        usage: {
          credits_used: 0,
          credits_remaining: response.data.pagination?.total_entries || 0,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          error: error.response?.data?.message || "Invalid API key",
        };
      }
      return { error: "Connection test failed" };
    }
  }

  @Post("configure")
  async configure(@Body() body: { apiKey: string }) {
    const { apiKey } = body;

    if (!apiKey) {
      return { error: "API key is required" };
    }

    try {
      // Verify key works
      const response = await axios.post(
        `${this.apolloApiBase}/mixed_people/search`,
        { page: 1, per_page: 1 },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": apiKey,
          },
        },
      );

      if (response.status === 200) {
        return {
          success: true,
          message: "Apollo.io API key configured successfully",
        };
      }
      return { error: "Invalid API key" };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { error: error.response?.data?.message || "Invalid API key" };
      }
      return { error: "Configuration failed" };
    }
  }
}
