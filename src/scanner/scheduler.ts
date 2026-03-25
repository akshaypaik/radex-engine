// backend/src/scanner/scheduler.ts
// Triggers daily scans on a cron schedule (Mon–Fri after market close).

import cron from 'node-cron';
import { runScan }       from './engine.js';
import { store }         from './store.js';
import { NIFTY500_TICKERS, DEFAULT_CONFIG } from '../utils/universe.js';
import { logger }        from '../utils/logger.js';

// NSE/BSE closes at 15:30 IST = 10:00 UTC
// We scan at 16:00 IST = 10:30 UTC (Monday–Friday)
const CRON_SCHEDULE = process.env.SCAN_CRON ?? '30 10 * * 1-5';

export function startScheduler() {
  // Calculate and store next scheduled run
  const job = cron.schedule(CRON_SCHEDULE, async () => {
    logger.info('Scheduled scan triggered');
    await executeScan();
  }, { timezone: 'Asia/Kolkata' });

  logger.info(`Scheduler started — cron: "${CRON_SCHEDULE}" (IST)`);
  return job;
}

export async function executeScan(tickers = NIFTY500_TICKERS) {
  if (store.getStatus().running) {
    logger.warn('Scan already running — skipping');
    return null;
  }

  store.setRunning(true);
  try {
    const config = {
      ...DEFAULT_CONFIG,
      volumeSurgeThreshold:   Number(process.env.VOL_SURGE_THRESHOLD   ?? DEFAULT_CONFIG.volumeSurgeThreshold),
      minResistanceTouches:   Number(process.env.MIN_RESIST_TOUCHES     ?? DEFAULT_CONFIG.minResistanceTouches),
      resistanceTolerancePct: Number(process.env.RESIST_TOLERANCE_PCT   ?? DEFAULT_CONFIG.resistanceTolerancePct),
      multiYearLookbackYears: Number(process.env.MULTI_YEAR_LOOKBACK    ?? DEFAULT_CONFIG.multiYearLookbackYears),
      minBreakoutPct:         Number(process.env.MIN_BREAKOUT_PCT        ?? DEFAULT_CONFIG.minBreakoutPct),
      maxConcurrent:          Number(process.env.MAX_CONCURRENT          ?? DEFAULT_CONFIG.maxConcurrent),
    };

    const result = await runScan(tickers, config);
    store.setResult(result);
    return result;
  } finally {
    store.setRunning(false);
  }
}
