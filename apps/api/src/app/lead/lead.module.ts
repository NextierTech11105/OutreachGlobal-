import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { LeadResolver } from "./resolvers/lead.resolver";
import { LeadService } from "./services/lead.service";
import { LeadSchedule } from "./schedules/lead.schedule";
import { PropertyModule } from "../property/property.module";
import { BusinessListService } from "./services/business-list.service";
import { FacetResolver } from "./resolvers/facet.resolver";
import { BusinessListController } from "./controllers/business-list.controller";
import { ConfigModule } from "@nestjs/config";
import { ImportLeadPresetResolver } from "./resolvers/import-lead-preset.resolver";
import { LeadRepository } from "./repositories/lead.repository";
import { LeadFilterService } from "./services/lead-filter.service";
import { CacheModule } from "../../lib/cache/cache.module";
import { BullModule } from "@nestjs/bullmq";
import { LeadConsumer } from "./consumers/lead.consumer";

@CustomModule({
  imports: [
    TeamModule,
    PropertyModule,
    ConfigModule,
    CacheModule,
    BullModule.registerQueue({
      name: "lead",
    }),
  ],
  resolvers: [LeadResolver, FacetResolver, ImportLeadPresetResolver],
  providers: [LeadService, BusinessListService, LeadFilterService],
  consumers: [LeadConsumer],
  repositories: [LeadRepository],
  schedules: [LeadSchedule],
  exports: [LeadService],
  controllers: [BusinessListController],
})
export class LeadModule {}
