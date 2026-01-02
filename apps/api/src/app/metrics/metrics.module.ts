import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";
import { DeadLetterQueueModule } from "@/lib/dlq";

@Global()
@Module({
  imports: [DeadLetterQueueModule, ConfigModule],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
