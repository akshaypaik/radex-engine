// backend/src/scanner/indicators.ts

import { OHLCVBar } from '../types/index.js';

/** Simple 14-period RSI */
export function rsi14(bars: OHLCVBar[]): number {
  if (bars.length < 15) return 50;
  const closes = bars.map(b => b.close);
  let gains = 0, losses = 0;

  for (let i = 1; i <= 14; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains  += diff;
    else          losses -= diff;
  }

  let avgGain = gains  / 14;
  let avgLoss = losses / 14;

  for (let i = 15; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * 13 + Math.max(diff, 0))   / 14;
    avgLoss = (avgLoss * 13 + Math.max(-diff, 0))  / 14;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Rolling N-bar average volume */
export function avgVolume(bars: OHLCVBar[], window = 20): number {
  const slice = bars.slice(-window - 1, -1); // exclude today
  if (slice.length === 0) return 0;
  return slice.reduce((s, b) => s + b.volume, 0) / slice.length;
}

/** Detect local swing highs (local maxima within ±window bars) */
export function swingHighs(
  bars: OHLCVBar[],
  window = 5
): Array<{ index: number; price: number }> {
  const result: Array<{ index: number; price: number }> = [];
  const highs = bars.map(b => b.high);

  for (let i = window; i < highs.length - window; i++) {
    const local = highs.slice(i - window, i + window + 1);
    const max   = Math.max(...local);
    if (highs[i] === max) {
      result.push({ index: i, price: highs[i] });
    }
  }
  return result;
}

export interface ResistanceLevel {
  price:       number;   // average price of the cluster
  touches:     number;   // number of swing-high touches
  spanYears:   number;   // time span from first to last touch
  indices:     number[]; // bar indices of touches
}

/**
 * Find the best resistance cluster in a set of swing highs.
 * Returns the cluster with the most touches spanning ≥ 1 year.
 */
export function findResistance(
  bars:            OHLCVBar[],
  swings:          Array<{ index: number; price: number }>,
  tolerancePct:    number,
  minTouches:      number,
  currentPrice:    number
): ResistanceLevel | null {
  if (swings.length < minTouches) return null;

  let best: ResistanceLevel | null = null;

  for (const pivot of swings) {
    // Only consider resistance below / near current price
    if (pivot.price > currentPrice * 1.04) continue;

    const cluster = swings.filter(
      s =>
        Math.abs(s.price - pivot.price) / pivot.price <= tolerancePct &&
        s.price < currentPrice * 1.04
    );

    if (cluster.length < minTouches) continue;
    if (best && cluster.length <= best.touches) continue;

    const indices   = cluster.map(c => c.index);
    const spanBars  = Math.max(...indices) - Math.min(...indices);
    const spanYears = spanBars / 252;

    if (spanYears < 1.0) continue; // must span ≥ 1 year

    const avgPrice = cluster.reduce((s, c) => s + c.price, 0) / cluster.length;
    best = { price: avgPrice, touches: cluster.length, spanYears, indices };
  }

  return best;
}
