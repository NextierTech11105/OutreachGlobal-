import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { BusinessListService } from "../services/business-list.service";
import { LeadInsert } from "../models/lead.model";
import { and } from "drizzle-orm";
import { TeamSettingService } from "@/app/team/services/team-setting.service";
import { BusinessListSettings } from "@/app/team/objects/business-list-settings.object";
import { ImportBusinessListInput } from "../inputs/import-business-list.input";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { LeadFilterService } from "../services/lead-filter.service";
import { generateUlid } from "@/database/columns/ulid";
import { leadsTable } from "@/database/schema-alias";
import { DeadLetterQueueService } from "@/lib/dlq";

interface ImportBusinessListData {
  presetId?: string;
  input: ImportBusinessListInput;
  teamId: string;
}

const LEAD_QUEUE = "lead";

@Processor(LEAD_QUEUE)
export class LeadConsumer extends WorkerHost {
  private readonly logger = new Logger(LeadConsumer.name);

  constructor(
    private businessListService: BusinessListService,
    @InjectDB() private db: DrizzleClient,
    private leadFilterService: LeadFilterService,
    private settingService: TeamSettingService,
    private dlqService: DeadLetterQueueService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name === "IMPORT_BUSINESS_LIST") {
      await this.importBusinessList(job.data);
    }
  }

  async importBusinessList(data: ImportBusinessListData) {
    const MAX_LEADS = 1000;

    const settings = await this.settingService.getMapped<BusinessListSettings>(
      data.teamId,
      "business-list",
    );
    if (!settings.businessListApiToken) {
      throw new Error("Business list api token is not set");
    }

    const preset = await this.db.query.importLeadPresets.findFirst({
      where: (t, { eq }) =>
        and(eq(t.teamId, data.teamId), eq(t.id, data.presetId || "NO_PRESET")),
    });

    const result = await this.businessListService.search({
      ...data.input,
      q: data.input.searchQuery,
      token: settings.businessListApiToken,
      limit: MAX_LEADS,
    });

    const values = result.hits.reduce((acc, curr) => {
      if (!acc.find((item) => item.email === curr.email)) {
        acc.push({
          ...curr,
          teamId: data.teamId,
          id: generateUlid("lead"),
          company: curr.company_name || undefined,
          source: "BUSINESS_LIST",
        });
      }

      return acc;
    }, [] as LeadInsert[]);

    if (values.length) {
      // await this.db.insert(leadsTable).values(values);
      await this.leadFilterService.processBatches(
        data.teamId,
        values,
        preset?.config || ({} as any),
      );
    }
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `Lead import job ${job.id} failed: ${error.message}`,
      error.stack,
    );
    await this.dlqService.recordBullMQFailure(LEAD_QUEUE, job, error);
  }
}
