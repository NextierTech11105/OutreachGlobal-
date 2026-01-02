/**
 * B2B Ingestion Consumer
 * Processes B2B sector CSV files from DO Spaces
 */
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import {
  B2BIngestionService,
  B2BIngestionJob,
} from "../services/b2b-ingestion.service";
import { DeadLetterQueueService } from "@/lib/dlq";

const B2B_INGESTION_QUEUE = "b2b-ingestion";

@Processor(B2B_INGESTION_QUEUE, { concurrency: 5, lockDuration: 30000 })
export class B2BIngestionConsumer extends WorkerHost {
  private readonly logger = new Logger(B2BIngestionConsumer.name);

  constructor(
    private b2bIngestionService: B2BIngestionService,
    private dlqService: DeadLetterQueueService,
  ) {
    super();
  }

  async process(job: Job<B2BIngestionJob>): Promise<any> {
    this.logger.log(`Processing B2B ingestion job ${job.id}: ${job.name}`);

    switch (job.name) {
      case "INGEST_SECTOR":
        return this.ingestSector(job.data);
      case "INGEST_FILE":
        return this.ingestFile(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Ingest all files from a sector path
   */
  private async ingestSector(data: B2BIngestionJob) {
    const { teamId, config } = data;

    this.logger.log(
      `Starting sector ingestion: ${config.sector}/${config.subSector}`,
    );

    // List all files in the sector path
    const files = await this.b2bIngestionService.listSectorFiles(
      config.bucketPath,
    );

    if (files.length === 0) {
      this.logger.warn(`No files found in ${config.bucketPath}`);
      return { filesProcessed: 0, records: 0 };
    }

    let totalRecords = 0;
    let totalBusinesses = 0;
    let totalPersonas = 0;
    let totalErrors = 0;

    for (const filePath of files) {
      try {
        this.logger.log(`Processing file: ${filePath}`);

        const records = await this.b2bIngestionService.readBucketFile(filePath);
        this.logger.log(`Read ${records.length} records from ${filePath}`);

        const result = await this.b2bIngestionService.processRecords(
          teamId,
          records,
          { ...config, bucketPath: filePath },
        );

        totalRecords += records.length;
        totalBusinesses += result.businessesCreated;
        totalPersonas += result.personasCreated;
        totalErrors += result.errors.length;

        this.logger.log(
          `File ${filePath}: ${result.businessesCreated} businesses, ${result.personasCreated} personas, ${result.errors.length} errors`,
        );
      } catch (error) {
        this.logger.error(`Failed to process file ${filePath}:`, error);
        totalErrors++;
      }
    }

    this.logger.log(
      `Sector ingestion complete: ${files.length} files, ${totalRecords} records, ${totalBusinesses} businesses, ${totalPersonas} personas, ${totalErrors} errors`,
    );

    return {
      filesProcessed: files.length,
      totalRecords,
      businessesCreated: totalBusinesses,
      personasCreated: totalPersonas,
      errors: totalErrors,
    };
  }

  /**
   * Ingest a single file
   */
  private async ingestFile(data: B2BIngestionJob) {
    const { teamId, config, bucketPath } = data;

    this.logger.log(`Processing single file: ${bucketPath}`);

    const records = await this.b2bIngestionService.readBucketFile(bucketPath);
    this.logger.log(`Read ${records.length} records`);

    const result = await this.b2bIngestionService.processRecords(
      teamId,
      records,
      config,
    );

    this.logger.log(
      `File complete: ${result.businessesCreated} businesses, ${result.personasCreated} personas, ${result.errors.length} errors`,
    );

    return result;
  }

  @OnWorkerEvent("completed")
  async onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
    await this.dlqService.recordBullMQFailure(B2B_INGESTION_QUEUE, job, error);
  }

  @OnWorkerEvent("progress")
  async onProgress(job: Job, progress: number | object) {
    this.logger.log(`Job ${job.id} progress: ${JSON.stringify(progress)}`);
  }
}
