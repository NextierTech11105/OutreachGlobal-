/**
 * LUCI Engine Module
 * Data Pipeline: Import → Tracerfy → Trestle → Ready
 *
 * Block System: 10k leads per block
 * Sub-blocks: 500 / 1k / 2k daily batches
 * Storage: DO Spaces
 *
 * PAAS/DAAS - No fluff, just data.
 */

import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { LuciService } from "./luci.service";
import { LuciController } from "./luci.controller";
import { TracerfyClient } from "./clients/tracerfy.client";
import { TrestleClient } from "./clients/trestle.client";
import { LuciConsumer } from "./consumers/luci.consumer";
import { BlockManagerService } from "./services/block-manager.service";
import { CampaignExecutorService } from "./services/campaign-executor.service";
import { SignalHouseModule } from "@/lib/signalhouse/signalhouse.module";
import { LUCI_QUEUE } from "./constants";

@Module({
  imports: [
    BullModule.registerQueue({
      name: LUCI_QUEUE,
    }),
    SignalHouseModule,
  ],
  controllers: [LuciController],
  providers: [
    LuciService,
    TracerfyClient,
    TrestleClient,
    LuciConsumer,
    BlockManagerService,
    CampaignExecutorService,
  ],
  exports: [LuciService, TracerfyClient, TrestleClient, BlockManagerService, CampaignExecutorService],
})
export class LuciModule {}
