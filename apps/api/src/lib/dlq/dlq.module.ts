import { Global, Module } from "@nestjs/common";
import { DeadLetterQueueService } from "./dlq.service";
import { DLQRetryScheduler } from "./dlq-retry.schedule";

@Global()
@Module({
  providers: [DeadLetterQueueService, DLQRetryScheduler],
  exports: [DeadLetterQueueService, DLQRetryScheduler],
})
export class DeadLetterQueueModule {}
