import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { MailService } from "./mail.service";
import { MailConsumer } from "./mail.consumer";

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: "mail",
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
  ],
  providers: [MailService, MailConsumer],
  exports: [MailService],
})
export class MailModule {}
