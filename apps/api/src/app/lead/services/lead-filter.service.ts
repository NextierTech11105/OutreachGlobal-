import { Inject, Injectable, Logger } from "@nestjs/common";
import { SaveLeadPresetDto } from "@nextier/dto";
import Redis from "ioredis";
import { LeadRepository } from "../repositories/lead.repository";
import { CACHE_MANAGER } from "@/lib/cache/cache.constants";

type Config = SaveLeadPresetDto["config"];

@Injectable()
export class LeadFilterService {
  private readonly logger = new Logger(LeadFilterService.name);
  private readonly BATCH_SIZE = 1000;
  private readonly REDIS_TTL = 300; // 5 minutes

  constructor(
    @Inject(CACHE_MANAGER) private redis: Redis,
    private repository: LeadRepository,
  ) {}

  /**
   * Main method to process leads in batches with Redis deduplication
   */
  async processBatches(teamId: string, leads: any[], config: Config) {
    this.logger.log(
      `Processing ${leads.length} leads with strategy: ${config.strategy}`,
    );

    const chunks = this.chunkArray(leads, this.BATCH_SIZE);
    const result = {
      totalProcessed: 0,
      duplicatesFiltered: 0,
      savedToDatabase: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < chunks.length; i++) {
      try {
        const batchResult = await this.processBatch(teamId, chunks[i], config);
        this.accumulateResults(result, batchResult);

        // this.logger.debug(`Batch ${i + 1}/${chunks.length} completed`);
        await this.delay(50); // Prevent overwhelming Redis/DB
      } catch (error: any) {
        // this.logger.error(`Batch ${i + 1} failed:`, error.message);
        result.errors.push(`Batch ${i + 1}: ${error.message}`);
      }
    }

    this.logger.log(
      `Processing completed: ${result.savedToDatabase} leads saved`,
    );
    return result;
  }

  /**
   * Process a single batch of leads
   */
  private async processBatch(teamId: string, leads: any[], config: Config) {
    const normalizedLeads = this.normalizeLeads(leads);
    const deduplicatedLeads = this.applyDeduplicationStrategy(
      normalizedLeads,
      config,
    );
    const filteredLeads = this.applyFilters(deduplicatedLeads, config);
    const newLeads = await this.filterWithRedis(teamId, filteredLeads);

    let savedCount = 0;
    if (newLeads.length > 0) {
      await this.saveToDatabase(teamId, newLeads);
      await this.markEmailsInRedis(teamId, newLeads);
      savedCount = newLeads.length;
    }

    return {
      totalProcessed: leads.length,
      duplicatesFiltered: leads.length - newLeads.length,
      savedToDatabase: savedCount,
      errors: [] as string[],
    };
  }

  /**
   * Use Redis to filter out existing emails
   */
  private async filterWithRedis(teamId: string, leads: any[]): Promise<any[]> {
    if (leads.length === 0) return leads;

    const pipeline = this.redis.pipeline();
    const emailKeys = leads.map((lead) => this.getEmailKey(teamId, lead.email));

    emailKeys.forEach((key) => pipeline.exists(key));
    const results = await pipeline.exec();

    return leads.filter((_, index) => results![index][1] === 0);
  }

  /**
   * Mark emails as processed in Redis
   */
  private async markEmailsInRedis(teamId: string, leads: any[]): Promise<void> {
    if (leads.length === 0) return;

    const pipeline = this.redis.pipeline();
    leads.forEach((lead) => {
      const key = this.getEmailKey(teamId, lead.email);
      pipeline.setex(key, this.REDIS_TTL, "1");
    });

    await pipeline.exec();
  }

  /**
   * Normalize lead data
   */
  private normalizeLeads(leads: any[]): any[] {
    return leads
      .filter((lead) => this.isValidEmail(lead.email))
      .map((lead) => ({
        ...lead,
        email: lead.email.toLowerCase().trim(),
        title: lead.title?.toLowerCase().trim(),
        name: lead.name?.trim(),
        domain: this.extractDomain(lead.email),
      }));
  }

  /**
   * Apply deduplication strategy
   */
  private applyDeduplicationStrategy(
    leads: any[],
    config: Record<string, any>,
  ): any[] {
    const strategies = {
      email_only: () => this.deduplicateByEmail(leads),
      email_and_title: () => this.deduplicateByEmailAndTitle(leads, config),
      priority_prefix: () => this.deduplicateByPriorityPrefix(leads, config),
      one_per_title: () => this.deduplicateOnePerTitle(leads, config),
    };

    return (
      strategies[config.strategy as keyof typeof strategies]?.() ||
      this.deduplicateByEmail(leads)
    );
  }

  /**
   * Apply domain and count filters
   */
  private applyFilters(leads: any[], config: Config): any[] {
    let filtered = this.filterExcludedDomains(leads, config.excludedDomains);
    filtered = this.applyEmailsPerDomainLimit(filtered, config.emailsPerDomain);
    return filtered;
  }

  /**
   * Save leads to database
   */
  private async saveToDatabase(teamId: string, leads: any[]): Promise<void> {
    if (leads.length) {
      await this.repository.insertMany(leads);
    }
  }

  // Deduplication strategies
  private deduplicateByEmail(leads: any[]): any[] {
    const emailMap = new Map<string, any>();
    leads.forEach((lead) => {
      if (!emailMap.has(lead.email)) {
        emailMap.set(lead.email, lead);
      }
    });
    return Array.from(emailMap.values());
  }

  private deduplicateByEmailAndTitle(
    leads: any[],
    config: Record<string, any>,
  ): any[] {
    if (!config.respectTitles || !config.selectedTitles?.length) {
      return this.deduplicateByEmail(leads);
    }

    const emailMap = new Map<string, any>();
    const selectedTitles = new Set(
      config.selectedTitles.map((t) => t.toLowerCase()),
    );

    leads.forEach((lead) => {
      const hasSelectedTitle = lead.title && selectedTitles.has(lead.title);
      const existing = emailMap.get(lead.email);

      if (!existing) {
        emailMap.set(lead.email, lead);
      } else if (
        hasSelectedTitle &&
        !selectedTitles.has(existing.title || "")
      ) {
        emailMap.set(lead.email, lead);
      }
    });

    return Array.from(emailMap.values());
  }

  private deduplicateByPriorityPrefix(
    leads: any[],
    config: Record<string, any>,
  ): any[] {
    if (!config.priorityPrefixes?.length) {
      return this.deduplicateByEmail(leads);
    }

    const domainMap = new Map<string, any>();
    const priorities = config.priorityPrefixes.map((p) => p.toLowerCase());

    leads.forEach((lead) => {
      const domain = lead.domain!;
      const prefix = lead.email.split("@")[0].toLowerCase();
      const existing = domainMap.get(domain);

      if (!existing) {
        domainMap.set(domain, lead);
      } else {
        const currentPriority = this.getPrefixPriority(prefix, priorities);
        const existingPriority = this.getPrefixPriority(
          existing.email.split("@")[0],
          priorities,
        );

        if (currentPriority < existingPriority) {
          domainMap.set(domain, lead);
        }
      }
    });

    return Array.from(domainMap.values());
  }

  private deduplicateOnePerTitle(
    leads: any[],
    config: Record<string, any>,
  ): any[] {
    if (!config.onePerTitle || !config.selectedTitles?.length) {
      return this.deduplicateByEmail(leads);
    }

    const titleMap = new Map<string, any>();
    const selectedTitles = new Set(
      config.selectedTitles.map((t) => t.toLowerCase()),
    );
    const otherLeads: any[] = [];

    leads.forEach((lead) => {
      if (lead.title && selectedTitles.has(lead.title)) {
        if (!titleMap.has(lead.title)) {
          titleMap.set(lead.title, lead);
        }
      } else {
        otherLeads.push(lead);
      }
    });

    return [
      ...Array.from(titleMap.values()),
      ...this.deduplicateByEmail(otherLeads),
    ];
  }

  // Filter methods
  private filterExcludedDomains(
    leads: any[],
    excludedDomains?: string[] | null,
  ): any[] {
    if (!excludedDomains?.length) return leads;

    const excluded = new Set(excludedDomains.map((d) => d.toLowerCase()));
    return leads.filter((lead) => !excluded.has(lead.domain!));
  }

  private applyEmailsPerDomainLimit(leads: any[], limit: number): any[] {
    const domainGroups = new Map<string, any[]>();

    leads.forEach((lead) => {
      const domain = lead.domain!;
      if (!domainGroups.has(domain)) {
        domainGroups.set(domain, []);
      }
      domainGroups.get(domain)!.push(lead);
    });

    const result: any[] = [];
    domainGroups.forEach((domainLeads) => {
      result.push(...domainLeads.slice(0, limit));
    });

    return result;
  }

  // Utility methods
  private getEmailKey(teamId: string, email: string): string {
    return `temp_dedup:${teamId}:email:${email.toLowerCase().trim()}`;
  }

  private extractDomain(email: string): string {
    return email.split("@")[1]?.toLowerCase() || "";
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private getPrefixPriority(prefix: string, priorities: string[]): number {
    const index = priorities.findIndex((p) => prefix.startsWith(p));
    return index === -1 ? priorities.length : index;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private accumulateResults(total: any, batch: any): void {
    total.totalProcessed += batch.totalProcessed;
    total.duplicatesFiltered += batch.duplicatesFiltered;
    total.savedToDatabase += batch.savedToDatabase;
    total.errors.push(...batch.errors);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
