'use client'

import { Profile, Briefing, NewsCard, Mover, Thesis } from '@/lib/types'

interface IntelligenceTabProps {
  briefing: Briefing | null
  profile: Profile
}

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'high': return 'bg-red-bg text-red'
    case 'medium': return 'bg-amber-bg text-amber'
    case 'low': return 'bg-green-bg text-green'
    default: return 'bg-surface2 text-text2'
  }
}

const getStrengthColor = (strength: string) => {
  switch (strength) {
    case 'Strengthening': return 'bg-green-bg text-green'
    case 'Holding': return 'bg-blue-bg text-blue'
    case 'Weakening': return 'bg-red-bg text-red'
    case 'New': return 'bg-amber-bg text-amber'
    default: return 'bg-surface2 text-text2'
  }
}

export default function IntelligenceTab({ briefing, profile }: IntelligenceTabProps) {
  if (!briefing) {
    return (
      <div className="text-center py-12">
        <p className="text-dim text-lg">Generating today's briefing...</p>
        <p className="text-muted text-sm mt-2">Please check back in a moment</p>
      </div>
    )
  }

  const { content } = briefing

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h2 className="text-[1.8rem] font-bold tracking-tight text-text mb-2">
          Morning Briefing.
        </h2>
        <div className="flex items-center gap-4">
          <p className="text-muted">{content.displayDate}</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-surface border border-border rounded-full text-xs font-medium text-text2">
              {profile.risk_tolerance.charAt(0).toUpperCase() + profile.risk_tolerance.slice(1)} Risk
            </span>
            <span className="px-3 py-1 bg-surface border border-border rounded-full text-xs font-medium text-text2">
              {profile.horizon === 'long' ? 'Long-term' : 'Short-term'}
            </span>
          </div>
        </div>
      </div>

      {/* Market Levels */}
      <div>
        <h3 className="text-[1.3rem] font-bold tracking-tight text-text mb-6">
          SECTION 00 | Market Levels
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(content.marketLevels).map(([key, value]) => (
            <div key={key} className="bg-surface border border-border rounded-[8px] p-4">
              <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-2">
                {key}
              </p>
              <p className="text-lg font-semibold text-text">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* News Cards */}
      <div>
        <h3 className="text-[1.3rem] font-bold tracking-tight text-text mb-6">
          SECTION 01 | Global News Scan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.newsCards.map((card, idx) => (
            <NewsCardComponent key={idx} card={card} />
          ))}
        </div>
      </div>

      {/* Movers */}
      <div>
        <h3 className="text-[1.3rem] font-bold tracking-tight text-text mb-6">
          SECTION 02 | Short-Term Movers
        </h3>
        <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f0eeea] border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Ticker</th>
                <th className="text-left px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Sector</th>
                <th className="text-left px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Catalyst</th>
                <th className="text-left px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Why</th>
                <th className="text-center px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Conviction</th>
              </tr>
            </thead>
            <tbody>
              {content.movers.map((mover, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-[#fafaf8] transition-colors">
                  <td className="px-4 py-3 font-medium text-text">{mover.ticker}</td>
                  <td className="px-4 py-3 text-dim">{mover.sector}</td>
                  <td className="px-4 py-3 text-dim text-xs">{mover.catalyst}</td>
                  <td className="px-4 py-3 text-dim text-xs max-w-xs">{mover.why}</td>
                  <td className="px-4 py-3 text-center font-medium text-text">{mover.conviction}/10</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Theses */}
      <div>
        <h3 className="text-[1.3rem] font-bold tracking-tight text-text mb-6">
          SECTION 03 | Long-Term Themes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.theses.map((thesis, idx) => (
            <ThesisCard key={idx} thesis={thesis} />
          ))}
        </div>
      </div>

      {/* Macro Summary */}
      <div className="bg-surface border border-border rounded-[8px] p-6">
        <h4 className="text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-3">
          Macro Summary
        </h4>
        <p className="text-base text-text2 leading-relaxed">
          {content.macroSummary}
        </p>
      </div>
    </div>
  )
}

function NewsCardComponent({ card }: { card: NewsCard }) {
  return (
    <div className="bg-surface border border-border rounded-[8px] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium tracking-[0.05em] uppercase text-muted px-2 py-1 bg-[#f0eeea] rounded">
          {card.tag}
        </span>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getImpactColor(card.impact)}`}>
          {card.impact.toUpperCase()} IMPACT
        </span>
      </div>

      <h4 className="font-semibold text-text leading-snug">
        {card.headline}
      </h4>

      <p className="text-sm text-text2">
        {card.what}
      </p>

      <div className="space-y-3 pt-2">
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-1">Immediate (0-4 wks)</p>
          <p className="text-xs text-dim">{card.layer1}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-1">Near-term (1-6 mths)</p>
          <p className="text-xs text-dim">{card.layer2}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-1">Structural (6-24 mths)</p>
          <p className="text-xs text-dim">{card.layer3}</p>
        </div>
        <div className="bg-[#f0eeea] rounded p-2 mt-2">
          <p className="text-xs text-dim">
            <span className="font-medium text-text2">Asset Map: </span>
            {card.assetMap}
          </p>
        </div>
      </div>
    </div>
  )
}

function ThesisCard({ thesis }: { thesis: Thesis }) {
  return (
    <div className="bg-surface border border-border rounded-[8px] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-text flex-1">
          {thesis.name}
        </h4>
        <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${getStrengthColor(thesis.strength)}`}>
          {thesis.strength.toUpperCase()}
        </span>
      </div>

      <p className="text-sm text-text2 leading-relaxed">
        {thesis.body}
      </p>

      <div className="bg-[#f0eeea] rounded p-3 border-l-2 border-text2">
        <p className="text-xs font-semibold tracking-[0.05em] uppercase text-muted mb-1">Today's Update</p>
        <p className="text-xs text-dim leading-relaxed">
          {thesis.todayUpdate}
        </p>
      </div>
    </div>
  )
}
