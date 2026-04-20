'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  Profile, Briefing, Holding,
  NewsItem, ShortTermMover, Thesis, AnalystVerdict,
  PortfolioIntelligence, PortfolioSignal, MacroTheme, WatchItem, NewIdea,
} from '@/lib/types'

interface IntelligenceTabProps {
  briefing: Briefing | null
  profile: Profile
  loading?: boolean
  userTickers?: string[]
  holdings?: Holding[]
  onGenerateBriefing?: () => void
  generating?: boolean
}

// ── Category pill colours — caramel family ───────────────────────────────────
const CATEGORY_STYLE: Record<string, { pill: string; dot: string; border: string }> = {
  Geopolitics:   { pill: 'bg-[#faecd8] text-[#4a2510]', dot: 'bg-[#6d3718]',  border: 'border-l-[#6d3718]' },
  Politics:      { pill: 'bg-[#f5d9b2] text-[#4a2510]', dot: 'bg-[#8a4a22]',  border: 'border-l-[#8a4a22]' },
  Energy:        { pill: 'bg-[#edd4a0] text-[#4a2510]', dot: 'bg-[#a85f2e]',  border: 'border-l-[#a85f2e]' },
  Technology:    { pill: 'bg-[#fdf6ee] text-[#6d3718]', dot: 'bg-[#c97c42]',  border: 'border-l-[#c97c42]' },
  Markets:       { pill: 'bg-[#faecd8] text-[#6d3718]', dot: 'bg-[#8a4a22]',  border: 'border-l-[#8a4a22]' },
  'Central Banks':{ pill: 'bg-[#f5d9b2] text-[#6d3718]', dot: 'bg-[#a85f2e]', border: 'border-l-[#a85f2e]' },
  Commodities:   { pill: 'bg-[#edd4a0] text-[#6d3718]', dot: 'bg-[#c97c42]',  border: 'border-l-[#c97c42]' },
  China:         { pill: 'bg-[#fdf6ee] text-[#4a2510]', dot: 'bg-[#6d3718]',  border: 'border-l-[#6d3718]' },
  Healthcare:    { pill: 'bg-[#faecd8] text-[#8a4a22]', dot: 'bg-[#a85f2e]',  border: 'border-l-[#a85f2e]' },
  Crypto:        { pill: 'bg-[#f5d9b2] text-[#8a4a22]', dot: 'bg-[#c97c42]',  border: 'border-l-[#c97c42]' },
  Defence:       { pill: 'bg-[#edd4a0] text-[#4a2510]', dot: 'bg-[#8a4a22]',  border: 'border-l-[#8a4a22]' },
  Trade:         { pill: 'bg-[#fdf6ee] text-[#6d3718]', dot: 'bg-[#a85f2e]',  border: 'border-l-[#a85f2e]' },
}
const DEFAULT_CAT = { pill: 'bg-[#fdf6ee] text-[#8a4a22]', dot: 'bg-[#c97c42]', border: 'border-l-[#c97c42]' }

function getCatStyle(cat: string) {
  return CATEGORY_STYLE[cat] || DEFAULT_CAT
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
    setLoading(true); setError(false)
    try {
      const res = await fetch('/api/portfolio-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings, profile }),
      })
      if (!res.ok) throw new Error()
      setIntel(await res.json())
      setRan(true)
    } catch { setError(true) } finally { setLoading(false) }
  }

  if (!ran && !loading) return (
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
        Connects today's macro events to your specific holdings — buy/sell signals, causal chain reasoning, and new ideas a Goldman analyst would pitch.
      </p>
      <button onClick={run} className="px-6 py-3 bg-gradient-to-r from-caramel to-caramel-deep text-white font-bold text-sm rounded-full hover:opacity-90 transition-opacity shadow-soft">
        Run Analyst Briefing
      </button>
    </div>
  )

  if (loading) return (
    <div className="bg-surface border border-border rounded-2xl p-10 shadow-card flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-[3px] border-accent/30 border-t-accent rounded-full animate-spin" />
      <div className="text-center">
        <p className="text-sm font-bold text-text2">Connecting the dots across your portfolio…</p>
        <p className="text-xs text-dim mt-1">Geopolitics → commodities → sectors → your holdings</p>
      </div>
    </div>
  )

  if (error || !intel) return (
    <div className="bg-surface border border-border rounded-2xl p-8 shadow-card text-center">
      <p className="text-sm text-red-text mb-3">Analysis failed — try again</p>
      <button onClick={run} className="px-5 py-2.5 bg-text text-bg text-xs font-bold rounded-full">Retry</button>
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-muted mb-1">Analyst Intelligence</p>
          <h3 className="text-2xl font-black text-text">Portfolio Macro View</h3>
          {intel.analystNote && <p className="text-sm text-dim mt-2 max-w-2xl leading-relaxed">{intel.analystNote}</p>}
        </div>
        <button onClick={run} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-surface2 border border-border rounded-full text-xs font-bold text-dim hover:text-text transition-all">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

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
                      <span className="text-sm font-black text-text bg-surface2 border border-border px-2.5 py-1 rounded-lg">{sig.ticker}</span>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${style.badge}`}>{sig.action}</span>
                      <span className={`text-[10px] ${CONVICTION_STYLE[sig.conviction] || 'text-dim font-medium'}`}>{sig.conviction} conviction</span>
                    </div>
                    <span className="text-[9px] font-bold text-muted bg-surface2 px-2 py-1 rounded-full border border-border flex-shrink-0 ml-2">{sig.timeframe}</span>
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

      {intel.macroThemes?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-4">Macro Causal Chains</p>
          <div className="space-y-3">
            {intel.macroThemes.map((theme: MacroTheme, i: number) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-6 shadow-card">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-sm font-black text-text">{theme.title}</h4>
                    <span className={`text-xs font-black ${IMPACT_COLOR[theme.impact] || 'text-dim'}`}>↑ {theme.impact}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {theme.affectedTickers?.map(t => (
                      <span key={t} className="text-[10px] font-bold bg-surface2 border border-border px-2 py-0.5 rounded-md text-text2">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-[#f8f6f2] rounded-xl p-4 mb-3 border border-border">
                  <p className="text-xs text-text2 leading-relaxed font-mono">
                    {theme.chain?.split('→').map((step, idx, arr) => (
                      <span key={idx}>
                        <span className={idx === 0 ? 'font-bold text-text' : idx === arr.length - 1 ? 'font-bold text-accent' : ''}>{step.trim()}</span>
                        {idx < arr.length - 1 && <span className="text-accent font-black mx-1">→</span>}
                      </span>
                    ))}
                  </p>
                </div>
                {theme.newIdea && (
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] font-black text-[#4a2510] bg-[#faecd8] border border-[#ebb98a] px-2 py-1 rounded-full flex-shrink-0">IDEA</span>
                    <p className="text-xs text-dim">{theme.newIdea}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {intel.watchItems?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-4">Watch List</p>
            <div className="space-y-2.5">
              {intel.watchItems.map((item: WatchItem, i: number) => (
                <div key={i} className="bg-surface border border-border rounded-xl p-4 shadow-card">
                  <div className="flex items-start gap-3">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full border flex-shrink-0 mt-0.5 ${URGENCY_STYLE[item.urgency] || URGENCY_STYLE.LOW}`}>{item.urgency}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text2 leading-relaxed">{item.alert}</p>
                      {item.tickers?.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {item.tickers.map(t => <span key={t} className="text-[9px] font-bold text-muted bg-surface2 border border-border px-1.5 py-0.5 rounded">{t}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
                    {idea.catalyst && <div className="flex items-start gap-1.5"><span className="text-[9px] font-black text-[#15803d] flex-shrink-0 mt-0.5">▲</span><p className="text-[10px] text-dim">{idea.catalyst}</p></div>}
                    {idea.risk && <div className="flex items-start gap-1.5"><span className="text-[9px] font-black text-[#dc2626] flex-shrink-0 mt-0.5">▼</span><p className="text-[10px] text-dim">{idea.risk}</p></div>}
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

// ── News Item Card ────────────────────────────────────────────────────────────
function NewsItemCard({ item, userTickers, featured }: { item: NewsItem; userTickers: string[]; featured?: boolean }) {
  const cat = getCatStyle(item.category)
  const ownedTickers = (item.tickers || []).filter(t => userTickers.includes(t))
  const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(item.headline)}&hl=en`

  if (featured) {
    return (
      <div className={`bg-surface border border-border rounded-2xl p-6 shadow-card border-l-4 ${cat.border} hover:shadow-card-hover transition-shadow`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${cat.pill}`}>{item.category}</span>
          <span className="text-[10px] font-black px-2 py-1 rounded-full bg-red-bg text-red-text border border-red-text/20">HIGH IMPACT</span>
          {ownedTickers.length > 0 && (
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-accent text-white">IN YOUR PORTFOLIO</span>
          )}
        </div>
        <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="block mb-3 hover:underline underline-offset-2">
          <h3 className="text-base font-black text-text leading-snug">{item.headline}</h3>
        </a>
        <p className="text-sm text-dim leading-relaxed mb-4">{item.summary}</p>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Assets:</span>
            <span className="text-[11px] font-semibold text-text2">{item.assets}</span>
          </div>
          {item.tickers && item.tickers.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {item.tickers.map(t => (
                <span key={t} className={`text-[10px] font-bold px-2 py-0.5 rounded border ${userTickers.includes(t) ? 'bg-accent text-white border-accent' : 'bg-surface2 text-text2 border-border'}`}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-surface border border-border rounded-xl p-4 shadow-card border-l-4 ${cat.border} hover:shadow-card-hover transition-shadow`}>
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cat.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${cat.pill}`}>{item.category}</span>
            {ownedTickers.length > 0 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                {ownedTickers.join(', ')} in portfolio
              </span>
            )}
          </div>
          <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="block hover:underline underline-offset-2">
            <p className="text-sm font-bold text-text leading-snug mb-1">{item.headline}</p>
          </a>
          <p className="text-xs text-dim leading-relaxed mb-2">{item.summary}</p>
          <p className="text-[10px] text-muted font-medium">{item.assets}</p>
        </div>
      </div>
    </div>
  )
}

// ── Short-Term Mover Card ─────────────────────────────────────────────────────
function MoverCard({ mover, userTickers }: { mover: ShortTermMover; userTickers: string[] }) {
  const inPortfolio = mover.inPortfolio || userTickers.includes(mover.ticker)
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-text bg-surface2 border border-border px-2.5 py-1 rounded-lg">{mover.ticker}</span>
          {mover.name && <span className="text-xs text-dim">{mover.name}</span>}
          {inPortfolio && (
            <span className="text-[9px] font-black px-2 py-1 rounded-full bg-accent text-white">IN YOUR PORTFOLIO</span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] font-bold text-muted">{mover.exchange}</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-dim">conviction</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`w-1.5 h-3 rounded-sm ${i < mover.conviction ? 'bg-caramel' : 'bg-border'}`} />
              ))}
            </div>
            <span className="text-xs font-black text-caramel-dark">{mover.conviction}/10</span>
          </div>
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="bg-surface2 rounded-xl px-3 py-2.5 border border-border">
          <p className="text-[10px] font-black text-accent uppercase tracking-wide mb-1">Thesis</p>
          <p className="text-xs text-text2 leading-relaxed">{mover.thesis}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#fdf6ee] rounded-xl px-3 py-2 border border-[#f5d9b2]">
            <p className="text-[9px] font-black text-caramel-deep uppercase tracking-wide mb-0.5">Catalyst</p>
            <p className="text-[11px] text-text2 leading-snug">{mover.catalyst}</p>
          </div>
          <div className="bg-red-bg/30 rounded-xl px-3 py-2 border border-red-text/10">
            <p className="text-[9px] font-black text-red-text uppercase tracking-wide mb-0.5">Key Risk</p>
            <p className="text-[11px] text-text2 leading-snug">{mover.risk}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Thesis Card ───────────────────────────────────────────────────────────────
const THESIS_PASTELS = [
  'border-l-[#c97c42] bg-[#fdf6ee]',
  'border-l-[#8a4a22] bg-[#faecd8]',
  'border-l-[#a85f2e] bg-[#f5d9b2]',
  'border-l-[#6d3718] bg-[#edd4a0]',
]
const STRENGTH_STYLES: Record<string, string> = {
  'Strengthening': 'bg-green-bg text-green-text border border-green-text/20',
  'Holding':       'bg-sand text-caramel-deep border border-sand-border/30',
  'Weakening':     'bg-red-bg text-red-text border border-red-text/20',
  'New':           'bg-[#faecd8] text-[#4a2510] border border-[#ebb98a]',
}

function ThesisCard({ thesis, idx }: { thesis: Thesis; idx: number }) {
  const pastel = THESIS_PASTELS[idx % THESIS_PASTELS.length]
  const strengthStyle = STRENGTH_STYLES[thesis.strength] || 'bg-surface2 text-dim border-border'
  return (
    <div className={`rounded-2xl p-6 space-y-4 border-l-4 border border-border shadow-card hover:shadow-card-hover transition-all ${pastel}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-black text-text flex-1 leading-snug text-lg">{thesis.name}</h4>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap border ${strengthStyle}`}>
          {thesis.strength?.toUpperCase()}
        </span>
      </div>
      <p className="text-sm text-dim leading-relaxed">{thesis.body}</p>
      {thesis.todayUpdate && (
        <div className="bg-white/60 rounded-[8px] p-3.5 border-l-[3px] border-accent">
          <p className="text-[10px] font-black text-accent uppercase tracking-wide mb-1">Today's Update</p>
          <p className="text-xs text-text2 leading-relaxed">{thesis.todayUpdate}</p>
        </div>
      )}
    </div>
  )
}

// ── Analyst Verdict ───────────────────────────────────────────────────────────
function AnalystVerdictBlock({ verdict }: { verdict: AnalystVerdict }) {
  return (
    <div className="bg-[#fdf6ee] border border-[#ebb98a] border-l-4 border-l-caramel-deep rounded-2xl p-8">
      <p className="text-xs font-bold tracking-[0.25em] uppercase text-caramel mb-6">Analyst Verdict</p>
      <div className="space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-caramel mb-1">Macro Cycle</p>
          <p className="text-sm text-text leading-relaxed font-medium">{verdict.macroCycle}</p>
        </div>
        <div className="w-full h-px bg-[#ebb98a]/40" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-caramel mb-1">Dominant Theme</p>
          <p className="text-sm text-text leading-relaxed font-medium">{verdict.dominantTheme}</p>
        </div>
        <div className="w-full h-px bg-[#ebb98a]/40" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-caramel mb-1">Watch This Week</p>
          <p className="text-sm text-text leading-relaxed font-medium">{verdict.watchFor}</p>
        </div>
      </div>
      {verdict.marketMood && (
        <div className="mt-6 inline-block bg-caramel border border-[#8a4a22] rounded-full px-4 py-1.5">
          <span className="text-xs font-black text-white tracking-wide">{verdict.marketMood}</span>
        </div>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ num, title, badge, badgeColor }: { num: string; title: string; badge?: string; badgeColor?: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-[10px] font-black text-muted/40 tracking-[0.3em] tabular-nums">{num}</span>
      <h3 className="text-lg font-black text-text tracking-tight">{title}</h3>
      {badge && <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${badgeColor}`}>{badge}</span>}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function IntelligenceTab({
  briefing, profile, loading, userTickers = [], holdings = [],
  onGenerateBriefing, generating,
}: IntelligenceTabProps) {

  if (loading || generating) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <div className="w-16 h-16 rounded-full bg-accent-bg flex items-center justify-center">
          <div className="w-8 h-8 border-[3px] border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold tracking-[0.15em] uppercase text-text2">Generating Briefing</p>
          <p className="text-dim text-sm mt-2">Scanning markets and world news — ~20 seconds</p>
        </div>
      </div>
    )
  }

  if (!briefing) {
    return (
      <div className="text-center py-40">
        <div className="w-14 h-14 rounded-full bg-accent-bg flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">📰</span>
        </div>
        <p className="text-sm font-bold tracking-[0.15em] uppercase text-muted mb-2">No Briefing For Today</p>
        <p className="text-dim text-sm mb-8">Generate today's intelligence report — takes about 20 seconds.</p>
        {onGenerateBriefing && (
          <button onClick={onGenerateBriefing} className="px-8 py-3.5 bg-gradient-to-r from-caramel to-caramel-deep text-white font-bold text-sm rounded-full hover:opacity-90 transition-opacity shadow-soft">
            Generate Today's Briefing
          </button>
        )}
      </div>
    )
  }

  const { content } = briefing

  // Support both new and legacy formats
  const newsItems: NewsItem[] = content.newsItems || []
  const highImpact = newsItems.filter(n => n.impact === 'high')
  const otherNews = newsItems.filter(n => n.impact !== 'high')
  const shortTermMovers: ShortTermMover[] = content.shortTermMovers || []
  const theses: Thesis[] = content.theses || []
  const analystVerdict: AnalystVerdict | undefined = content.analystVerdict

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
            <span><span className="font-bold text-text2">{newsItems.length}</span> stories</span>
          </div>
        </div>
      </div>

      {/* Portfolio Intelligence Panel */}
      {holdings.length > 0 && (
        <PortfolioIntelligencePanel holdings={holdings} profile={profile} />
      )}

      {/* Macro Banner */}
      <div className="bg-[#fdf6ee] border border-[#ebb98a] border-l-4 border-l-caramel rounded-2xl px-8 py-7">
        <p className="text-xs font-bold tracking-[0.25em] uppercase text-caramel mb-3">Macro Summary</p>
        <p className="text-base leading-relaxed text-text max-w-3xl font-medium">{content.macroSummary}</p>
      </div>

      {/* Market Levels */}
      <div>
        <SectionHeader num="00" title="Market Levels" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
          {Object.entries(content.marketLevels).map(([key, val]) => {
            const v = String(val)
            const isUp = v.includes('+')
            const isDown = v.startsWith('-') || v.includes('−') || (v.includes('(') && v.includes('-'))
            return (
              <div key={key} className={`rounded-2xl p-4 border transition-all hover:shadow-card cursor-default ${isUp ? 'bg-green-bg border-green-text/20' : isDown ? 'bg-red-bg border-red-text/20' : 'bg-surface border-border shadow-card'}`}>
                <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted mb-2">{key}</p>
                <p className={`text-sm font-black ${isUp ? 'text-green-text' : isDown ? 'text-red-text' : 'text-text'}`}>{v}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* High Impact Stories */}
      {highImpact.length > 0 && (
        <div>
          <SectionHeader num="01" title="Breaking & High Impact" badge={`${highImpact.length} stories`} badgeColor="bg-red-bg text-red-text" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            {highImpact.map((item, idx) => (
              <NewsItemCard key={idx} item={item} userTickers={userTickers} featured />
            ))}
          </div>
        </div>
      )}

      {/* Global News Scan */}
      {otherNews.length > 0 && (
        <div>
          <SectionHeader num="02" title="Global News Scan" badge={`${otherNews.length} stories`} badgeColor="bg-surface2 text-text2" />
          <div className="space-y-3 mt-6">
            {otherNews.map((item, idx) => (
              <NewsItemCard key={idx} item={item} userTickers={userTickers} />
            ))}
          </div>
        </div>
      )}

      {/* Short-Term Movers */}
      {shortTermMovers.length > 0 && (
        <div>
          <SectionHeader num="03" title="Short-Term Movers" />
          <p className="text-sm text-dim mt-2 mb-6">Stocks and ETFs most likely to move over the next 0–4 weeks</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortTermMovers.map((mover, idx) => (
              <MoverCard key={idx} mover={mover} userTickers={userTickers} />
            ))}
          </div>
        </div>
      )}

      {/* Long-Term Themes */}
      {theses.length > 0 && (
        <div>
          <SectionHeader num="04" title="Long-Term Themes" />
          <p className="text-sm text-dim mt-2 mb-6">Macro and sector themes with a 6–24 month horizon</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {theses.map((thesis, idx) => (
              <ThesisCard key={idx} thesis={thesis} idx={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Analyst Verdict */}
      {analystVerdict && (
        <div>
          <SectionHeader num="05" title="Analyst Verdict" />
          <div className="mt-6 relative">
            <AnalystVerdictBlock verdict={analystVerdict} />
          </div>
        </div>
      )}

    </div>
  )
}
