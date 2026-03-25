// backend/src/scanner/fetcher.ts
// Fetches real OHLCV data from Yahoo Finance via yahoo-finance2

import YahooFinance from 'yahoo-finance2';
import { OHLCVBar } from '../types/index.js';
import { logger } from '../utils/logger.js';

const yf = new YahooFinance();

export interface TickerMeta {
  companyName: string;
  sector:      string;
  marketCap:   number;
}

/**
 * Fetch historical daily OHLCV bars for a ticker.
 * Returns null if the ticker has insufficient data or fetch fails.
 */
export async function fetchHistory(
  ticker: string,
  lookbackYears: number
): Promise<OHLCVBar[] | null> {
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - lookbackYears - 0.2); // small buffer

  try {
    const result = await yf.chart(ticker, {
      period1: period1.toISOString().split('T')[0],
      interval: '1d',
    });

    const rows = result.quotes;
    if (!rows || rows.length < 252) return null; // need ≥1 year

    return rows.map(r => ({
      date:   r.date,
      open:   r.open   ?? 0,
      high:   r.high   ?? 0,
      low:    r.low    ?? 0,
      close:  r.close  ?? 0,
      volume: r.volume ?? 0,
    }));
  } catch (err: any) {
    // Re-throw rate limit errors so fetchBatch's retry logic can handle them
    if (err?.message?.includes('Too Many Requests') || err?.message?.includes('429')) {
      throw err;
    }
    logger.warn(`fetchHistory(${ticker}): ${err?.message ?? err}`);
    return null;
  }
}

/**
 * Fetch ticker metadata (name, sector, market cap) from Yahoo quote.
 */
export async function fetchMeta(ticker: string): Promise<TickerMeta> {
  try {
    const q = await yf.quote(ticker);
    return {
      companyName: q.longName ?? q.shortName ?? ticker,
      sector:      (q as any).sector ?? 'Unknown',
      marketCap:   q.marketCap ?? 0,
    };
  } catch {
    return { companyName: ticker, sector: 'Unknown', marketCap: 0 };
  }
}

/**
 * Fetch many tickers concurrently, respecting a concurrency limit.
 */
export async function fetchBatch<T>(
  tickers:     string[],
  fn:          (ticker: string) => Promise<T>,
  concurrency: number,
  onProgress?: (done: number, total: number, ticker: string) => void
): Promise<Map<string, T>> {
  const results = new Map<string, T>();
  let cursor = 0;

  async function withRetry(ticker: string, maxRetries = 3): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(ticker);
      } catch (err: any) {
        const isRateLimit = err?.message?.includes('Too Many Requests') || err?.message?.includes('429');
        if (isRateLimit && attempt < maxRetries) {
          const delay = 10000 * Math.pow(2, attempt); // 10s, 20s, 40s
          logger.warn(`Rate limited on ${ticker}, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
    throw new Error(`Exhausted retries for ${ticker}`);
  }

  async function worker(workerIdx: number) {
    while (cursor < tickers.length) {
      const idx    = cursor++;
      const ticker = tickers[idx];
      // Stagger workers so they don't fire at the same instant
      if (idx === 0) await new Promise(r => setTimeout(r, workerIdx * 2000));
      const result = await withRetry(ticker);
      results.set(ticker, result);
      onProgress?.(results.size, tickers.length, ticker);
      await new Promise(r => setTimeout(r, 6000));
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i));
  await Promise.all(workers);
  return results;
}
