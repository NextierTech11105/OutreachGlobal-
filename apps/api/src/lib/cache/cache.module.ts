import { Global, Module } from "@nestjs/common";
import { CacheService } from "./cache.service";
import Redis from "ioredis";
import { CACHE_MANAGER } from "./cache.constants";

@Global()
@Module({
  providers: [
    CacheService,
    {
      provide: CACHE_MANAGER,
      useFactory: () => {
        const redis = new Redis(process.env.REDIS_URL as string, {
          keyPrefix: "nextier:",
        });

        return redis;
      },
    },
  ],
  exports: [CacheService, CACHE_MANAGER],
})
export class CacheModule {}
