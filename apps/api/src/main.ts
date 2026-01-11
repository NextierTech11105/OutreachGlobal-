import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app/app.module";
import { Logger } from "nestjs-pino";

const PORT = parseInt(process.env.PORT || "3001", 10);

const ONE_HUNDRED_MB = 100 * 1024 * 1024;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      disableRequestLogging: true, // Let Pino handle request logging
      bodyLimit: ONE_HUNDRED_MB,
    }),
    {
      rawBody: true,
      bufferLogs: true, // Buffer logs until Pino logger is ready
    },
  );

  // Use Pino for structured JSON logging
  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "https://monkfish-app-mb7h3.ondigitalocean.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // Set global API prefix for all routes
  app.setGlobalPrefix("api", {
    exclude: ["/", "/graphql", "/version"],
  });

  app.enableShutdownHooks();

  await app.listen(PORT, "0.0.0.0");
  return app;
}

bootstrap()
  .then(() => console.log(`Server running on http://localhost:${PORT}`))
  .catch((err) => console.error("Application startup failed", err));
