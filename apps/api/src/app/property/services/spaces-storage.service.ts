import { Injectable, Logger } from "@nestjs/common";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import * as Papa from "papaparse";

export interface PropertyIDRecord {
  propertyId: string;
  externalId?: string;
  capturedAt: string;
  snapshot: Record<string, any>;
}

@Injectable()
export class SpacesStorageService {
  private readonly logger = new Logger(SpacesStorageService.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    // DigitalOcean Spaces configuration
    this.s3Client = new S3Client({
      endpoint: process.env.DO_SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com",
      region: process.env.DO_SPACES_REGION || "nyc3",
      credentials: {
        accessKeyId: process.env.DO_SPACES_ACCESS_KEY || "",
        secretAccessKey: process.env.DO_SPACES_SECRET_KEY || "",
      },
    });
    this.bucketName = process.env.DO_SPACES_BUCKET || "nextier-property-tracking";
  }

  /**
   * Save property IDs to CSV in 10k blocks
   * Folder structure: {teamId}/{YYYY-MM-DD}/{searchName}/block_{n}.csv
   */
  async savePropertyIDs(
    teamId: string,
    searchName: string,
    propertyRecords: PropertyIDRecord[],
  ): Promise<{ blocks: number; totalSaved: number }> {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const blockSize = 10000;
    const totalBlocks = Math.ceil(propertyRecords.length / blockSize);

    this.logger.log(
      `Saving ${propertyRecords.length} property IDs in ${totalBlocks} blocks for search: ${searchName}`,
    );

    for (let i = 0; i < totalBlocks; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, propertyRecords.length);
      const blockRecords = propertyRecords.slice(start, end);

      // Convert to CSV
      const csv = Papa.unparse(blockRecords);

      // Upload to Spaces
      const key = `${teamId}/${date}/${searchName}/block_${i + 1}.csv`;
      await this.uploadToSpaces(key, csv);

      this.logger.log(`Uploaded block ${i + 1}/${totalBlocks} (${blockRecords.length} records) to ${key}`);
    }

    return {
      blocks: totalBlocks,
      totalSaved: propertyRecords.length,
    };
  }

  /**
   * Upload CSV data to DigitalOcean Spaces
   */
  private async uploadToSpaces(key: string, content: string): Promise<void> {
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        ContentType: "text/csv",
        ACL: "private",
      },
    });

    await upload.done();
  }

  /**
   * Get saved property IDs from previous day for comparison
   */
  async getPreviousPropertyIDs(
    teamId: string,
    searchName: string,
    daysAgo: number = 1,
  ): Promise<PropertyIDRecord[]> {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().split("T")[0];

    const prefix = `${teamId}/${dateStr}/${searchName}/`;

    try {
      // List all blocks for this search
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(listCommand);

      if (!response.Contents || response.Contents.length === 0) {
        this.logger.log(`No previous data found for ${searchName} on ${dateStr}`);
        return [];
      }

      // Download and parse all blocks
      const allRecords: PropertyIDRecord[] = [];

      for (const object of response.Contents) {
        if (!object.Key) continue;

        const getCommand = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: object.Key,
        });

        const data = await this.s3Client.send(getCommand);
        const csvContent = await data.Body!.transformToString();

        const parsed = Papa.parse<PropertyIDRecord>(csvContent, {
          header: true,
          dynamicTyping: true,
        });

        allRecords.push(...parsed.data);
      }

      this.logger.log(`Retrieved ${allRecords.length} records from ${response.Contents.length} blocks`);
      return allRecords;
    } catch (error) {
      this.logger.error(`Error retrieving previous property IDs: ${error.message}`);
      return [];
    }
  }

  /**
   * Compare current property IDs with previous to detect changes
   */
  comparePropertySets(
    current: PropertyIDRecord[],
    previous: PropertyIDRecord[],
  ): {
    added: PropertyIDRecord[];
    deleted: PropertyIDRecord[];
    updated: PropertyIDRecord[];
  } {
    const previousMap = new Map(previous.map((p) => [p.propertyId, p]));
    const currentMap = new Map(current.map((p) => [p.propertyId, p]));

    // Detect added properties
    const added = current.filter((p) => !previousMap.has(p.propertyId));

    // Detect deleted properties
    const deleted = previous.filter((p) => !currentMap.has(p.propertyId));

    // Detect updated properties (field changes)
    const updated: PropertyIDRecord[] = [];
    for (const currentRecord of current) {
      const previousRecord = previousMap.get(currentRecord.propertyId);
      if (previousRecord) {
        // Compare snapshots for changes
        if (JSON.stringify(currentRecord.snapshot) !== JSON.stringify(previousRecord.snapshot)) {
          updated.push(currentRecord);
        }
      }
    }

    this.logger.log(`Changes detected: +${added.length} added, -${deleted.length} deleted, ~${updated.length} updated`);

    return { added, deleted, updated };
  }
}
