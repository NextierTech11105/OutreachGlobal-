/**
 * Enrichment Module
 * Handles B2B ingestion, SkipTrace, Apollo, Identity Graph, and Lead Card building
 */
import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { BillingModule } from "../billing/billing.module";

// Services
import { B2BIngestionService } from "./services/b2b-ingestion.service";
import { CsvImportService } from "./services/csv-import.service";
import { RealEstateApiService } from "./services/realestate-api.service";
import { SkipTraceService } from "./services/skiptrace.service";
// TODO: SkipTracingService needs rewrite to match current schema (businessOwners is junction table, not flat owner table)
// import { SkipTracingService } from "./services/skip-tracing.service";
import { ApolloEnrichmentService } from "./services/apollo-enrichment.service";
import { TwilioLookupService } from "./services/twilio-lookup.service";
import { IdentityGraphService } from "./services/identity-graph.service";
import { LeadCardService } from "./services/lead-card.service";
import { CampaignTriggerService } from "./services/campaign-trigger.service";

// Consumers
import { B2BIngestionConsumer } from "./consumers/b2b-ingestion.consumer";
import { SkipTraceConsumer } from "./consumers/skiptrace.consumer";
import { LeadCardConsumer } from "./consumers/lead-card.consumer";

// Controllers
// TODO: SkipTracingController depends on SkipTracingService - needs schema alignment
// import { SkipTracingController } from "./controllers/skip-tracing.controller";
import { BusinessSearchController } from "./controllers/business-search.controller";

// Repositories
import { PersonaRepository } from "./repositories/persona.repository";
import { BusinessRepository } from "./repositories/business.repository";
import { LeadCardRepository } from "./repositories/lead-card.repository";

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => BillingModule),
    BullModule.registerQueue(
      { name: "b2b-ingestion" },
      { name: "skiptrace" },
      { name: "lead-card" },
    ),
  ],
  providers: [
    // Services
    B2BIngestionService,
    CsvImportService,
    RealEstateApiService,
    SkipTraceService,
    // SkipTracingService, // Disabled: needs schema alignment
    ApolloEnrichmentService,
    TwilioLookupService,
    IdentityGraphService,
    LeadCardService,
    CampaignTriggerService,
    // Consumers
    B2BIngestionConsumer,
    SkipTraceConsumer,
    LeadCardConsumer,
    // Controllers
    // SkipTracingController, // Disabled: needs schema alignment
    BusinessSearchController,
    // Repositories
    PersonaRepository,
    BusinessRepository,
    LeadCardRepository,
  ],
  exports: [
    B2BIngestionService,
    CsvImportService,
    RealEstateApiService,
    SkipTraceService,
    // SkipTracingService, // Disabled: needs schema alignment
    ApolloEnrichmentService,
    TwilioLookupService,
    IdentityGraphService,
    LeadCardService,
    CampaignTriggerService,
  ],
})
export class EnrichmentModule {}
