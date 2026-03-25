// backend/src/types/index.ts

export interface OHLCVBar {
  date:   Date;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

export type BreakoutType = 'MULTI_YEAR' | '52_WEEK_HIGH' | '52_WEEK_LOW';

export interface BreakoutResult {
  ticker:           string;
  companyName:      string;
  breakoutType:     BreakoutType;
  currentPrice:     number;
  breakoutLevel:    number;
  volumeToday:      number;
  avgVolume20d:     number;
  volumeRatio:      number;
  resistanceYears?: number;
  pctAboveBreakout: number;
  sector:           string;
  marketCap:        string;
  marketCapRaw:     number;
  rsi14:            number;
  notes:            string[];
  breakoutDate?:    string; // ISO date string — only set for 52_WEEK_LOW
}

export interface ScanResult {
  scanDate:            string;
  scanTimestamp:       string;
  totalScanned:        number;
  multiYearBreakouts:  BreakoutResult[];
  week52Breakouts:     BreakoutResult[];
  week52LowBreakouts:  BreakoutResult[];
  durationMs:          number;
  errors:              Array<{ ticker: string; message: string }>;
}

export interface ScanStatus {
  running:        boolean;
  lastScanAt:     string | null;
  nextScanAt:     string | null;
  totalScanned:   number;
}

export interface ScannerConfig {
  volumeSurgeThreshold:    number;
  minResistanceTouches:    number;
  resistanceTolerancePct:  number;
  multiYearLookbackYears:  number;
  minBreakoutPct:          number;
  maxConcurrent:           number;
}
