// backend/src/index.ts

import 'dotenv/config';
import express         from 'express';
import cors            from 'cors';
import helmet          from 'helmet';
import compression     from 'compression';
import path            from 'path';
import fs              from 'fs';
import { router }      from './api/routes.js';
import { startScheduler, executeScan } from './scanner/scheduler.js';
import { logger }      from './utils/logger.js';

// ── Ensure logs dir ────────────────────────────────────────────────
fs.mkdirSync('logs',    { recursive: true });
fs.mkdirSync('results', { recursive: true });

// ── Express setup ──────────────────────────────────────────────────
const app  = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression() as any);
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '1mb' }));

// ── API routes ─────────────────────────────────────────────────────
app.use('/api', router);

// ── Serve Vite production build (when deployed) ────────────────────
const distPath = path.resolve('../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  logger.info(`Serving frontend from ${distPath}`);
}

// ── Health check ───────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── Start ──────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`BreakoutRadar backend running on http://0.0.0.0:${PORT}`);
});

// ── Cron scheduler ─────────────────────────────────────────────────
startScheduler();

// ── Run an initial scan on startup (if no cached data exists) ──────
const SCAN_ON_BOOT = process.env.SCAN_ON_BOOT !== 'false';
if (SCAN_ON_BOOT) {
  logger.info('Running initial scan on startup…');
  executeScan().catch(err => logger.error(`Boot scan failed: ${err?.message}`));
}

export default app;
