export type RiskTolerance = 'conservative' | 'low' | 'moderate' | 'growth' | 'aggressive'
export type Horizon = 'short' | 'long'

export interface Profile {
  id: string
  name: string | null
  risk_tolerance: RiskTolerance
  horizon: Horizon
  created_at: string
}

export interface Holding {
  id: string
  user_id: string
  ticker: string
  name: string
  shares: number
  buy_price: number
  current_price: number
  sector: string
  currency: string
  created_at: string
  updated_at: string
}

export interface WealthSnapshot {
  id: string
  user_id: string
  total_value: number
  snapshot_date: string
}

// ── New briefing format ──────────────────────────────────────────────────────

export interface NewsItem {
  category: string          // 'Geopolitics' | 'Energy' | 'Technology' | 'Markets' | etc.
  impact: 'high' | 'medium' | 'low'
  headline: string
  summary: string           // what happened + why it matters + so what
  assets: string            // e.g. "Gold Up, Oil Up, USD Weakens"
  tickers?: string[]
}

export interface ShortTermMover {
  ticker: string
  name?: string
  exchange: string
  inPortfolio: boolean
  thesis: string
  catalyst: string
  risk: string
  conviction: number        // 1–10
}

export interface AnalystVerdict {
  macroCycle: string        // where we are in the cycle
  dominantTheme: string     // single dominant market theme this week
  watchFor: string          // one specific thing to watch 5–7 days out
  marketMood: string        // e.g. "Risk-off. Defensives in favour."
}

// ── Legacy format (kept for backward compat) ────────────────────────────────

export interface NewsCard {
  tag: string
  impact: 'high' | 'medium' | 'low'
  headline: string
  what: string
  layer1: string
  layer2: string
  layer3: string
  assetMap: string
  searchQuery?: string
  tickers?: string[]
}

export interface Mover {
  ticker: string
  exchange: string
  sector: string
  catalyst: string
  why: string
  risk: string
  conviction: number
  accessible: string
}

export interface Thesis {
  name: string
  strength: 'Strengthening' | 'Holding' | 'Weakening' | 'New'
  body: string
  todayUpdate: string
}

// ── Briefing ─────────────────────────────────────────────────────────────────

export interface Briefing {
  id: string
  briefing_date: string
  content: {
    displayDate: string
    macroSummary: string
    marketLevels: Record<string, string>
    // New format
    newsItems?: NewsItem[]
    shortTermMovers?: ShortTermMover[]
    analystVerdict?: AnalystVerdict
    // Shared
    theses?: Thesis[]
    // Legacy
    newsCards?: NewsCard[]
    movers?: Mover[]
  }
  created_at: string
}

// ── Portfolio Intelligence ───────────────────────────────────────────────────

export interface PortfolioSignal {
  ticker: string
  action: 'BUY' | 'ADD' | 'HOLD' | 'REDUCE' | 'SELL' | 'WATCH'
  conviction: 'HIGH' | 'MEDIUM' | 'LOW'
  timeframe: 'SHORT' | 'MEDIUM' | 'LONG'
  headline: string
  reasoning: string
  catalyst: string
}

export interface MacroTheme {
  title: string
  chain: string
  impact: 'BULLISH' | 'BEARISH' | 'MIXED'
  affectedTickers: string[]
  newIdea?: string
}

export interface WatchItem {
  alert: string
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  tickers: string[]
}

export interface NewIdea {
  ticker: string
  name: string
  thesis: string
  catalyst: string
  risk: string
}

export interface PortfolioIntelligence {
  portfolioSignals: PortfolioSignal[]
  macroThemes: MacroTheme[]
  watchItems: WatchItem[]
  newIdeas: NewIdea[]
  analystNote: string
}
