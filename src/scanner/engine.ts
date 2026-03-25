// backend/src/scanner/engine.ts

import { BreakoutResult, ScannerConfig, ScanResult } from '../types/index.js';
import { fetchHistory, fetchMeta, fetchBatch }       from './fetcher.js';
import { rsi14, avgVolume, swingHighs, findResistance } from './indicators.js';
import { logger } from '../utils/logger.js';

function formatMarketCap(v: number): string {
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9)  return `₹${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `₹${(v / 1e6).toFixed(1)}M`;
  return 'N/A';
}

async function analyzeTicker(
  ticker: string,
  cfg:    ScannerConfig
): Promise<BreakoutResult[]> {
  const bars = await fetchHistory(ticker, cfg.multiYearLookbackYears);
  if (!bars || bars.length < 252) return [];

  const today        = bars[bars.length - 1];
  const currentPrice = today.close;
  const todayVol     = today.volume;
  const avgVol20     = avgVolume(bars, 20);
  if (avgVol20 === 0) return [];

  const volRatio = todayVol / avgVol20;
  const bars1y   = bars.slice(-252);
  const results: BreakoutResult[] = [];

  // ── 1. 52-week low proximity — stocks trading within 10% of their 52-week low ──
  // Use closing prices throughout for consistency (intraday wicks can distort the low)
  const MAX_LOW_LOOKBACK   = 30;
  const LOW_PROXIMITY_PCT  = 0.10; // within 10% above the 52-week low closing price counts
  const low52wkClose       = Math.min(...bars1y.slice(0, -1).map(b => b.close));

  // Find the most recent bar in the last 30 days where close was within 10% of the 52-week low close
  const recentBars = bars.slice(-MAX_LOW_LOOKBACK);
  let lowEventBar: typeof bars[0] | null = null;

  for (let i = recentBars.length - 1; i >= 0; i--) {
    const bar = recentBars[i];
    if (bar.close <= low52wkClose * (1 + LOW_PROXIMITY_PCT)) {
      lowEventBar = bar;
      break;
    }
  }

  if (lowEventBar) {
    const pctAboveLow = (lowEventBar.close - low52wkClose) / low52wkClose * 100;
    logger.info(`52wk-low HIT: ${ticker} — close=${lowEventBar.close.toFixed(2)}, 52wkLow=${low52wkClose.toFixed(2)}, pctAbove=${pctAboveLow.toFixed(1)}%, date=${lowEventBar.date}`);
    const metaLow = await fetchMeta(ticker);
    const rsiLow  = rsi14(bars);
    results.push({
      ticker,
      companyName:      metaLow.companyName,
      currentPrice,
      volumeToday:      todayVol,
      avgVolume20d:     Math.round(avgVol20),
      volumeRatio:      Math.round(volRatio * 100) / 100,
      sector:           metaLow.sector,
      marketCap:        formatMarketCap(metaLow.marketCap),
      marketCapRaw:     metaLow.marketCap,
      rsi14:            Math.round(rsiLow * 10) / 10,
      breakoutType:     '52_WEEK_LOW',
      breakoutLevel:    Math.round(low52wkClose * 100) / 100,
      pctAboveBreakout: Math.round(pctAboveLow * 100) / 100,
      breakoutDate:     lowEventBar.date instanceof Date
        ? lowEventBar.date.toISOString().split('T')[0]
        : String(lowEventBar.date).split('T')[0],
      notes: buildBearishNotes(volRatio, rsiLow),
    });
  }

  // Volume gate for bullish signals (52-week high + multi-year resistance)
  if (volRatio < cfg.volumeSurgeThreshold) return results;

  const meta   = await fetchMeta(ticker);
  const rsiVal = rsi14(bars);

  const baseFields = {
    ticker,
    companyName:  meta.companyName,
    currentPrice,
    volumeToday:  todayVol,
    avgVolume20d: Math.round(avgVol20),
    volumeRatio:  Math.round(volRatio * 100) / 100,
    sector:       meta.sector,
    marketCap:    formatMarketCap(meta.marketCap),
    marketCapRaw: meta.marketCap,
    rsi14:        Math.round(rsiVal * 10) / 10,
    notes:        buildNotes(volRatio, rsiVal),
  };

  // ── 2. 52-week high breakout ───────────────────────────────────────
  const high52wkPrev = Math.max(...bars1y.slice(0, -1).map(b => b.high));
  const pctAbove52wk = (currentPrice - high52wkPrev) / high52wkPrev * 100;

  if (currentPrice > high52wkPrev * (1 + cfg.minBreakoutPct)) {
    results.push({
      ...baseFields,
      breakoutType:     '52_WEEK_HIGH',
      breakoutLevel:    Math.round(high52wkPrev * 100) / 100,
      pctAboveBreakout: Math.round(pctAbove52wk * 100) / 100,
    });
  }

  // ── 3. Multi-year resistance breakout ─────────────────────────────
  const histBars = bars.slice(0, -1);
  const swings   = swingHighs(histBars, 5);
  const resist   = findResistance(
    histBars, swings,
    cfg.resistanceTolerancePct,
    cfg.minResistanceTouches,
    currentPrice
  );

  if (resist) {
    const pctAboveResist = (currentPrice - resist.price) / resist.price * 100;
    if (currentPrice > resist.price * (1 + cfg.minBreakoutPct)) {
      results.push({
        ...baseFields,
        breakoutType:     'MULTI_YEAR',
        breakoutLevel:    Math.round(resist.price * 100) / 100,
        pctAboveBreakout: Math.round(pctAboveResist * 100) / 100,
        resistanceYears:  Math.round(resist.spanYears * 10) / 10,
        notes: [
          `Resistance tested ${resist.touches}× over ${resist.spanYears.toFixed(1)}y`,
          ...buildNotes(volRatio, rsiVal),
        ],
      });
    }
  }

  return results;
}

function buildBearishNotes(volRatio: number, rsiVal: number): string[] {
  const notes: string[] = [];
  if      (volRatio >= 5) notes.push(`🔥 Panic volume: ${volRatio.toFixed(1)}× avg`);
  else if (volRatio >= 3) notes.push(`⚠️ Heavy selling: ${volRatio.toFixed(1)}× avg`);
  else                    notes.push(`📉 Volume surge: ${volRatio.toFixed(1)}× avg`);

  if      (rsiVal <= 30) notes.push(`RSI(14): ${rsiVal.toFixed(1)} — oversold`);
  else if (rsiVal <= 40) notes.push(`RSI(14): ${rsiVal.toFixed(1)} — bearish momentum`);
  else                   notes.push(`RSI(14): ${rsiVal.toFixed(1)}`);

  return notes;
}

function buildNotes(volRatio: number, rsiVal: number): string[] {
  const notes: string[] = [];
  if      (volRatio >= 5) notes.push(`🔥 Exceptional volume: ${volRatio.toFixed(1)}× avg`);
  else if (volRatio >= 3) notes.push(`⚡ Strong volume: ${volRatio.toFixed(1)}× avg`);
  else                    notes.push(`✅ Volume surge: ${volRatio.toFixed(1)}× avg`);

  if      (rsiVal >= 70) notes.push(`RSI(14): ${rsiVal.toFixed(1)} — overbought zone`);
  else if (rsiVal >= 60) notes.push(`RSI(14): ${rsiVal.toFixed(1)} — bullish momentum`);
  else                   notes.push(`RSI(14): ${rsiVal.toFixed(1)}`);

  return notes;
}

/** Run a full scan over the given universe */
export async function runScan(
  tickers: string[],
  cfg:     ScannerConfig
): Promise<ScanResult> {
  const startMs = Date.now();
  const scanTimestamp = new Date().toISOString();
  const scanDate      = new Date().toLocaleDateString('en-IN');
  const errors: Array<{ ticker: string; message: string }> = [];
  const allResults: BreakoutResult[] = [];

  logger.info(`Scan started — ${tickers.length} tickers, concurrency=${cfg.maxConcurrent}`);

  await fetchBatch(
    tickers,
    async (ticker) => {
      try {
        const res = await analyzeTicker(ticker, cfg);
        allResults.push(...res);
      } catch (err: any) {
        errors.push({ ticker, message: err?.message ?? String(err) });
        logger.warn(`Error(${ticker}): ${err?.message}`);
      }
    },
    cfg.maxConcurrent,
    (n, total, ticker) => {
      if (n % 20 === 0 || n === total) {
        logger.info(`Progress: ${n}/${total} — last: ${ticker}`);
      }
    }
  );

  const multiYearBreakouts = allResults
    .filter(r => r.breakoutType === 'MULTI_YEAR')
    .sort((a, b) => b.volumeRatio - a.volumeRatio);

  const week52Breakouts = allResults
    .filter(r => r.breakoutType === '52_WEEK_HIGH')
    .sort((a, b) => b.volumeRatio - a.volumeRatio);

  const week52LowBreakouts = allResults
    .filter(r => r.breakoutType === '52_WEEK_LOW')
    .sort((a, b) => b.volumeRatio - a.volumeRatio);

  const durationMs = Date.now() - startMs;
  logger.info(
    `Scan complete — multi-year: ${multiYearBreakouts.length}, 52wk-high: ${week52Breakouts.length}, ` +
    `52wk-low: ${week52LowBreakouts.length}, errors: ${errors.length}, time: ${(durationMs / 1000).toFixed(1)}s`
  );

  return {
    scanDate,
    scanTimestamp,
    totalScanned:        tickers.length,
    multiYearBreakouts,
    week52Breakouts,
    week52LowBreakouts,
    durationMs,
    errors,
  };
}
