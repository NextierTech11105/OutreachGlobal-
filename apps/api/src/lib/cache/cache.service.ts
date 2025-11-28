import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "./cache.constants";
import Redis from "ioredis";
import { differenceInMilliseconds } from "date-fns";

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cache: Redis) {}

  async get<T = any>(key: string): Promise<T | undefined> {
    const result = await this.cache.get(key);
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

  set<T = any>(key: string, value: T, ttl?: number | Date) {
    const serializedValue = JSON.stringify({ value });
    if (typeof ttl === "number") {
      return this.cache.set(key, serializedValue, "PX", ttl);
    }

    if (typeof ttl === "object") {
      return this.cache.set(key, serializedValue, "PX", this.getTTL(ttl));
    }

    return this.cache.set(key, serializedValue);
  }

  async del(key: string) {
    await this.cache.del(key);
  }
}
