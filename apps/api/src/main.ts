import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app/app.module";

const PORT = parseInt(process.env.PORT || "3001", 10);
const ONE_HUNDRED_MB = 100 * 1024 * 1024;

/**
 * Get allowed CORS origins from environment
 * Defaults to localhost for development
 */
function getCorsOrigins(): string[] | true {
  const corsOrigins = process.env.CORS_ORIGINS;
  const frontendUrl = process.env.FRONTEND_URL;

  // In development, allow all origins
  if (process.env.APP_ENV === "local" || process.env.APP_ENV === "development") {
    return true;
  }

  // Build allowed origins list
  const origins: string[] = [];

  if (corsOrigins) {
    origins.push(...corsOrigins.split(",").map((o) => o.trim()));
  }

  if (frontendUrl) {
    origins.push(frontendUrl);
  }

  // Fallback for safety
  if (origins.length === 0) {
    console.warn("WARNING: No CORS origins configured. Using restrictive default.");
    return ["http://localhost:3000"];
  }

  return origins;
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      disableRequestLogging: process.env.APP_ENV === "production",
      bodyLimit: ONE_HUNDRED_MB,
    }),
    { rawBody: true },
  );

  app.enableCors({
    origin: getCorsOrigins(),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // Set global API prefix for all routes
  app.setGlobalPrefix("api", {
    exclude: ["/", "/graphql", "/version", "/setupdb", "/migrate"],
  });

  app.enableShutdownHooks();

  await app.listen(PORT, "0.0.0.0");
  return app;
}

bootstrap()
  .then(() => console.log(`Server running on http://localhost:${PORT}`))
  .catch((err) => console.error("Application startup failed", err));
