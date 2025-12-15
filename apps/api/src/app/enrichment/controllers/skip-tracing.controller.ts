import { Controller, Post, Get, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { SkipTracingService, SkipTraceTarget, SkipTraceResult } from "../services/skip-tracing.service";
import { AuthGuard } from "@/auth/guards/auth.guard";

@ApiTags("Skip Tracing")
@Controller("skip-tracing")
@UseGuards(AuthGuard)
export class SkipTracingController {
  constructor(private readonly skipTracingService: SkipTracingService) {}

  @Post("trace")
  @ApiOperation({ summary: "Perform skip tracing with onion peeling" })
  @ApiResponse({
    status: 200,
    description: "Skip trace completed successfully",
    type: Object,
  })
  async performSkipTrace(@Body() target: SkipTraceTarget): Promise<SkipTraceResult> {
    return await this.skipTracingService.performSkipTrace(target);
  }

  @Get("results")
  @ApiOperation({ summary: "Get existing skip trace results" })
  @ApiResponse({
    status: 200,
    description: "Skip trace results retrieved",
    type: [Object],
  })
  async getSkipTraceResults(
    @Query("targetName") targetName?: string,
    @Query("businessAddress") businessAddress?: string,
  ): Promise<SkipTraceResult[]> {
    return await this.skipTracingService.getSkipTraceResults(targetName, businessAddress);
  }

  @Post("bulk-trace")
  @ApiOperation({ summary: "Perform bulk skip tracing for multiple targets" })
  @ApiResponse({
    status: 200,
    description: "Bulk skip trace initiated",
    type: [Object],
  })
  async performBulkSkipTrace(@Body() targets: SkipTraceTarget[]): Promise<SkipTraceResult[]> {
    const results: SkipTraceResult[] = [];

    for (const target of targets) {
      try {
        const result = await this.skipTracingService.performSkipTrace(target);
        results.push(result);
      } catch (error) {
        // Log error but continue with other targets
        console.error(`Failed to skip trace ${target.fullName}:`, error);
      }
    }

    return results;
  }
}