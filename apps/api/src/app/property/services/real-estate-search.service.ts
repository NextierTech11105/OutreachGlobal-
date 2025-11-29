import { InjectDB } from "@/database/decorators";
import {
  propertySearchBlocksTable,
  propertySearchesTable,
} from "@/database/schema-alias";
import { generateUlid } from "@/database/columns/ulid";
import { DrizzleClient } from "@/database/types";
import { Injectable, Logger } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import { RealEstateService } from "./real-estate.service";

export interface RealEstatePaginatedSearchRequest {
  endpoint: string;
  method?: "GET" | "POST";
  filters?: Record<string, any>;
  pageParam?: string;
  limitParam?: string;
  maxRecords?: number;
  blockSize?: number;
  pageSize?: number;
}

export interface RealEstateSearchBlockSummary {
  blockIndex: number;
  key: string;
  recordCount: number;
  checksum: string;
}

export interface RealEstateSearchRun {
  searchId: string;
  total: number;
  fetched: number;
  blockKeys: string[];
  blocks: RealEstateSearchBlockSummary[];
  status: string;
}

@Injectable()
export class RealEstateSearchService {
  private readonly logger = new Logger(RealEstateSearchService.name);
  private readonly defaultPageSize = 250;
  private readonly defaultBlockSize = 5000;
  private readonly defaultMaxRecords = 10000;

  constructor(
    private readonly realEstateService: RealEstateService,
    @InjectDB() private readonly db: DrizzleClient,
  ) {}

  async runPaginatedSearch(
    request: RealEstatePaginatedSearchRequest,
  ): Promise<RealEstateSearchRun> {
    const endpoint = this.normalizeEndpoint(request.endpoint);
    const filters = request.filters || {};
    const filterHash = this.hashFilters(filters);

    const existing = await this.db.query.propertySearches.findFirst({
      where: (t) =>
        and(
          eq(t.endpoint, endpoint),
          eq(t.filterHash, filterHash),
          eq(t.source, "RealEstateAPI"),
        ),
    });

    if (existing) {
      const blocks =
        (await this.db.query.propertySearchBlocks.findMany({
          where: (t) => eq(t.searchId, existing.id),
        })) || [];

      return {
        searchId: existing.id,
        total: existing.total,
        fetched: existing.fetchedCount,
        blockKeys: existing.blockKeys || [],
        blocks: blocks.map((block) => ({
          blockIndex: block.blockIndex,
          key: block.key,
          recordCount: block.recordCount,
          checksum: block.checksum || "",
        })),
        status: existing.status || "completed",
      };
    }

    const searchId = generateUlid("psrch");
    const pageSize = request.pageSize || this.defaultPageSize;
    const blockSize = request.blockSize || this.defaultBlockSize;
    const maxRecords = request.maxRecords || this.defaultMaxRecords;

    await this.db.insert(propertySearchesTable).values({
      id: searchId,
      source: "RealEstateAPI",
      endpoint,
      filters,
      filterHash,
      status: "running",
      blockKeys: [],
      metadata: {
        maxRecords,
        pageSize,
        blockSize,
      },
    });

    const total = await this.fetchTotal(endpoint, request);
    const cappedTotal = Math.min(total, maxRecords);

    let fetched = 0;
    let page = 1;
    let blockIndex = 1;
    let buffer: any[] = [];
    const blockKeys: string[] = [];
    const blockSummaries: RealEstateSearchBlockSummary[] = [];

    try {
      while (fetched < cappedTotal) {
        const remaining = cappedTotal - fetched;
        const pageLimit = Math.min(pageSize, remaining);
        const { records } = await this.fetchPage(endpoint, request, page, pageLimit);

        if (!records.length) {
          break;
        }

        buffer.push(
          ...records.map((record) => this.normalizeRecord(record)),
        );
        fetched += records.length;
        page += 1;

        const shouldFlush =
          buffer.length >= blockSize || fetched >= cappedTotal;

        if (shouldFlush) {
          const { key, checksum, recordCount } = await this.persistBlock(
            searchId,
            blockIndex,
            buffer,
            { endpoint, filters },
          );

          blockKeys.push(key);
          blockSummaries.push({
            blockIndex,
            key,
            recordCount,
            checksum,
          });

          await this.db.insert(propertySearchBlocksTable).values({
            searchId,
            blockIndex,
            key,
            recordCount,
            checksum,
            metadata: { endpoint, filters },
          });

          buffer = [];
          blockIndex += 1;
        }
      }

      await this.db
        .update(propertySearchesTable)
        .set({
          total,
          fetchedCount: fetched,
          blockKeys,
          status: "completed",
          metadata: {
            pageSize,
            blockSize,
            maxRecords,
            filters,
          },
        })
        .where(eq(propertySearchesTable.id, searchId));

      return {
        searchId,
        total,
        fetched,
        blockKeys,
        blocks: blockSummaries,
        status: "completed",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `RealEstate search failed for ${endpoint}: ${errorMessage}`,
      );
      await this.db
        .update(propertySearchesTable)
        .set({
          status: "failed",
          metadata: {
            filters,
            error: errorMessage,
          },
        })
        .where(eq(propertySearchesTable.id, searchId));

      throw error;
    }
  }

  private normalizeEndpoint(endpoint: string) {
    if (!endpoint.startsWith("/")) {
      return `/${endpoint}`;
    }

    return endpoint;
  }

  private async fetchTotal(
    endpoint: string,
    request: RealEstatePaginatedSearchRequest,
  ) {
    const { total, records } = await this.fetchPage(
      endpoint,
      request,
      1,
      1,
    );

    return total || records.length;
  }

  private async fetchPage(
    endpoint: string,
    request: RealEstatePaginatedSearchRequest,
    page: number,
    limit: number,
  ) {
    const pageParam = request.pageParam || "page";
    const limitParam = request.limitParam || "limit";
    const method = request.method || "GET";
    const payload = {
      ...(request.filters || {}),
      [pageParam]: page,
      [limitParam]: limit,
    };

    const axiosConfig =
      method === "GET"
        ? { url: endpoint, method, params: payload }
        : { url: endpoint, method, data: payload };

    const data = await this.realEstateService.request<any>(axiosConfig);
    return this.extractRecords(data);
  }

  private extractRecords(response: any) {
    const candidates = [
      response?.data,
      response?.data?.data,
      response?.data?.results,
      response?.data?.items,
      response?.results,
      response?.items,
      response,
    ];

    const records =
      candidates.find((candidate) => Array.isArray(candidate)) || [];

    const totalCandidates = [
      response?.total,
      response?.count,
      response?.meta?.total,
      response?.pagination?.total,
      response?.data?.total,
      response?.data?.count,
    ];

    const total =
      totalCandidates.find((candidate) => typeof candidate === "number") ||
      records.length;

    return { records, total };
  }

  private async persistBlock(
    searchId: string,
    blockIndex: number,
    records: any[],
    metadata: Record<string, unknown>,
  ) {
    const baseDir = path.join(
      process.cwd(),
      "storage",
      "real-estate-searches",
      searchId,
    );
    await fs.mkdir(baseDir, { recursive: true });
    const filename = `block-${blockIndex}.json`;
    const key = `${searchId}/${filename}`;
    const filepath = path.join(baseDir, filename);
    const payload = { searchId, blockIndex, records, metadata };
    const contents = JSON.stringify(payload);
    await fs.writeFile(filepath, contents, "utf8");

    return {
      key,
      checksum: this.hashContents(contents),
      recordCount: records.length,
    };
  }

  private hashFilters(filters: Record<string, any>) {
    const stable = this.stableStringify(filters || {});
    return this.hashContents(stable);
  }

  private hashContents(contents: string) {
    return createHash("sha256").update(contents).digest("hex");
  }

  private stableStringify(input: any): string {
    if (input === null || typeof input !== "object") {
      return JSON.stringify(input);
    }

    if (Array.isArray(input)) {
      return `[${input.map((item) => this.stableStringify(item)).join(",")}]`;
    }

    const keys = Object.keys(input).sort();
    const entries = keys.map(
      (key) => `${JSON.stringify(key)}:${this.stableStringify(input[key])}`,
    );

    return `{${entries.join(",")}}`;
  }

  private normalizeRecord(record: any) {
    const ownerName =
      record?.owner_name ||
      record?.ownerName ||
      record?.owner ||
      [
        record?.owner1FirstName || record?.owner_first_name,
        record?.owner1LastName || record?.owner_last_name,
      ]
        .filter(Boolean)
        .join(" ") ||
      null;

    const address =
      record?.address ||
      record?.property_address ||
      record?.mailing_address ||
      record?.property?.address ||
      null;

    return {
      property: {
        externalId:
          record?.id ||
          record?.propertyId ||
          record?.property_id ||
          record?.apn ||
          null,
        address,
        city: record?.city || address?.city || null,
        state: record?.state || address?.state || null,
        zip: record?.zip || address?.zip || null,
      },
      contact: {
        name: ownerName,
        phone: record?.phone || null,
        email: record?.email || null,
      },
      raw: record,
    };
  }
}
