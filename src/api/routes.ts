// backend/src/api/routes.ts

import { Router, Request, Response } from 'express';
import { store }         from '../scanner/store.js';
import { executeScan }   from '../scanner/scheduler.js';
import { NIFTY500_TICKERS } from '../utils/universe.js';
import { logger }        from '../utils/logger.js';

export const router = Router();

// ── GET /api/status ────────────────────────────────────────────────
// Returns scanner running state, last/next scan time
router.get('/status', (_req: Request, res: Response) => {
  res.json(store.getStatus());
});

// ── GET /api/scan ──────────────────────────────────────────────────
// Returns latest scan result (multi-year + 52wk breakouts)
router.get('/scan', (_req: Request, res: Response) => {
  const result = store.getLatest();
  if (!result) {
    return res.status(404).json({
      error: 'No scan results yet. POST /api/scan to trigger one.',
    });
  }

  const allBullish = [
    ...result.multiYearBreakouts,
    ...result.week52Breakouts,
    ...(result.week52LowBreakouts ?? []),
  ];

  return res.json({
    scanDate:      result.scanDate,
    scanTimestamp: result.scanTimestamp,
    totalScanned:  result.totalScanned,
    durationMs:    result.durationMs,
    counts: {
      total:      allBullish.length,
      multiYear:  result.multiYearBreakouts.length,
      week52:     result.week52Breakouts.length,
      week52Low:  result.week52LowBreakouts?.length ?? 0,
    },
    all:        allBullish,
    multiYear:  result.multiYearBreakouts,
    week52:     result.week52Breakouts,
    week52Low:  result.week52LowBreakouts ?? [],
    errors:     result.errors,
    status:     store.getStatus(),
  });
});

// ── POST /api/scan ─────────────────────────────────────────────────
// Triggers a fresh scan immediately (async, returns 202)
router.post('/scan', async (req: Request, res: Response) => {
  if (store.getStatus().running) {
    return res.status(409).json({ error: 'Scan already in progress' });
  }

  // Optional: scan a subset of tickers via body
  const tickers: string[] = req.body?.tickers ?? NIFTY500_TICKERS;

  // Kick off async — don't await
  executeScan(tickers).catch(err =>
    logger.error(`Scan error: ${err?.message}`)
  );

  return res.status(202).json({
    message:      'Scan started',
    totalTickers: tickers.length,
  });
});

// ── GET /api/52wk-low ──────────────────────────────────────────────
// Returns 52-week low stocks filtered to those that broke down within
// the last ?days=N trading days (default 7, max 30)
router.get('/52wk-low', (req: Request, res: Response) => {
  const result = store.getLatest();
  if (!result) return res.status(404).json({ error: 'No scan data available' });

  const days = Math.min(30, Math.max(1, parseInt(String(req.query.days ?? '7'), 10) || 7));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const filtered = (result.week52LowBreakouts ?? []).filter(s => {
    if (!s.breakoutDate) return true; // no date info (older scan) — include all
    return new Date(s.breakoutDate) >= cutoff;
  });

  return res.json({
    days,
    cutoff:   cutoff.toISOString().split('T')[0],
    total:    result.week52LowBreakouts?.length ?? 0,
    filtered: filtered.length,
    stocks:   filtered,
  });
});

// ── GET /api/history ───────────────────────────────────────────────
// Returns summary of last 30 scans
router.get('/history', (_req: Request, res: Response) => {
  const history = store.getHistory().map(r => ({
    scanDate:      r.scanDate,
    scanTimestamp: r.scanTimestamp,
    totalScanned:  r.totalScanned,
    multiYear:     r.multiYearBreakouts.length,
    week52:        r.week52Breakouts.length,
    week52Low:     r.week52LowBreakouts?.length ?? 0,
    total:         r.multiYearBreakouts.length + r.week52Breakouts.length + (r.week52LowBreakouts?.length ?? 0),
    durationMs:    r.durationMs,
  }));

  res.json(history);
});

// ── GET /api/ticker/:symbol ────────────────────────────────────────
// Returns the breakout detail for a single ticker from the latest scan
router.get('/ticker/:symbol', (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  const result = store.getLatest();
  if (!result) return res.status(404).json({ error: 'No scan data available' });

  const all = [...result.multiYearBreakouts, ...result.week52Breakouts, ...(result.week52LowBreakouts ?? [])];
  const match = all.find(b => b.ticker === symbol || b.ticker === `${symbol}.NS`);
  if (!match) return res.status(404).json({ error: `${symbol} not in current breakouts` });

  return res.json(match);
});
