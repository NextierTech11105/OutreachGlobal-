import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app/app.module";
import fastifyCors from "@fastify/cors";

const PORT = parseInt(process.env.PORT || "3001", 10);

const ONE_HUNDRED_MB = 100 * 1024 * 1024;

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter({
    disableRequestLogging: process.env.APP_ENV === "production",
    bodyLimit: ONE_HUNDRED_MB,
  });

  // Register CORS at Fastify level BEFORE NestJS
  await fastifyAdapter.register(fastifyCors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    { rawBody: true },
  );

  app.enableShutdownHooks();

  await app.listen(PORT, "0.0.0.0");
  return app;
}

bootstrap()
  .then(() => console.log(`Server running on http://localhost:${PORT}`))
  .catch((err) => console.error("Application startup failed", err));
