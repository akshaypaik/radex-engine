// backend/src/utils/universe.ts
// All NSE tickers suffixed with .NS for yahoo-finance2

export const NIFTY500_TICKERS: string[] = [
  // Nifty 50 ─────────────────────────────────────────────────
  'RELIANCE.NS','TCS.NS','HDFCBANK.NS','ICICIBANK.NS','INFY.NS',
  'HINDUNILVR.NS','ITC.NS','SBIN.NS','BHARTIARTL.NS','KOTAKBANK.NS',
  'BAJFINANCE.NS','MARUTI.NS','AXISBANK.NS','LT.NS','TITAN.NS',
  'ASIANPAINT.NS','SUNPHARMA.NS','NESTLEIND.NS','ULTRACEMCO.NS','WIPRO.NS',
  'TECHM.NS','HCLTECH.NS','POWERGRID.NS','NTPC.NS','ONGC.NS',
  'JSWSTEEL.NS','TATASTEEL.NS','ADANIENT.NS','ADANIPORTS.NS','COALINDIA.NS',
  'DIVISLAB.NS','DRREDDY.NS','CIPLA.NS','EICHERMOT.NS','BAJAJ-AUTO.NS',
  'HEROMOTOCO.NS','BPCL.NS','GRASIM.NS','TATACONSUM.NS','INDUSINDBK.NS',
  'LTIM.NS','TATAELXSI.NS','TATAPOWER.NS','TATAMOTORS.NS','HINDALCO.NS',
  'BRITANNIA.NS','APOLLOHOSP.NS','BAJAJFINSV.NS','SBILIFE.NS','HDFCLIFE.NS',

  // Nifty Midcap / IT ─────────────────────────────────────────
  'MUTHOOTFIN.NS','PIIND.NS','PERSISTENT.NS','COFORGE.NS','LTTS.NS',
  'DIXON.NS','KPITTECH.NS','ZOMATO.NS','POLICYBZR.NS','NYKAA.NS',
  'PAYTM.NS','ANGELONE.NS','AAVAS.NS','HOMEFIRST.NS','FIVESTAR.NS',
  'CREDITACC.NS','SPANDANA.NS','ALKYLAMINE.NS','AARTI.NS','DEEPAKNITR.NS',
  'NAVINFLUOR.NS','FLUOROCHEM.NS','GRINDWELL.NS','CARBORUNIV.NS',
  'ASTRAL.NS','SUPREMEIND.NS','PRINCEPIPE.NS','ABCAPITAL.NS','MFSL.NS',
  'ICICIPRULI.NS','STARHEALTH.NS','GICRE.NS','NIACL.NS','ICICIGI.NS',

  // Chemicals / Pharma ────────────────────────────────────────
  'TIINDIA.NS','SOLARINDS.NS','ZYDUSLIFE.NS','TORNTPHARM.NS','ALKEM.NS',
  'AUROPHARMA.NS','GRANULES.NS','LAURUSLABS.NS','IPCALAB.NS',
  'KALYANKJIL.NS','SENCO.NS','CAMPUS.NS','METROBRAND.NS','BATA.NS',
  'RELAXO.NS','VIPIND.NS',

  // PSU / Infra ────────────────────────────────────────────────
  'BEL.NS','HAL.NS','BHEL.NS','GAIL.NS','IOC.NS','HINDPETRO.NS',
  'CANBK.NS','PNB.NS','BANKBARODA.NS','UNIONBANK.NS','FEDERALBNK.NS',
  'IDFCFIRSTB.NS','BANDHANBNK.NS','RBLBANK.NS',

  // Metals / Mining ────────────────────────────────────────────
  'SAIL.NS','NMDC.NS','NATIONALUM.NS','HINDZINC.NS','VEDL.NS',
  'MOIL.NS','GMRINFRA.NS','IRB.NS','ASHOKA.NS','KEC.NS',

  // Auto / EV ──────────────────────────────────────────────────
  'M&M.NS','TVSMOTOR.NS','BAJAJHLDNG.NS','EXIDEIND.NS','AMARAJABAT.NS',
  'MOTHERSON.NS','BOSCHLTD.NS','BHARATFORG.NS','ENDURANCE.NS','SUNDRMFAST.NS',

  // FMCG / Consumer ────────────────────────────────────────────
  'DABUR.NS','MARICO.NS','GODREJCP.NS','COLPAL.NS','EMAMILTD.NS',
  'VBL.NS','RADICO.NS','MCDOWELL-N.NS','UNITDSPR.NS','JUBLFOOD.NS',
  'DEVYANI.NS','WESTLIFE.NS','SAPPHIRE.NS',

  // Realty / Housing ───────────────────────────────────────────
  'DLF.NS','GODREJPROP.NS','PRESTIGE.NS','OBEROIRLTY.NS','PHOENIXLTD.NS',
  'BRIGADE.NS','SOBHA.NS','MAHLIFE.NS',
];

export const US_TICKERS: string[] = [
  'AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA','JPM',
  'V','JNJ','WMT','PG','MA','UNH','HD','DIS','NFLX',
  'AMD','INTC','CRM','ADBE','PYPL','SHOP','UBER','COIN',
];

export const DEFAULT_CONFIG = {
  volumeSurgeThreshold:   1.5,
  minResistanceTouches:   2,
  resistanceTolerancePct: 0.02,
  multiYearLookbackYears: 3,
  minBreakoutPct:         0.005,
  maxConcurrent:          1,      // keep at 1 to avoid Yahoo rate limits
};
