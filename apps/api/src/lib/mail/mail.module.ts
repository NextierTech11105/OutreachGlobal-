import { Module } from "@nestjs/common";
import { MailerModule } from "@haorama/nestjs-mailer";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { MailService } from "./mail.service";
import { MailConsumer } from "./mail.consumer";

@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        return {
          mailers: {
            smtp: {
              host: config.get("MAIL_HOST"),
              port: +config.get("MAIL_PORT") as number,
              auth: {
                user: config.get("MAIL_USER"),
                pass: config.get("MAIL_PASSWORD"),
              },
            },
          },
          default_mailer: "smtp",
        };
      },
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
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
