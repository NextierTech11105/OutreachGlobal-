import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app/app.module";

const PORT = parseInt(process.env.PORT || "3001", 10);

const ONE_HUNDRED_MB = 100 * 1024 * 1024;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      disableRequestLogging: process.env.APP_ENV === "production",
      bodyLimit: ONE_HUNDRED_MB,
    }),
    { rawBody: true },
  );

  // CORS is handled by CorsMiddleware in AppModule
  app.enableShutdownHooks();

  await app.listen(PORT, "0.0.0.0");
  return app;
}

bootstrap()
  .then(() => console.log(`Server running on http://localhost:${PORT}`))
  .catch((err) => console.error("Application startup failed", err));
