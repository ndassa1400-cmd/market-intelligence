'use client'

import { Profile, Briefing, NewsCard, Mover, Thesis } from '@/lib/types'

interface IntelligenceTabProps {
  briefing: Briefing | null
  profile: Profile
  loading?: boolean
  userTickers?: string[]
}

const IMPACT_STYLES = {
  high: {
    bar: 'bg-red-text',
    tag: 'bg-red-bg text-red-text border border-red-text/20',
    card: 'border-l-4 border-l-red-text',
  },
  medium: {
    bar: 'bg-amber-text',
    tag: 'bg-amber-bg text-amber-text border border-amber-text/20',
    card: 'border-l-4 border-l-amber-text',
  },
  low: {
    bar: 'bg-green-text',
    tag: 'bg-green-bg text-green-text border border-green-text/20',
    card: 'border-l-4 border-l-green-text',
  },
}

const STRENGTH_STYLES: Record<string, string> = {
  'Strengthening': 'bg-green-bg text-green-text border border-green-text/20',
  'Holding': 'bg-blue-bg text-blue-text border border-blue-text/20',
  'Weakening': 'bg-red-bg text-red-text border border-red-text/20',
  'New': 'bg-pastel-5 text-pastel-5t border border-pastel-5t/20',
}

export default function IntelligenceTab({ briefing, profile, loading, userTickers = [] }: IntelligenceTabProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-5">
        <div className="w-10 h-10 border-[3px] border-accent-bg border-t-accent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm font-bold tracking-[0.15em] uppercase text-text2">Generating Briefing</p>
          <p className="text-dim text-sm mt-2">Scanning global markets and world news — takes ~20 seconds</p>
        </div>
      </div>
    )
  }

  if (!briefing) {
    return (
      <div className="text-center py-32">
        <p className="text-sm font-bold tracking-[0.15em] uppercase text-muted">No Briefing Available</p>
        <p className="text-dim text-sm mt-2">Refresh the page to try again.</p>
      </div>
    )
  }

  const { content } = briefing
  const highImpact = content.newsCards.filter(c => c.impact === 'high')
  const otherCards = content.newsCards.filter(c => c.impact !== 'high')

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

      {/* Macro Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-accent to-blue rounded-[12px] px-7 py-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <p className="text-xs font-bold tracking-[0.2em] uppercase opacity-70 mb-2">Macro Summary</p>
        <p className="text-sm leading-relaxed opacity-95 max-w-3xl">{content.macroSummary}</p>
      </div>

      {/* Market Levels */}
      <div>
        <SectionHeader num="00" title="Market Levels" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
          {Object.entries(content.marketLevels).map(([key, val]) => {
            const v = String(val)
            const isUp = v.includes('+')
            const isDown = v.includes('-') && !v.startsWith('-') && !v.includes('5.')
            return (
              <div key={key} className={`rounded-[10px] p-4 border transition-all hover:shadow-sm ${
                isUp ? 'bg-green-bg border-green-text/20' :
                isDown ? 'bg-red-bg border-red-text/20' :
                'bg-surface border-border'
              }`}>
                <p className="text-xs font-bold tracking-[0.1em] uppercase text-muted mb-1.5">{key}</p>
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

      {/* All Other News */}
      <div>
        <SectionHeader num="02" title="Global News Scan" badge={`${otherCards.length} stories`} badgeColor="bg-surface2 text-text2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {otherCards.map((card, idx) => (
            <NewsCardComponent key={idx} card={card} userTickers={userTickers} />
          ))}
        </div>
      </div>

      {/* Movers */}
      <div>
        <SectionHeader num="03" title="Short-Term Movers" />
        <div className="bg-surface border border-border rounded-[12px] overflow-hidden mt-6 shadow-sm">
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
        <SectionHeader num="04" title="Long-Term Themes" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {content.theses.map((thesis, idx) => (
            <ThesisCard key={idx} thesis={thesis} idx={idx} />
          ))}
        </div>
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
  const colors = ['bg-red-text', 'bg-amber-text', 'bg-amber-text', 'bg-green-text', 'bg-green-text',
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
  const style = IMPACT_STYLES[card.impact] || IMPACT_STYLES.low
  const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(card.searchQuery || card.headline)}&hl=en`
  const affectedOwned = (card.tickers || []).filter(t => userTickers.includes(t))

  return (
    <div className={`bg-surface rounded-[12px] overflow-hidden shadow-sm hover:shadow-md transition-all border border-border ${style.card}`}>
      <div className="p-5 space-y-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <span className="text-xs font-bold tracking-[0.08em] uppercase text-text2 px-2.5 py-1 bg-surface2 border border-border rounded-md">
            {card.tag}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap ${style.tag}`}>
            {card.impact.toUpperCase()} IMPACT
          </span>
        </div>

        {/* Headline */}
        <h4 className={`font-black text-text leading-snug ${featured ? 'text-lg' : 'text-base'}`}>
          {card.headline}
        </h4>

        <p className="text-sm text-text2 leading-relaxed">{card.what}</p>

        {/* Affected tickers from user portfolio */}
        {affectedOwned.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-accent">Affects your holdings:</span>
            {affectedOwned.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 bg-accent text-white rounded font-bold">{t}</span>
            ))}
          </div>
        )}

        {/* Layers */}
        <div className="space-y-2 pt-1 border-t border-border">
          <LayerRow label="0–4 wks" text={card.layer1} color="text-amber-text" />
          <LayerRow label="1–6 mths" text={card.layer2} color="text-blue-text" />
          <LayerRow label="6–24 mths" text={card.layer3} color="text-accent-text" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-dim leading-relaxed flex-1">
            <span className="font-bold text-text2">Assets: </span>{card.assetMap}
          </p>
          <a href={searchUrl} target="_blank" rel="noopener noreferrer"
            className="ml-4 text-xs font-bold text-accent hover:text-accent-text whitespace-nowrap underline underline-offset-2">
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

function ThesisCard({ thesis, idx }: { thesis: Thesis; idx: number }) {
  const pastel = THESIS_PASTELS[idx % THESIS_PASTELS.length]
  const strengthStyle = STRENGTH_STYLES[thesis.strength] || 'bg-surface2 text-dim border-border'
  return (
    <div className={`rounded-[12px] p-5 space-y-4 border-l-4 border border-border shadow-sm hover:shadow-md transition-all ${pastel}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-black text-text flex-1 leading-snug text-base">{thesis.name}</h4>
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
