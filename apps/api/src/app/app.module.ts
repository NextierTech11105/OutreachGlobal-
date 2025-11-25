import { CacheModule } from "../lib/cache/cache.module";
import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
import { UserModule } from "./user/user.module";
import { TeamModule } from "./team/team.module";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { ThrottlerModule } from "@nestjs/throttler";
import { ApolloModule } from "./apollo/apollo.module";
import { GraphQLModule } from "@nestjs/graphql";
import { apolloAsyncConfig } from "./apollo/apollo.config";
import { ZodModule } from "../lib/zod/zod.module";
import { MessageTemplateModule } from "./message-template/message-template.module";
import { WorkflowModule } from "./workflow/workflow.module";
import { AppRunner } from "./app.runner";
import { IntegrationModule } from "./integration/integration.module";
import { ScheduleModule } from "@nestjs/schedule";
import { CqrsModule } from "@nestjs/cqrs";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { LeadModule } from "./lead/lead.module";
import { PropertyModule } from "./property/property.module";
import { SdrModule } from "./sdr/sdr.module";
import { ResourceModule } from "./resource/resource.module";
import { MailModule } from "../lib/mail/mail.module";
import { TwilioModule } from "../lib/twilio/twilio.module";
import { CampaignModule } from "./campaign/campaign.module";
import { PromptModule } from "./prompt/prompt.module";
import { AppController } from "./app.controller";
import { PowerDialerModule } from "./power-dialer/power-dialer.module";
import { MessageModule } from "./message/message.module";

@Module({
  imports: [
    ZodModule,
    CqrsModule.forRoot(),
    DatabaseModule,
    ConfigModule.forRoot(),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60000, limit: 60 }]),
    CacheModule,
    ApolloModule,
    ScheduleModule.forRoot(),
    GraphQLModule.forRootAsync(apolloAsyncConfig),
    MailModule,
    TwilioModule,
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          connection: {
            url: configService.get("REDIS_URL"),
          },
          prefix: "nextier_jobs",
        };
      },
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
    AuthModule,
    UserModule,
    TeamModule,
    MessageTemplateModule,
    WorkflowModule,
    IntegrationModule,
    LeadModule,
    PropertyModule,
    SdrModule,
    ResourceModule,
    CampaignModule,
    PromptModule,
    PowerDialerModule,
    MessageModule,
  ],
  providers: [AppRunner],
  controllers: [AppController],
})
export class AppModule implements OnModuleInit {
  async onModuleInit() {
    if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') {
      console.log('🔄 Running database migrations...');
      try {
        await execAsync('cd /workspace/apps/api && npx drizzle-kit push --force');
        console.log('✅ Migrations completed');

        console.log('👤 Creating initial admin user...');
        await execAsync('cd /workspace/apps/api && node create-initial-user.js');
        console.log('✅ Admin user setup complete');
      } catch (error: any) {
        console.error('⚠️ Migration/setup error:', error?.message || error);
      }
    }
  }
}
