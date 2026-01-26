import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { InboxModule } from "../inbox/inbox.module";
import { LeadResolver } from "./resolvers/lead.resolver";
import { LeadService } from "./services/lead.service";
import { LeadEventService } from "./services/lead-event.service";
import { LeadSchedule } from "./schedules/lead.schedule";
import { PropertyModule } from "../property/property.module";
import { BusinessListService } from "./services/business-list.service";
import { FacetResolver } from "./resolvers/facet.resolver";
import { LeadsApiController } from "./controllers/leads-api.controller";
import { BusinessListController } from "./controllers/business-list.controller";
import { ApolloSearchController } from "./controllers/apollo-search.controller";
import { ApolloTestController } from "./controllers/apollo-test.controller";
import { SignalHouseController } from "./controllers/signalhouse.controller";
import { SignalHouseWebhookController } from "./controllers/signalhouse-webhook.controller";
import { ConfigModule } from "@nestjs/config";
import { ImportLeadPresetResolver } from "./resolvers/import-lead-preset.resolver";
import { LeadRepository } from "./repositories/lead.repository";
import { LeadFilterService } from "./services/lead-filter.service";
import { CacheModule } from "../../lib/cache/cache.module";
import { BullModule } from "@nestjs/bullmq";
import { LeadConsumer } from "./consumers/lead.consumer";
import {
  ContentNurtureConsumer,
  CONTENT_NURTURE_QUEUE,
} from "./consumers/content-nurture.consumer";
import {
  AutoTriggerConsumer,
  AutoTriggerService,
  AUTO_TRIGGER_QUEUE,
} from "./consumers/auto-trigger.consumer";
import { WorkspaceMappingService } from "./services/workspace-mapping.service";
import { SicMapperService } from "./services/sic-mapper.service";

@CustomModule({
  imports: [
    TeamModule,
    InboxModule,
    PropertyModule,
    ConfigModule,
    CacheModule,
    BullModule.registerQueue({
      name: "lead",
    }),
    BullModule.registerQueue({
      name: CONTENT_NURTURE_QUEUE,
    }),
    BullModule.registerQueue({
      name: AUTO_TRIGGER_QUEUE,
    }),
  ],
  resolvers: [LeadResolver, FacetResolver, ImportLeadPresetResolver],
  providers: [
    LeadService,
    LeadEventService,
    BusinessListService,
    LeadFilterService,
    AutoTriggerService,
    WorkspaceMappingService,
    SicMapperService,
  ],
  consumers: [LeadConsumer, ContentNurtureConsumer, AutoTriggerConsumer],
  repositories: [LeadRepository],
  schedules: [LeadSchedule],
  exports: [
    LeadService,
    LeadEventService,
    AutoTriggerService,
    WorkspaceMappingService,
    SicMapperService,
  ],
  controllers: [
    LeadsApiController,
    BusinessListController,
    ApolloSearchController,
    ApolloTestController,
    SignalHouseController,
    SignalHouseWebhookController,
  ],
})
export class LeadModule {}
