import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import {
  type GqlModuleAsyncOptions,
  type GqlOptionsFactory,
} from "@nestjs/graphql";
import { type FastifyReply, type FastifyRequest } from "fastify";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { JwtService } from "../lib/jwt/jwt.service";
import { CacheService } from "../lib/cache/cache.service";
import { CacheModule } from "../lib/cache/cache.module";
import { JSONScalar } from "./scalars/json.scalar";
import { ApolloModule } from "./apollo.module";
import { DataloaderService } from "./dataloader.service";

const ttl = 30 * 60000 * 24;

export const apolloAsyncConfig: GqlModuleAsyncOptions<
  ApolloDriverConfig,
  GqlOptionsFactory<ApolloDriverConfig>
> = {
  driver: ApolloDriver,
  imports: [ConfigModule, CacheModule, ApolloModule],
  useFactory: (
    configService: ConfigService,
    cache: CacheService,
    authService: AuthService,
    jwtService: JwtService,
    dataloaderService: DataloaderService,
  ) => {
    return {
      autoSchemaFile: true,
      resolvers: { JSON: JSONScalar },
      persistedQueries: {
        cache: {
          set: async (key, value, options) => {
            cache.set(key, value, options?.ttl ?? ttl);
          },
          get: async (key) => {
            const value = await cache.get<string>(key);
            return value as string;
          },
          delete: (key) => cache.del(key),
        },
        ttl: ttl,
      },
      formatError: (err) => {
        if (configService.get("APP_ENV") === "production") {
          return {
            message: err.message,
          };
        }

        return err;
      },
      context: async (req: FastifyRequest, res: FastifyReply) => {
        if (req.headers?.authorization) {
          try {
            const [type, token] = req.headers.authorization.split(" ") ?? [];
            if (token && type === "Bearer") {
              const { payload } = await jwtService.verify(token);
              const user = await authService.getUser(payload);

              if (user) {
                req["user"] = user;
              }
              if (payload) {
                req["tokenPayload"] = payload;
              }
            }
          } catch (error) {
            // no catch for now
          }
        }
        return {
          req,
          res,
          loaders: dataloaderService.getLoaders(),
        };
      },
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    };
  },
  inject: [
    ConfigService,
    CacheService,
    AuthService,
    JwtService,
    DataloaderService,
  ],
};
