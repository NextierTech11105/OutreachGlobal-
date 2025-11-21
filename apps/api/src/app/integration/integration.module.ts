import { CustomModule } from "@/common/decorators";
import { ConfigModule } from "@nestjs/config";
import { IntegrationOauthController } from "./controllers/integration-oauth.controller";
import { IntegrationService } from "./services/integration.service";
import { TeamModule } from "../team/team.module";
import { IntegrationResolver } from "./resolvers/integration.resolver";
import { IntegrationSchedule } from "./schedules/integration.schedule";
import { ZohoService } from "./services/zoho.service";
import { ModuleMetadataResolver } from "./resolvers/module-metadata.resolver";
import { CacheModule } from "../../lib/cache/cache.module";
import { IntegrationFieldService } from "./services/integration-field.service";
import { IntegrationFieldResolver } from "./resolvers/integration-field.resolver";
import { BullModule } from "@nestjs/bullmq";
import { INTEGRATION_TASK_QUEUE } from "./constants/integration-task.constants";
import { IntegrationTaskConsumer } from "./consumers/integration-task.consumer";
import { IntegrationTaskService } from "./services/integration-task.service";
import { IntegrationTaskResolver } from "./resolvers/integration-task.resolver";
import { SignalHouseService } from "./services/signalhouse.service";
// import { ApolloService } from "./services/apollo.service"; // TODO: Add back after committing apollo.service.ts

@CustomModule({
  imports: [
    ConfigModule,
    TeamModule,
    CacheModule,
    BullModule.registerQueue({
      name: INTEGRATION_TASK_QUEUE,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    }),
  ],
  controllers: [IntegrationOauthController],
  providers: [
    IntegrationService,
    ZohoService,
    SignalHouseService,
    // ApolloService, // TODO: Add back after committing apollo.service.ts
    IntegrationFieldService,
    IntegrationTaskService,
  ],
  resolvers: [
    IntegrationResolver,
    ModuleMetadataResolver,
    IntegrationFieldResolver,
    IntegrationTaskResolver,
  ],
  schedules: [IntegrationSchedule],
  consumers: [IntegrationTaskConsumer],
})
export class IntegrationModule {}
