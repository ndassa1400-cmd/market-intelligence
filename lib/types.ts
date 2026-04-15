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
  chain: string          // Causal chain with → arrows
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

export interface Briefing {
  id: string
  briefing_date: string
  content: {
    date: string
    displayDate: string
    marketLevels: Record<string, string>
    newsCards: NewsCard[]
    movers: Mover[]
    theses: Thesis[]
    macroSummary: string
  }
  created_at: string
}
