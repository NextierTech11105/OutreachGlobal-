import { Global, Module } from "@nestjs/common";
import { DeadLetterQueueService } from "./dlq.service";

@Global()
@Module({
  providers: [DeadLetterQueueService],
  exports: [DeadLetterQueueService],
})
export class DeadLetterQueueModule {}
