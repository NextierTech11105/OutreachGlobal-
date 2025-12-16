import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import {
  INTEGRATION_TASK_QUEUE,
  IntegrationTaskJob,
} from "../constants/integration-task.constants";
import { IntegrationTaskSelect } from "../models/integration-task.model";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { IntegrationTaskService } from "../services/integration-task.service";
import { ZohoService } from "../services/zoho.service";
import { IntegrationService } from "../services/integration.service";
import { orFail } from "@/database/exceptions";
import { IntegrationFieldService } from "../services/integration-field.service";
import { ZohoAuthData } from "../types/zoho.type";
import { LeadInsert } from "@/app/lead/models/lead.model";
import { leadsTable } from "@/database/schema-alias";
import { sql } from "drizzle-orm";
import { leadImportSchema } from "@/app/lead/dto/lead-import.dto";
import { getProperty } from "@nextier/common";

type JobData = Job<{ task: IntegrationTaskSelect }>;

@Processor(INTEGRATION_TASK_QUEUE, { concurrency: 5 })
export class IntegrationTaskConsumer extends WorkerHost {
  private readonly logger = new Logger(IntegrationTaskConsumer.name);

  constructor(
    @InjectDB() private db: DrizzleClient,
    private service: IntegrationTaskService,
    private zohoService: ZohoService,
    private integrationService: IntegrationService,
    private fieldService: IntegrationFieldService,
  ) {
    super();
  }

  async process(job: JobData) {
    if (job.name === IntegrationTaskJob.SYNC_LEAD) {
      await this.syncLead(job.data);
    }
  }

  async syncLead({ task }: JobData["data"]) {
    const integration = await this.db.query.integrations
      .findFirst({
        where: (t, { eq }) => eq(t.id, task.integrationId),
      })
      .then(orFail("integration"));

    if (integration.name === "zoho") {
      const fields = await this.fieldService.findMany({
        integrationId: integration.id,
        moduleName: task.moduleName,
      });
      const authData = integration.authData;
      const zohoFields = fields.map((field) => field.targetField);
      if (authData) {
        // Call the recursive function to handle pagination
        await this.syncLeadRecursive({
          authData: authData as ZohoAuthData,
          fields,
          zohoFields,
          moduleName: task.moduleName,
          integration,
          pageToken: undefined,
        });
      }
    }
  }

  private async syncLeadRecursive({
    authData,
    fields,
    zohoFields,
    moduleName,
    integration,
    pageToken,
  }: {
    authData: ZohoAuthData;
    fields: any[];
    zohoFields: string[];
    moduleName: string;
    integration: any;
    pageToken?: string;
  }) {
    // Fetch records with pagination
    const data = await this.zohoService.records(authData, {
      fields: zohoFields,
      moduleName: moduleName,
      pageToken: pageToken,
    });

    const leadValues: LeadInsert[] = [];
    data.data.forEach((record) => {
      const leadValue: LeadInsert = {
        teamId: integration.teamId,
        integrationId: integration.id,
      };

      fields.forEach((integrationField) => {
        const zohoFieldName = integrationField.targetField;
        const localFieldName = integrationField.sourceField;
        const zohoValue = integrationField.subField
          ? getProperty(record[zohoFieldName], integrationField.subField)
          : record[zohoFieldName];

        if (zohoValue !== undefined) {
          (leadValue as any)[localFieldName] = zohoValue;
        }
      });

      leadValue.externalId = record.id;
      // make sure id from zoho does not inserted
      leadValue.id = undefined;

      leadValues.push(leadValue);
    });

    const validatedValues = leadImportSchema.parse({
      values: leadValues,
    });

    if (validatedValues.values.length) {
      await this.db
        .insert(leadsTable)
        .values(validatedValues.values)
        .onConflictDoUpdate({
          target: [
            leadsTable.teamId,
            leadsTable.integrationId,
            leadsTable.externalId,
          ],
          set: {
            firstName: sql`excluded.first_name`,
            lastName: sql`excluded.last_name`,
            email: sql`excluded.email`,
            phone: sql`excluded.phone`,
            title: sql`excluded.title`,
            company: sql`excluded.company`,
            zipCode: sql`excluded.zip_code`,
            country: sql`excluded.country`,
            state: sql`excluded.state`,
            city: sql`excluded.city`,
            address: sql`excluded.address`,
            source: sql`excluded.source`,
            notes: sql`excluded.notes`,
            status: sql`excluded.status`,
          },
        });
    }

    // Check if there are more records to fetch
    if (data.info.more_records && data.info.next_page_token) {
      // Recursively call to fetch the next page
      await this.syncLeadRecursive({
        authData,
        fields,
        zohoFields,
        moduleName,
        integration,
        pageToken: data.info.next_page_token,
      });
    }
  }

  @OnWorkerEvent("failed")
  async handleFailed(job: JobData, error: any) {
    this.logger.error(
      `Integration task job ${job.id} failed: ${error?.message || "Unknown error"}`,
      error?.stack,
    );
    if (job.data.task.id) {
      await this.service.setStatus({ id: job.data.task.id, status: "FAILED" });
    }
  }

  @OnWorkerEvent("completed")
  async handleCompleted(job: JobData) {
    if (job.data.task.id) {
      await this.service.setStatus({
        id: job.data.task.id,
        status: "COMPLETED",
      });
    }
  }
}
