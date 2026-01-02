import { Controller, Get, Header } from "@nestjs/common";
import { MetricsService } from "./metrics.service";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * GET /metrics
   * Returns Prometheus-format metrics for monitoring
   */
  @Get()
  @Header("Content-Type", "text/plain; charset=utf-8")
  async getMetrics(): Promise<string> {
    return this.metricsService.getPrometheusMetrics();
  }

  /**
   * GET /metrics/json
   * Returns metrics in JSON format for debugging
   */
  @Get("json")
  async getMetricsJson() {
    return this.metricsService.getAllMetrics();
  }
}
