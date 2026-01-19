/**
 * Block Manager Service
 * Manages 10k lead blocks with DO Spaces storage
 *
 * Block = 10,000 leads
 * Sub-blocks = 500 / 1,000 / 2,000 daily batches
 *
 * Storage:
 *   nextier-data/blocks/block-001/raw/
 *   nextier-data/blocks/block-001/traced/
 *   nextier-data/blocks/block-001/scored/
 *   nextier-data/blocks/block-001/ready/
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/prisma/prisma.service";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

export interface Block {
  id: string;
  number: number;
  teamId: string;
  status: "active" | "complete" | "archived";
  capacity: number; // 10000
  current: number;
  subBlocks: SubBlock[];
  createdAt: Date;
  completedAt?: Date;
  spacesPath: string;
}

export interface SubBlock {
  id: string;
  blockId: string;
  number: number;
  size: number; // 500 | 1000 | 2000
  status: "pending" | "tracing" | "scoring" | "ready" | "campaign" | "complete";
  leadsCount: number;
  smsReadyCount: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface BlockCapacity {
  blockId: string;
  blockNumber: number;
  capacity: number;
  used: number;
  remaining: number;
  percentFull: number;
  subBlocksComplete: number;
  subBlocksTotal: number;
}

@Injectable()
export class BlockManagerService {
  private readonly logger = new Logger(BlockManagerService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly spacesUrl: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    // DO Spaces uses S3-compatible API
    this.bucket = this.config.get("DO_SPACES_BUCKET") || "nextier-data";
    this.spacesUrl = this.config.get("DO_SPACES_URL") || "https://nyc3.digitaloceanspaces.com";

    this.s3 = new S3Client({
      endpoint: this.spacesUrl,
      region: "nyc3",
      credentials: {
        accessKeyId: this.config.get("DO_SPACES_KEY") || "",
        secretAccessKey: this.config.get("DO_SPACES_SECRET") || "",
      },
    });
  }

  /**
   * Get or create active block for team
   */
  async getActiveBlock(teamId: string): Promise<Block> {
    // Check for existing active block
    const existing = await this.prisma.enrichmentJob.findFirst({
      where: {
        // Using enrichment_jobs table to track blocks
        status: "active",
        // teamId would need to be added to schema
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return this.mapToBlock(existing, teamId);
    }

    // Create new block
    return this.createBlock(teamId);
  }

  /**
   * Create new 10k block
   */
  async createBlock(teamId: string): Promise<Block> {
    // Get next block number
    const lastBlock = await this.prisma.enrichmentJob.findFirst({
      where: { jobType: "block" },
      orderBy: { createdAt: "desc" },
    });

    const blockNumber = lastBlock ? parseInt(lastBlock.sourceFile?.split("-")[1] || "0") + 1 : 1;
    const blockId = `block-${String(blockNumber).padStart(3, "0")}`;

    // Create block record
    const block = await this.prisma.enrichmentJob.create({
      data: {
        jobType: "block",
        status: "active",
        sourceFile: blockId,
        sectorTag: teamId,
        totalRecords: 10000,
        processedRecords: 0,
      },
    });

    // Create Spaces folders
    await this.createBlockFolders(blockId);

    this.logger.log(`[BlockManager] Created block ${blockId} for team ${teamId}`);

    return {
      id: block.id.toString(),
      number: blockNumber,
      teamId,
      status: "active",
      capacity: 10000,
      current: 0,
      subBlocks: [],
      createdAt: block.createdAt,
      spacesPath: `blocks/${blockId}`,
    };
  }

  /**
   * Create sub-block within active block
   */
  async createSubBlock(
    blockId: string,
    size: 500 | 1000 | 2000,
  ): Promise<SubBlock> {
    const block = await this.prisma.enrichmentJob.findFirst({
      where: { sourceFile: blockId },
    });

    if (!block) {
      throw new Error(`Block ${blockId} not found`);
    }

    // Count existing sub-blocks
    const subBlockCount = await this.prisma.enrichmentJob.count({
      where: {
        jobType: "sub-block",
        sourceFile: { startsWith: blockId },
      },
    });

    const subBlockNumber = subBlockCount + 1;
    const subBlockId = `${blockId}-sub-${String(subBlockNumber).padStart(2, "0")}`;

    const subBlock = await this.prisma.enrichmentJob.create({
      data: {
        jobType: "sub-block",
        status: "pending",
        sourceFile: subBlockId,
        totalRecords: size,
        processedRecords: 0,
      },
    });

    this.logger.log(`[BlockManager] Created sub-block ${subBlockId} (${size} leads)`);

    return {
      id: subBlock.id.toString(),
      blockId,
      number: subBlockNumber,
      size,
      status: "pending",
      leadsCount: 0,
      smsReadyCount: 0,
      createdAt: subBlock.createdAt,
    };
  }

  /**
   * Get block capacity status
   */
  async getBlockCapacity(teamId: string): Promise<BlockCapacity> {
    const block = await this.getActiveBlock(teamId);

    const subBlocks = await this.prisma.enrichmentJob.findMany({
      where: {
        jobType: "sub-block",
        sourceFile: { startsWith: `block-${String(block.number).padStart(3, "0")}` },
      },
    });

    const used = subBlocks.reduce((sum, sb) => sum + (sb.processedRecords || 0), 0);
    const subBlocksComplete = subBlocks.filter((sb) => sb.status === "completed").length;

    return {
      blockId: `block-${String(block.number).padStart(3, "0")}`,
      blockNumber: block.number,
      capacity: 10000,
      used,
      remaining: 10000 - used,
      percentFull: Math.round((used / 10000) * 100),
      subBlocksComplete,
      subBlocksTotal: subBlocks.length,
    };
  }

  /**
   * Check if block is full and create next
   */
  async checkAndRotateBlock(teamId: string): Promise<Block> {
    const capacity = await this.getBlockCapacity(teamId);

    if (capacity.remaining <= 0) {
      this.logger.log(`[BlockManager] Block ${capacity.blockId} full, creating next block`);

      // Mark current block complete
      await this.prisma.enrichmentJob.updateMany({
        where: { sourceFile: capacity.blockId },
        data: { status: "completed", completedAt: new Date() },
      });

      // Create next block
      return this.createBlock(teamId);
    }

    return this.getActiveBlock(teamId);
  }

  /**
   * Upload file to block storage
   */
  async uploadToBlock(
    blockId: string,
    stage: "raw" | "traced" | "scored" | "ready",
    filename: string,
    data: Buffer | string,
  ): Promise<string> {
    const key = `blocks/${blockId}/${stage}/${filename}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: typeof data === "string" ? Buffer.from(data) : data,
        ContentType: filename.endsWith(".csv") ? "text/csv" : "application/json",
        ACL: "private",
      }),
    );

    const url = `${this.spacesUrl}/${this.bucket}/${key}`;
    this.logger.log(`[BlockManager] Uploaded ${key}`);

    return url;
  }

  /**
   * List files in block stage
   */
  async listBlockFiles(
    blockId: string,
    stage: "raw" | "traced" | "scored" | "ready",
  ): Promise<string[]> {
    const prefix = `blocks/${blockId}/${stage}/`;

    const response = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    );

    return (response.Contents || []).map((obj) => obj.Key || "").filter(Boolean);
  }

  /**
   * Get block summary for dashboard
   */
  async getBlocksSummary(teamId: string): Promise<{
    activeBlock: BlockCapacity;
    completedBlocks: number;
    totalLeadsProcessed: number;
  }> {
    const activeBlock = await this.getBlockCapacity(teamId);

    const completedBlocks = await this.prisma.enrichmentJob.count({
      where: { jobType: "block", status: "completed" },
    });

    const totalProcessed = await this.prisma.enrichmentJob.aggregate({
      where: { jobType: "block" },
      _sum: { processedRecords: true },
    });

    return {
      activeBlock,
      completedBlocks,
      totalLeadsProcessed: totalProcessed._sum.processedRecords || 0,
    };
  }

  /**
   * Create block folder structure in Spaces
   */
  private async createBlockFolders(blockId: string): Promise<void> {
    const stages = ["raw", "traced", "scored", "ready"];

    for (const stage of stages) {
      // Create empty placeholder to establish folder
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: `blocks/${blockId}/${stage}/.keep`,
          Body: "",
          ACL: "private",
        }),
      );
    }
  }

  private mapToBlock(record: { id: number; sourceFile: string | null; createdAt: Date; completedAt: Date | null; totalRecords: number | null; processedRecords: number | null }, teamId: string): Block {
    const blockId = record.sourceFile || "block-001";
    const blockNumber = parseInt(blockId.split("-")[1] || "1");

    return {
      id: record.id.toString(),
      number: blockNumber,
      teamId,
      status: record.completedAt ? "complete" : "active",
      capacity: record.totalRecords || 10000,
      current: record.processedRecords || 0,
      subBlocks: [],
      createdAt: record.createdAt,
      completedAt: record.completedAt || undefined,
      spacesPath: `blocks/${blockId}`,
    };
  }
}
