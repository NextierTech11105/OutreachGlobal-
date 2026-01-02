import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "./cache.constants";
import Redis from "ioredis";
import { differenceInMilliseconds } from "date-fns";

export interface CacheOptions {
  teamId?: string;
}

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cache: Redis) {}

  private prefixKey(key: string, teamId?: string): string {
    return teamId ? `team:${teamId}:${key}` : key;
  }

  async get<T = any>(
    key: string,
    options?: CacheOptions,
  ): Promise<T | undefined> {
    const prefixedKey = this.prefixKey(key, options?.teamId);
    const result = await this.cache.get(prefixedKey);
    if (!result) {
      return undefined;
    }

    const json = JSON.parse(result);
    return json.value;
  }

  private getTTL(date: Date) {
    const diffInMs = differenceInMilliseconds(date, new Date());
    return diffInMs;
  }

  set<T = any>(
    key: string,
    value: T,
    ttl?: number | Date,
    options?: CacheOptions,
  ) {
    const prefixedKey = this.prefixKey(key, options?.teamId);
    const serializedValue = JSON.stringify({ value });
    if (typeof ttl === "number") {
      return this.cache.set(prefixedKey, serializedValue, "PX", ttl);
    }

    if (typeof ttl === "object") {
      return this.cache.set(
        prefixedKey,
        serializedValue,
        "PX",
        this.getTTL(ttl),
      );
    }

    return this.cache.set(prefixedKey, serializedValue);
  }

  async del(key: string, options?: CacheOptions) {
    const prefixedKey = this.prefixKey(key, options?.teamId);
    await this.cache.del(prefixedKey);
  }
}
