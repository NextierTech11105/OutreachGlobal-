import { CacheModule } from "../lib/cache/cache.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { TenantContextInterceptor } from "./auth/interceptors/tenant-context.interceptor";
import { CorrelationIdInterceptor } from "./common/interceptors";
import { GlobalExceptionFilter } from "./common/filters";
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
import { InboxModule } from "./inbox/inbox.module";
import { AchievementsModule } from "./achievements/achievements.module";
import { InitialMessagesModule } from "./initial-messages/initial-messages.module";
import { VoiceModule } from "./voice/voice.module";
import { ContentLibraryModule } from "./content-library/content-library.module";
import { EnrichmentModule } from "./enrichment/enrichment.module";
import { DeadLetterQueueModule } from "../lib/dlq";
import { LoggerModule } from "../lib/logger";
import { CircuitBreakerModule } from "../lib/circuit-breaker";

@Module({
  imports: [
    LoggerModule,
    ZodModule,
    CqrsModule.forRoot(),
    DatabaseModule,
    DeadLetterQueueModule,
    CircuitBreakerModule,
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
    InboxModule,
    AchievementsModule,
    InitialMessagesModule,
    VoiceModule,
    ContentLibraryModule,
    EnrichmentModule,
  ],
  providers: [
    AppRunner,
    // Global exception filter for consistent error handling
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global interceptor to add correlation IDs for request tracing
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIdInterceptor,
    },
    // Global interceptor to set tenant context for RLS
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
  controllers: [AppController],
})
export class AppModule {}
