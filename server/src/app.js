import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (env.trustProxy > 0) app.set('trust proxy', env.trustProxy);

  app.use(
    helmet({
      // Only relevant when this server also serves the built React app (Google Fonts + inline styles).
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(cors({ origin: env.clientOrigins }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.use('/api', routes);
  app.use('/api', notFound);

  if (env.serveClient && existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    // Express 5 no longer accepts a bare '*' route; a terminal middleware is the SPA fallback.
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      return res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
