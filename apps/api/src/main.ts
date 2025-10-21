import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app/app.module";
const PORT = parseInt(process.env.PORT || "3001", 10);

const ONE_HUNDRED_MB = 100 * 1024 * 1024;

export async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      disableRequestLogging: process.env.APP_ENV === "production",
      bodyLimit: ONE_HUNDRED_MB,
    }),
    { rawBody: true },
  );

  app.enableCors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.enableShutdownHooks();

  // Only listen on port if not running as serverless function
  if (!process.env.VERCEL) {
    await app.listen(PORT, "0.0.0.0");
  } else {
    await app.init();
  }

  return app;
}

// Only run bootstrap if not imported as a module
if (require.main === module) {
  bootstrap()
    .then(() => console.log(`Server running on http://localhost:${PORT}`))
    .catch((err) => console.error("Application startup failed", err));
}
