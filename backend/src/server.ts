import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadEnv } from '#config/env.js';
import { errorHandler } from '#middleware/error.js';
import { authMiddleware } from '#middleware/auth.js';
import { slikRoutes } from '#routes/slik.js';
import { skoringRoutes } from '#routes/skoring.js';
import { parameterRoutes } from '#routes/parameter.js';

async function buildServer() {
  const env = loadEnv();
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });

  app.setErrorHandler(errorHandler);

  await app.register(cors, {
    origin: env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()),
  });

  app.get('/health', async () => ({ status: 'ok', env: env.APP_ENV }));

  app.register(async function authRoutes(fastify) {
    fastify.post('/api/auth/login', async (req, reply) => {
      return reply.status(501).send({ error: 'BELUM_DIIMPLEMENTASI', message: 'Endpoint login akan diimplementasikan di PR berikutnya' });
    });

    fastify.get('/api/auth/me', { preHandler: authMiddleware }, async (req) => {
      const user = (req as any).user;
      return { id: user.id, username: user.username, peran: user.peran };
    });
  });

  app.register(slikRoutes);
  app.register(skoringRoutes);
  app.register(parameterRoutes);

  return app;
}

const start = async () => {
  const app = await buildServer();
  const env = loadEnv();
  const port = Number(process.env.PORT) || env.PORT;
  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Backend listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
