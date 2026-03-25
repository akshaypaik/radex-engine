// backend/src/scanner/store.ts
// Keeps the latest scan result in memory and persists to disk as JSON.

import fs   from 'fs';
import path from 'path';
import { ScanResult, ScanStatus } from '../types/index.js';
import { logger } from '../utils/logger.js';

const RESULTS_DIR = path.resolve('results');

export class ScanStore {
  private latest:  ScanResult | null = null;
  private history: ScanResult[]      = [];
  private running  = false;
  private nextScan: Date | null = null;

  constructor() {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    this.loadLatestFromDisk();
  }

  // ── Persistence ──────────────────────────────────────────────────

  private loadLatestFromDisk() {
    try {
      const files = fs.readdirSync(RESULTS_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length > 0) {
        const raw = fs.readFileSync(path.join(RESULTS_DIR, files[0]), 'utf-8');
        this.latest = JSON.parse(raw);
        logger.info(`Loaded cached scan from disk: ${files[0]}`);
      }

      // Load last 30 for history
      this.history = files.slice(0, 30).map(f => {
        const raw = fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8');
        return JSON.parse(raw) as ScanResult;
      });
    } catch (err) {
      logger.warn(`Could not load cached scan: ${err}`);
    }
  }

  saveToDisk(result: ScanResult) {
    const ts   = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(RESULTS_DIR, `scan_${ts}.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 2));
    logger.info(`Saved scan result: ${file}`);

    // Keep only last 30 result files
    const all = fs.readdirSync(RESULTS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    all.slice(30).forEach(f => fs.unlinkSync(path.join(RESULTS_DIR, f)));
  }

  // ── State management ─────────────────────────────────────────────

  setRunning(v: boolean)         { this.running  = v; }
  setNextScan(d: Date | null)    { this.nextScan = d; }

  setResult(result: ScanResult) {
    this.latest = result;
    this.history.unshift(result);
    if (this.history.length > 30) this.history.pop();
    this.saveToDisk(result);
  }

  // ── Getters ──────────────────────────────────────────────────────

  getLatest():  ScanResult | null { return this.latest;  }
  getHistory(): ScanResult[]      { return this.history; }

  getStatus(): ScanStatus {
    return {
      running:      this.running,
      lastScanAt:   this.latest?.scanTimestamp ?? null,
      nextScanAt:   this.nextScan?.toISOString() ?? null,
      totalScanned: this.latest?.totalScanned  ?? 0,
    };
  }
}

export const store = new ScanStore();
