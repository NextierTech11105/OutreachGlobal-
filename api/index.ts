import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Dynamically import the bootstrap function
  const { bootstrap } = await import('../apps/api/src/main');

  const app = await bootstrap();
  await app.ready();

  // @ts-ignore - Pass request to Fastify handler
  app.getHttpAdapter().getInstance().handler(req, res);
}
