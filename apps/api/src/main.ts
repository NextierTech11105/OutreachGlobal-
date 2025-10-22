import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app/app.module";

const PORT = parseInt(process.env.PORT || "3001", 10);

const ONE_HUNDRED_MB = 100 * 1024 * 1024;

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter({
    disableRequestLogging: process.env.APP_ENV === "production",
    bodyLimit: ONE_HUNDRED_MB,
  });

  // Add CORS hook at Fastify level - runs before NestJS
  fastifyAdapter.getInstance().addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin || '*';
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Credentials', 'true');
    reply.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (request.method === 'OPTIONS') {
      reply.status(204).send();
    }
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
