'use client'

import { Profile, Briefing, NewsCard, Mover, Thesis } from '@/lib/types'

interface IntelligenceTabProps {
  briefing: Briefing | null
  profile: Profile
  loading?: boolean
}

const getImpactStyle = (impact: string) => {
  switch (impact) {
    case 'high': return { tag: 'bg-red-bg text-red-text border border-red/20', bar: 'bg-red-text' }
    case 'medium': return { tag: 'bg-amber-bg text-amber-text border border-amber/20', bar: 'bg-amber-text' }
    case 'low': return { tag: 'bg-green-bg text-green-text border border-green/20', bar: 'bg-green-text' }
    default: return { tag: 'bg-surface2 text-dim border border-border', bar: 'bg-dim' }
  }
}

const getStrengthStyle = (strength: string) => {
  switch (strength) {
    case 'Strengthening': return 'bg-green-bg text-green-text border border-green/20'
    case 'Holding': return 'bg-blue-bg text-blue-text border border-blue/20'
    case 'Weakening': return 'bg-red-bg text-red-text border border-red/20'
    case 'New': return 'bg-amber-bg text-amber-text border border-amber/20'
    default: return 'bg-surface2 text-dim border border-border'
  }
}

const parseMarketValue = (value: string) => {
  const isPositive = value.includes('+')
  const isNegative = value.includes('-') && !value.startsWith('-')
  return { value, isPositive, isNegative }
}

export default function IntelligenceTab({ briefing, profile, loading }: IntelligenceTabProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-8 h-8 border-2 border-border border-t-text rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm font-semibold tracking-[0.15em] uppercase text-text2">Generating Briefing</p>
          <p className="text-dim text-sm mt-2">Analysing global markets — takes about 20 seconds</p>
        </div>
      </div>
    )
  }

  if (!briefing) {
    return (
      <div className="text-center py-32">
        <p className="text-sm font-semibold tracking-[0.15em] uppercase text-muted">No Briefing Available</p>
        <p className="text-dim text-sm mt-2">Refresh the page to try again.</p>
      </div>
    )
  }

  const { content } = briefing

  return (
    <div className="space-y-14">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted mb-3">Daily Briefing</p>
          <h2 className="text-4xl font-bold tracking-tight text-text leading-none">
            Morning Intelligence
          </h2>
          <p className="text-dim mt-2">{content.displayDate}</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1.5 bg-accent-bg text-accent border border-blue/20 rounded-full text-xs font-semibold tracking-wide">
            {profile.risk_tolerance.charAt(0).toUpperCase() + profile.risk_tolerance.slice(1)} Risk
          </span>
          <span className="px-3 py-1.5 bg-surface border border-border rounded-full text-xs font-semibold text-text2 tracking-wide">
            {profile.horizon === 'long' ? 'Long-term' : 'Short-term'}
          </span>
        </div>
      </div>

      {/* Macro Summary Banner */}
      <div className="bg-text text-bg rounded-[10px] px-6 py-5">
        <p className="text-xs font-semibold tracking-[0.15em] uppercase opacity-50 mb-2">Macro Summary</p>
        <p className="text-sm leading-relaxed opacity-90">{content.macroSummary}</p>
      </div>

      {/* Market Levels */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-muted">00</span>
          <h3 className="text-xl font-bold tracking-tight text-text">Market Levels</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(content.marketLevels).map(([key, val]) => {
            const { isPositive, isNegative } = parseMarketValue(String(val))
            return (
              <div key={key} className="bg-surface border border-border rounded-[10px] p-4 hover:border-border2 transition-colors">
                <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-2">{key}</p>
                <p className={`text-sm font-bold ${isPositive ? 'text-green-text' : isNegative ? 'text-red-text' : 'text-text'}`}>
                  {String(val)}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* News Cards */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-muted">01</span>
          <h3 className="text-xl font-bold tracking-tight text-text">Global News Scan</h3>
          <span className="ml-auto text-xs text-muted">{content.newsCards.length} stories</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {content.newsCards.map((card, idx) => (
            <NewsCardComponent key={idx} card={card} />
          ))}
        </div>
      </div>

      {/* Movers */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-muted">02</span>
          <h3 className="text-xl font-bold tracking-tight text-text">Short-Term Movers</h3>
        </div>
        <div className="bg-surface border border-border rounded-[10px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface2 border-b border-border">
                <th className="text-left px-5 py-3.5 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Ticker</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold tracking-[0.1em] uppercase text-muted hidden md:table-cell">Sector</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Catalyst</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold tracking-[0.1em] uppercase text-muted hidden lg:table-cell">Risk</th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Conviction</th>
              </tr>
            </thead>
            <tbody>
              {content.movers.map((mover, idx) => (
                <tr key={idx} className="border-b border-border last:border-0 hover:bg-surface2 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-bold text-text">{mover.ticker}</span>
                    <span className="text-xs text-muted ml-2">{mover.exchange}</span>
                  </td>
                  <td className="px-5 py-4 text-dim text-xs hidden md:table-cell">{mover.sector}</td>
                  <td className="px-5 py-4 text-xs max-w-xs">
                    <p className="text-text2 font-medium">{mover.catalyst}</p>
                    <p className="text-dim mt-0.5">{mover.why}</p>
                  </td>
                  <td className="px-5 py-4 text-dim text-xs hidden lg:table-cell max-w-xs">{mover.risk}</td>
                  <td className="px-5 py-4 text-center">
                    <ConvictionBar conviction={mover.conviction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Theses */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-muted">03</span>
          <h3 className="text-xl font-bold tracking-tight text-text">Long-Term Themes</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {content.theses.map((thesis, idx) => (
            <ThesisCard key={idx} thesis={thesis} />
          ))}
        </div>
      </div>

    </div>
  )
}

function ConvictionBar({ conviction }: { conviction: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm font-bold text-text">{conviction}<span className="text-xs text-muted font-normal">/10</span></span>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-3 rounded-sm ${i < conviction ? 'bg-accent' : 'bg-surface2'}`}
          />
        ))}
      </div>
    </div>
  )
}

function NewsCardComponent({ card }: { card: NewsCard }) {
  const style = getImpactStyle(card.impact)
  const searchUrl = card.searchQuery
    ? `https://news.google.com/search?q=${encodeURIComponent(card.searchQuery)}&hl=en`
    : `https://news.google.com/search?q=${encodeURIComponent(card.headline)}&hl=en`

  return (
    <div className="bg-surface border border-border rounded-[10px] overflow-hidden hover:border-border2 transition-colors group">
      {/* Impact bar */}
      <div className={`h-1 w-full ${style.bar}`} />

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-semibold tracking-[0.08em] uppercase text-text2 px-2.5 py-1 bg-surface2 border border-border rounded-md">
            {card.tag}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md whitespace-nowrap ${style.tag}`}>
            {card.impact.toUpperCase()} IMPACT
          </span>
        </div>

        <h4 className="font-bold text-text leading-snug text-base">
          {card.headline}
        </h4>

        <p className="text-sm text-text2 leading-relaxed">
          {card.what}
        </p>

        <div className="space-y-2.5 pt-1">
          <LayerRow label="Immediate (0–4 wks)" text={card.layer1} />
          <LayerRow label="Near-term (1–6 mths)" text={card.layer2} />
          <LayerRow label="Structural (6–24 mths)" text={card.layer3} />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-dim">
            <span className="font-semibold text-text2">Assets: </span>{card.assetMap}
          </p>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-accent hover:underline whitespace-nowrap ml-3"
          >
            Read More →
          </a>
        </div>
      </div>
    </div>
  )
}

function LayerRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="font-semibold text-muted whitespace-nowrap pt-0.5 min-w-[110px]">{label}</span>
      <span className="text-dim leading-relaxed">{text}</span>
    </div>
  )
}

function ThesisCard({ thesis }: { thesis: Thesis }) {
  return (
    <div className="bg-surface border border-border rounded-[10px] p-5 space-y-4 hover:border-border2 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-bold text-text flex-1 leading-snug">{thesis.name}</h4>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md whitespace-nowrap ${getStrengthStyle(thesis.strength)}`}>
          {thesis.strength.toUpperCase()}
        </span>
      </div>

      <p className="text-sm text-text2 leading-relaxed">{thesis.body}</p>

      <div className="bg-surface2 rounded-[8px] p-3.5 border-l-[3px] border-accent">
        <p className="text-xs font-semibold tracking-[0.08em] uppercase text-muted mb-1.5">Today's Update</p>
        <p className="text-xs text-dim leading-relaxed">{thesis.todayUpdate}</p>
      </div>
    </div>
  )
}
