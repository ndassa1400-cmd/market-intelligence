'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { Profile, Briefing, NewsCard, Mover, Thesis, Holding, PortfolioIntelligence, PortfolioSignal, MacroTheme, WatchItem, NewIdea } from '@/lib/types'

interface IntelligenceTabProps {
  briefing: Briefing | null
  profile: Profile
  loading?: boolean
  userTickers?: string[]
  holdings?: Holding[]
}

// ── Portfolio Intelligence Panel ─────────────────────────────────────────────

const ACTION_STYLE: Record<string, { badge: string; dot: string }> = {
  BUY:    { badge: 'bg-[#dcfce7] text-[#15803d] border border-[#86efac]', dot: 'bg-[#15803d]' },
  ADD:    { badge: 'bg-[#dcfce7] text-[#166534] border border-[#86efac]', dot: 'bg-[#15803d]' },
  HOLD:   { badge: 'bg-[#fdf6ee] text-[#6d3718] border border-[#f5d9b2]', dot: 'bg-[#c97c42]' },
  WATCH:  { badge: 'bg-[#faecd8] text-[#4a2510] border border-[#ebb98a]', dot: 'bg-[#a85f2e]' },
  REDUCE: { badge: 'bg-[#f5d9b2] text-[#4a2510] border border-[#dc9a62]', dot: 'bg-[#8a4a22]' },
  SELL:   { badge: 'bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5]', dot: 'bg-[#dc2626]' },
}

const CONVICTION_STYLE: Record<string, string> = {
  HIGH:   'text-[#4a2510] font-black',
  MEDIUM: 'text-[#8a4a22] font-bold',
  LOW:    'text-[#a85f2e] font-medium',
}

const IMPACT_COLOR: Record<string, string> = {
  BULLISH: 'text-[#15803d]',
  BEARISH: 'text-[#dc2626]',
  MIXED:   'text-[#a85f2e]',
}

const URGENCY_STYLE: Record<string, string> = {
  HIGH:   'bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5]',
  MEDIUM: 'bg-[#faecd8] text-[#6d3718] border border-[#ebb98a]',
  LOW:    'bg-[#fdf6ee] text-[#8a4a22] border border-[#f5d9b2]',
}

function PortfolioIntelligencePanel({ holdings, profile }: { holdings: Holding[]; profile: Profile }) {
  const [intel, setIntel] = useState<PortfolioIntelligence | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [ran, setRan] = useState(false)

  const run = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/portfolio-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings, profile }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setIntel(data)
      setRan(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (!ran && !loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-muted mb-1">Analyst Intelligence</p>
            <h3 className="text-xl font-black text-text">Your Portfolio Under The Macro Lens</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-caramel to-caramel-deep flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-black">AI</span>
          </div>
        </div>
        <p className="text-sm text-dim mb-6 max-w-xl">
          Connects today's geopolitical and macro events to your specific holdings — buy/sell signals, causal chain reasoning, and new ideas a Goldman analyst would pitch.
        </p>
        <button
          onClick={run}
          className="px-6 py-3 bg-gradient-to-r from-caramel to-caramel-deep text-white font-bold text-sm rounded-full hover:opacity-90 transition-opacity shadow-soft"
        >
          Run Analyst Briefing
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-10 shadow-card flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-accent/30 border-t-accent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm font-bold text-text2">Connecting the dots across your portfolio…</p>
          <p className="text-xs text-dim mt-1">Geopolitics → commodities → sectors → your holdings</p>
        </div>
      </div>
    )
  }

  if (error || !intel) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 shadow-card text-center">
        <p className="text-sm text-red-text mb-3">Analysis failed — try again</p>
        <button onClick={run} className="px-5 py-2.5 bg-text text-bg text-xs font-bold rounded-full">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-muted mb-1">Analyst Intelligence</p>
          <h3 className="text-2xl font-black text-text">Portfolio Macro View</h3>
          {intel.analystNote && (
            <p className="text-sm text-dim mt-2 max-w-2xl leading-relaxed">{intel.analystNote}</p>
          )}
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-surface2 border border-border rounded-full text-xs font-bold text-dim hover:text-text hover:border-border2 transition-all"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Portfolio Signals */}
      {intel.portfolioSignals?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-4">Position Signals</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {intel.portfolioSignals.map((sig: PortfolioSignal) => {
              const style = ACTION_STYLE[sig.action] || ACTION_STYLE.HOLD
              return (
                <div key={sig.ticker} className="bg-surface border border-border rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-black text-text bg-surface2 border border-border px-2.5 py-1 rounded-lg">
                        {sig.ticker}
                      </span>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${style.badge}`}>
                        {sig.action}
                      </span>
                      <span className={`text-[10px] ${CONVICTION_STYLE[sig.conviction] || 'text-dim font-medium'}`}>
                        {sig.conviction} conviction
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-muted bg-surface2 px-2 py-1 rounded-full border border-border flex-shrink-0 ml-2">
                      {sig.timeframe}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-text mb-2 leading-snug">{sig.headline}</p>
                  <p className="text-xs text-dim leading-relaxed mb-3">{sig.reasoning}</p>
                  {sig.catalyst && (
                    <div className="flex items-start gap-2 bg-surface2 rounded-xl px-3 py-2 border border-border">
                      <span className="text-[9px] font-black text-accent uppercase tracking-wide mt-0.5 flex-shrink-0">Catalyst</span>
                      <p className="text-xs text-text2">{sig.catalyst}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Macro Themes */}
      {intel.macroThemes?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-4">Macro Causal Chains</p>
          <div className="space-y-3">
            {intel.macroThemes.map((theme: MacroTheme, i: number) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-6 shadow-card">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-sm font-black text-text">{theme.title}</h4>
                    <span className={`text-xs font-black ${IMPACT_COLOR[theme.impact] || 'text-dim'}`}>
                      ↑ {theme.impact}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {theme.affectedTickers?.map(t => (
                      <span key={t} className="text-[10px] font-bold bg-surface2 border border-border px-2 py-0.5 rounded-md text-text2">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Chain rendered with → arrows styled */}
                <div className="bg-[#f8f6f2] rounded-xl p-4 mb-3 border border-border">
                  <p className="text-xs text-text2 leading-relaxed font-mono">
                    {theme.chain?.split('→').map((step, idx, arr) => (
                      <span key={idx}>
                        <span className={idx === 0 ? 'font-bold text-text' : idx === arr.length - 1 ? 'font-bold text-accent' : ''}>
                          {step.trim()}
                        </span>
                        {idx < arr.length - 1 && (
                          <span className="text-accent font-black mx-1">→</span>
                        )}
                      </span>
                    ))}
                  </p>
                </div>
                {theme.newIdea && (
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] font-black text-[#4a2510] bg-[#faecd8] border border-[#ebb98a] px-2 py-1 rounded-full flex-shrink-0">
                      IDEA
                    </span>
                    <p className="text-xs text-dim">{theme.newIdea}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watch Items + New Ideas side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Watch Items */}
        {intel.watchItems?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-4">Watch List</p>
            <div className="space-y-2.5">
              {intel.watchItems.map((item: WatchItem, i: number) => (
                <div key={i} className="bg-surface border border-border rounded-xl p-4 shadow-card">
                  <div className="flex items-start gap-3">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full border flex-shrink-0 mt-0.5 ${URGENCY_STYLE[item.urgency] || URGENCY_STYLE.LOW}`}>
                      {item.urgency}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text2 leading-relaxed">{item.alert}</p>
                      {item.tickers?.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {item.tickers.map(t => (
                            <span key={t} className="text-[9px] font-bold text-muted bg-surface2 border border-border px-1.5 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Ideas */}
        {intel.newIdeas?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-4">On The Radar</p>
            <div className="space-y-2.5">
              {intel.newIdeas.map((idea: NewIdea, i: number) => (
                <div key={i} className="bg-surface border border-border rounded-xl p-4 shadow-card">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-black text-accent">{idea.ticker}</span>
                    <span className="text-xs text-dim truncate">{idea.name}</span>
                  </div>
                  <p className="text-xs text-text2 leading-relaxed mb-2">{idea.thesis}</p>
                  <div className="flex gap-3 flex-wrap">
                    {idea.catalyst && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-[9px] font-black text-[#15803d] flex-shrink-0 mt-0.5">▲</span>
                        <p className="text-[10px] text-dim">{idea.catalyst}</p>
                      </div>
                    )}
                    {idea.risk && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-[9px] font-black text-[#dc2626] flex-shrink-0 mt-0.5">▼</span>
                        <p className="text-[10px] text-dim">{idea.risk}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

// --- Category-based card theming — monochromatic caramel family ---
const TAG_THEMES: Array<{
  keywords: string[]
  card: string
  tag: string
  accent: string
  dot: string
}> = [
  {
    keywords: ['politics', 'trump', 'election', 'congress', 'white house', 'administration', 'executive', 'government'],
    card: 'bg-gradient-to-br from-[#fdf6ee] to-white',
    tag: 'bg-[#fdf6ee] text-[#6d3718] border border-[#f5d9b2]',
    accent: '#6d3718',
    dot: 'bg-[#8a4a22]',
  },
  {
    keywords: ['geopolitics', 'war', 'conflict', 'military', 'nato', 'peace', 'iran', 'russia', 'china', 'ukraine', 'taiwan', 'middle east', 'diplomacy'],
    card: 'bg-gradient-to-br from-[#faecd8] to-white',
    tag: 'bg-[#faecd8] text-[#4a2510] border border-[#ebb98a]',
    accent: '#4a2510',
    dot: 'bg-[#6d3718]',
  },
  {
    keywords: ['energy', 'oil', 'gas', 'opec', 'tanker', 'crude', 'pipeline', 'lng', 'coal', 'petrol'],
    card: 'bg-gradient-to-br from-[#f5d9b2] to-white',
    tag: 'bg-[#f5d9b2] text-[#4a2510] border border-[#dc9a62]',
    accent: '#8a4a22',
    dot: 'bg-[#a85f2e]',
  },
  {
    keywords: ['tech', 'ai', 'technology', 'semiconductor', 'chip', 'software', 'cyber', 'data', 'cloud', 'quantum', 'nvidia', 'apple', 'microsoft', 'google', 'meta'],
    card: 'bg-gradient-to-br from-[#edd4a0] to-white',
    tag: 'bg-[#edd4a0] text-[#6d3718] border border-[#d9a85c]',
    accent: '#6d3718',
    dot: 'bg-[#8a4a22]',
  },
  {
    keywords: ['climate', 'environment', 'carbon', 'green', 'renewable', 'solar', 'wind', 'emissions', 'esg', 'sustainability'],
    card: 'bg-gradient-to-br from-[#fdf6ee] to-white',
    tag: 'bg-[#fdf6ee] text-[#8a4a22] border border-[#f5d9b2]',
    accent: '#8a4a22',
    dot: 'bg-[#c97c42]',
  },
  {
    keywords: ['market', 'stocks', 'equities', 'fed', 'interest rate', 'inflation', 'cpi', 'earnings', 'ipo', 'bond', 'yield', 'rally', 'selloff', 'correction'],
    card: 'bg-gradient-to-br from-[#e4c07e]/30 to-white',
    tag: 'bg-[#e4c07e]/60 text-[#4a2510] border border-[#c97c42]/50',
    accent: '#a85f2e',
    dot: 'bg-[#c97c42]',
  },
  {
    keywords: ['health', 'pharma', 'drug', 'fda', 'medical', 'pandemic', 'vaccine', 'biotech', 'healthcare'],
    card: 'bg-gradient-to-br from-[#faecd8] to-white',
    tag: 'bg-[#faecd8] text-[#6d3718] border border-[#ebb98a]',
    accent: '#6d3718',
    dot: 'bg-[#a85f2e]',
  },
  {
    keywords: ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'token', 'nft', 'web3'],
    card: 'bg-gradient-to-br from-[#f5d9b2] to-white',
    tag: 'bg-[#f5d9b2] text-[#6d3718] border border-[#dc9a62]',
    accent: '#6d3718',
    dot: 'bg-[#c97c42]',
  },
]

const DEFAULT_THEME = {
  card: 'bg-gradient-to-br from-[#fdf6ee] to-white',
  tag: 'bg-[#fdf6ee] text-[#8a4a22] border border-[#f5d9b2]',
  accent: '#c97c42',
  dot: 'bg-[#c97c42]',
}

function getTagTheme(tag: string, headline: string) {
  const searchText = `${tag} ${headline}`.toLowerCase()
  for (const theme of TAG_THEMES) {
    if (theme.keywords.some(k => searchText.includes(k))) return theme
  }
  return DEFAULT_THEME
}

const IMPACT_BADGE: Record<string, string> = {
  high: 'bg-red-bg text-red-text border border-red-text/20',
  medium: 'bg-sand text-caramel-deep border border-sand-border/30',
  low: 'bg-green-bg text-green-text border border-green-text/20',
}

export default function IntelligenceTab({ briefing, profile, loading, userTickers = [], holdings = [] }: IntelligenceTabProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-accent-bg flex items-center justify-center">
            <div className="w-8 h-8 border-[3px] border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold tracking-[0.15em] uppercase text-text2">Generating Briefing</p>
          <p className="text-dim text-sm mt-2">Scanning global markets and world news — ~20 seconds</p>
        </div>
      </div>
    )
  }

  if (!briefing) {
    return (
      <div className="text-center py-40">
        <div className="w-14 h-14 rounded-full bg-surface2 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📰</span>
        </div>
        <p className="text-sm font-bold tracking-[0.15em] uppercase text-muted">No Briefing Available</p>
        <p className="text-dim text-sm mt-2">Refresh the page to try again.</p>
      </div>
    )
  }

  const { content } = briefing
  const highImpact = content.newsCards.filter(c => c.impact === 'high')
  const otherCards = content.newsCards.filter(c => c.impact !== 'high')
  const categories = groupByCategory(content.newsCards)

  return (
    <div className="space-y-14">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-8 border-b-2 border-border">
        <div>
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-accent mb-3">Daily Intelligence</p>
          <h2 className="text-5xl font-black tracking-tight text-text leading-none">
            Morning<br />Briefing
          </h2>
          <p className="text-dim mt-3 font-medium">{content.displayDate}</p>
        </div>
        <div className="flex flex-col gap-2 items-start md:items-end">
          <div className="flex gap-2">
            <span className="px-3 py-1.5 bg-accent-bg text-accent-text border border-accent/20 rounded-full text-xs font-bold tracking-wide">
              {profile.risk_tolerance.charAt(0).toUpperCase() + profile.risk_tolerance.slice(1)} Risk
            </span>
            <span className="px-3 py-1.5 bg-surface border border-border rounded-full text-xs font-bold text-text2 tracking-wide">
              {profile.horizon === 'long' ? 'Long-term' : 'Short-term'}
            </span>
          </div>
          <div className="flex gap-3 text-xs text-muted">
            <span><span className="font-bold text-red-text">{highImpact.length}</span> high-impact</span>
            <span><span className="font-bold text-text2">{content.newsCards.length}</span> total stories</span>
          </div>
        </div>
      </div>

      {/* Portfolio Intelligence — only shown when user has holdings */}
      {holdings.length > 0 && (
        <PortfolioIntelligencePanel holdings={holdings} profile={profile} />
      )}

      {/* Macro Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#8a4a22] to-[#4a2510] rounded-2xl px-8 py-7 text-white">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />
        <p className="text-xs font-bold tracking-[0.25em] uppercase text-white/60 mb-3">Macro Summary</p>
        <p className="text-base leading-relaxed text-white/95 max-w-3xl font-medium">{content.macroSummary}</p>
      </div>

      {/* Market Levels */}
      <div>
        <SectionHeader num="00" title="Market Levels" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
          {Object.entries(content.marketLevels).map(([key, val]) => {
            const v = String(val)
            const isUp = v.includes('+')
            const isDown = v.startsWith('-') || v.includes('−')
            return (
              <div key={key} className={`rounded-2xl p-4 border transition-all hover:shadow-card cursor-default ${
                isUp ? 'bg-green-bg border-green-text/20' :
                isDown ? 'bg-red-bg border-red-text/20' :
                'bg-surface border-border shadow-card'
              }`}>
                <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted mb-2">{key}</p>
                <p className={`text-sm font-black ${isUp ? 'text-green-text' : isDown ? 'text-red-text' : 'text-text'}`}>
                  {v}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Breaking / High Impact */}
      {highImpact.length > 0 && (
        <div>
          <SectionHeader num="01" title="Breaking & High Impact" badge={`${highImpact.length} stories`} badgeColor="bg-red-bg text-red-text" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            {highImpact.map((card, idx) => (
              <NewsCardComponent key={idx} card={card} userTickers={userTickers} featured />
            ))}
          </div>
        </div>
      )}

      {/* The Bigger Picture — narrative groupings */}
      {categories.length > 0 && (
        <div>
          <SectionHeader num="02" title="The Bigger Picture" />
          <p className="text-sm text-dim mt-2 mb-6">How today's stories connect — the threads that matter</p>
          <div className="space-y-4">
            {categories.map((cat, idx) => (
              <CategoryNarrative key={idx} category={cat} userTickers={userTickers} />
            ))}
          </div>
        </div>
      )}

      {/* All Other News */}
      <div>
        <SectionHeader num="03" title="Global News Scan" badge={`${otherCards.length} stories`} badgeColor="bg-surface2 text-text2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {otherCards.map((card, idx) => (
            <NewsCardComponent key={idx} card={card} userTickers={userTickers} />
          ))}
        </div>
      </div>

      {/* Movers */}
      <div>
        <SectionHeader num="04" title="Short-Term Movers" />
        <div className="bg-surface border border-border rounded-2xl overflow-hidden mt-6 shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-surface2 to-accent-bg border-b border-border">
                <th className="text-left px-5 py-4 text-xs font-bold tracking-[0.1em] uppercase text-muted">Ticker</th>
                <th className="text-left px-5 py-4 text-xs font-bold tracking-[0.1em] uppercase text-muted hidden md:table-cell">Sector</th>
                <th className="text-left px-5 py-4 text-xs font-bold tracking-[0.1em] uppercase text-muted">Catalyst & Thesis</th>
                <th className="text-left px-5 py-4 text-xs font-bold tracking-[0.1em] uppercase text-muted hidden lg:table-cell">Risk</th>
                <th className="text-center px-5 py-4 text-xs font-bold tracking-[0.1em] uppercase text-muted">Conviction</th>
              </tr>
            </thead>
            <tbody>
              {content.movers.map((mover, idx) => {
                const isOwned = userTickers.includes(mover.ticker)
                return (
                  <tr key={idx} className={`border-b border-border last:border-0 transition-colors ${isOwned ? 'bg-accent-bg/40 hover:bg-accent-bg/60' : 'hover:bg-surface2'}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-text">{mover.ticker}</span>
                        {isOwned && <span className="text-xs px-1.5 py-0.5 bg-accent text-white rounded font-bold">HELD</span>}
                      </div>
                      <span className="text-xs text-muted">{mover.exchange}</span>
                    </td>
                    <td className="px-5 py-4 text-dim text-xs hidden md:table-cell">{mover.sector}</td>
                    <td className="px-5 py-4 text-xs max-w-xs">
                      <p className="text-text2 font-semibold">{mover.catalyst}</p>
                      <p className="text-dim mt-0.5 leading-relaxed">{mover.why}</p>
                    </td>
                    <td className="px-5 py-4 text-dim text-xs hidden lg:table-cell max-w-[160px] leading-relaxed">{mover.risk}</td>
                    <td className="px-5 py-4 text-center">
                      <ConvictionBar conviction={mover.conviction} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Theses */}
      <div>
        <SectionHeader num="05" title="Long-Term Themes" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {content.theses.map((thesis, idx) => (
            <ThesisCard key={idx} thesis={thesis} idx={idx} />
          ))}
        </div>
      </div>

    </div>
  )
}

// Group news cards by tag into narrative clusters
interface CategoryGroup {
  label: string
  theme: typeof DEFAULT_THEME
  cards: NewsCard[]
  narrative: string
}

function groupByCategory(cards: NewsCard[]): CategoryGroup[] {
  const groups: Record<string, { cards: NewsCard[]; theme: typeof DEFAULT_THEME }> = {}

  for (const card of cards) {
    const theme = getTagTheme(card.tag, card.headline)
    const key = card.tag.toLowerCase()
    if (!groups[key]) groups[key] = { cards: [], theme }
    groups[key].cards.push(card)
  }

  return Object.entries(groups)
    .filter(([, g]) => g.cards.length >= 2)
    .map(([label, g]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      theme: g.theme,
      cards: g.cards,
      narrative: `${g.cards.length} stories form a connected thread today: ${g.cards[0].headline} — ${g.cards[1]?.what?.slice(0, 100) || ''}`,
    }))
    .slice(0, 4)
}

function CategoryNarrative({ category, userTickers }: { category: CategoryGroup; userTickers: string[] }) {
  const theme = category.theme

  return (
    <div
      className={`rounded-2xl border border-border overflow-hidden shadow-card hover:shadow-card-hover transition-all ${theme.card}`}
      style={{ borderLeftWidth: 4, borderLeftColor: theme.accent }}
    >
      {/* Category header */}
      <div className="px-5 py-4 border-b border-black/5 flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
        <h4 className="text-sm font-black tracking-wide uppercase" style={{ color: theme.accent }}>
          {category.label}
        </h4>
        <span className="text-xs text-muted ml-auto">{category.cards.length} related stories today</span>
      </div>

      {/* Narrative thread */}
      <div className="px-5 py-3 bg-white/40">
        <p className="text-xs text-dim leading-relaxed">
          <span className="font-bold not-italic" style={{ color: theme.accent }}>The thread: </span>
          {category.narrative}
        </p>
      </div>

      {/* Story headlines */}
      <div className="px-5 py-3 space-y-3">
        {category.cards.map((card, i) => {
          const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(card.searchQuery || card.headline)}&hl=en`
          const affectedOwned = (card.tickers || []).filter(t => userTickers.includes(t))
          return (
            <div key={i} className="flex items-start gap-3">
              <span className={`mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${theme.dot}`} />
              <div className="flex-1 min-w-0">
                <a href={searchUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-bold text-text leading-snug hover:underline underline-offset-2 block">
                  {card.headline}
                </a>
                <p className="text-xs text-dim mt-0.5 leading-relaxed">{card.what}</p>
                {affectedOwned.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {affectedOwned.map(t => (
                      <span key={t} className="text-xs px-1.5 py-0.5 bg-accent text-white rounded font-bold">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className={`ml-2 flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-md ${IMPACT_BADGE[card.impact]}`}>
                {card.impact.toUpperCase()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionHeader({ num, title, badge, badgeColor }: { num: string; title: string; badge?: string; badgeColor?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-black tracking-[0.2em] uppercase text-accent">{num}</span>
      <h3 className="text-2xl font-black tracking-tight text-text">{title}</h3>
      {badge && <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>{badge}</span>}
    </div>
  )
}

function ConvictionBar({ conviction }: { conviction: number }) {
  const colors = ['bg-red-text', 'bg-caramel-deep', 'bg-caramel', 'bg-green-text', 'bg-green-text',
    'bg-green-text', 'bg-accent', 'bg-accent', 'bg-accent', 'bg-accent']
  const color = colors[Math.min(conviction - 1, 9)] || 'bg-accent'
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-base font-black text-text">{conviction}<span className="text-xs text-muted font-normal">/10</span></span>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`w-1.5 h-3 rounded-sm ${i < conviction ? color : 'bg-surface2'}`} />
        ))}
      </div>
    </div>
  )
}

function NewsCardComponent({ card, userTickers, featured }: { card: NewsCard; userTickers: string[]; featured?: boolean }) {
  const theme = getTagTheme(card.tag, card.headline)
  const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(card.searchQuery || card.headline)}&hl=en`
  const affectedOwned = (card.tickers || []).filter(t => userTickers.includes(t))

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all border border-border ${theme.card}`}
      style={{ borderLeftWidth: 4, borderLeftColor: theme.accent }}
    >
      <div className="p-5 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <span className={`text-xs font-bold tracking-[0.06em] uppercase px-2.5 py-1 rounded-md whitespace-nowrap ${theme.tag}`}>
            {card.tag}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap ${IMPACT_BADGE[card.impact]}`}>
            {card.impact.toUpperCase()} IMPACT
          </span>
        </div>

        {/* Headline — big and bold */}
        <h4 className={`font-black text-text leading-snug ${featured ? 'text-xl' : 'text-lg'}`}>
          {card.headline}
        </h4>

        <p className="text-sm text-text2 leading-relaxed">{card.what}</p>

        {/* Affected tickers */}
        {affectedOwned.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-accent">Affects your holdings:</span>
            {affectedOwned.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 bg-accent text-white rounded font-bold">{t}</span>
            ))}
          </div>
        )}

        {/* Time layers */}
        <div className="space-y-2 pt-1 border-t border-black/5">
          <LayerRow label="0–4 wks" text={card.layer1} color="text-caramel" />
          <LayerRow label="1–6 mths" text={card.layer2} color="text-caramel-dark" />
          <LayerRow label="6–24 mths" text={card.layer3} color="text-caramel-deep" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-dim leading-relaxed flex-1">
            <span className="font-bold text-text2">Assets: </span>{card.assetMap}
          </p>
          <a href={searchUrl} target="_blank" rel="noopener noreferrer"
            className="ml-4 text-xs font-bold hover:underline underline-offset-2 whitespace-nowrap"
            style={{ color: theme.accent }}>
            Read More →
          </a>
        </div>
      </div>
    </div>
  )
}

function LayerRow({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div className="flex gap-2 text-xs pt-1.5">
      <span className={`font-black whitespace-nowrap pt-0.5 min-w-[55px] ${color}`}>{label}</span>
      <span className="text-dim leading-relaxed">{text}</span>
    </div>
  )
}

const THESIS_PASTELS = [
  'border-l-pastel-1t bg-pastel-1',
  'border-l-pastel-2t bg-pastel-2',
  'border-l-pastel-3t bg-pastel-3',
  'border-l-pastel-4t bg-pastel-4',
  'border-l-pastel-5t bg-pastel-5',
  'border-l-pastel-6t bg-pastel-6',
]

const STRENGTH_STYLES: Record<string, string> = {
  'Strengthening': 'bg-green-bg text-green-text border border-green-text/20',
  'Holding': 'bg-sand text-caramel-deep border border-sand-border/30',
  'Weakening': 'bg-red-bg text-red-text border border-red-text/20',
  'New': 'bg-pastel-2 text-pastel-2t border border-pastel-2t/20',
}

function ThesisCard({ thesis, idx }: { thesis: Thesis; idx: number }) {
  const pastel = THESIS_PASTELS[idx % THESIS_PASTELS.length]
  const strengthStyle = STRENGTH_STYLES[thesis.strength] || 'bg-surface2 text-dim border-border'
  return (
    <div className={`rounded-2xl p-6 space-y-4 border-l-4 border border-border shadow-card hover:shadow-card-hover transition-all ${pastel}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-black text-text flex-1 leading-snug text-lg">{thesis.name}</h4>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap border ${strengthStyle}`}>
          {thesis.strength.toUpperCase()}
        </span>
      </div>
      <p className="text-sm text-text2 leading-relaxed">{thesis.body}</p>
      <div className="bg-white/60 rounded-[8px] p-3.5 border-l-[3px] border-accent">
        <p className="text-xs font-bold tracking-[0.08em] uppercase text-muted mb-1.5">Today's Update</p>
        <p className="text-xs text-dim leading-relaxed">{thesis.todayUpdate}</p>
      </div>
    </div>
  )
}
