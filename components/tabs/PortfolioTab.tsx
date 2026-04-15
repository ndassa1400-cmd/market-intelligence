'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Profile, Holding, RiskTolerance, Horizon } from '@/lib/types'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)

// Known betas for common stocks
const STOCK_BETAS: Record<string, number> = {
  NVDA: 1.72, AAPL: 1.24, MSFT: 0.90, TSLA: 2.01, AMZN: 1.15,
  GOOGL: 1.06, META: 1.31, AMD: 1.65, INTC: 0.85, AVGO: 1.15,
  TSM: 1.20, MU: 1.50, QCOM: 1.20, ORCL: 1.05, CRM: 1.15,
  JPM: 1.10, GS: 1.35, MS: 1.40, BAC: 1.25, C: 1.30,
  XOM: 0.89, CVX: 0.85, GLD: 0.08, SLV: 0.60, USO: 1.10,
  JNJ: 0.65, PFE: 0.70, UNH: 0.75, ABBV: 0.65, MRK: 0.55,
  WMT: 0.55, COST: 0.95, TGT: 0.85,
  BHP: 1.18, CBA: 0.85, ANZ: 0.90, WBC: 0.88, NAB: 0.92,
  RIO: 1.10, WES: 0.75, CSL: 0.80, MQG: 1.20, WDS: 1.10,
  AIR: 1.20, SPK: 0.65, FPH: 0.85, MEL: 0.55, MCY: 0.50,
  V: 0.95, MA: 1.05, PYPL: 1.50, SQ: 1.80,
  NFLX: 1.20, DIS: 1.10, SPOT: 1.40,
}

import { Briefing } from '@/lib/types'

interface StockData {
  sector: string
  industry: string
  currentPrice: number | null
  prices: { date: string; close: number }[]
}

interface PortfolioTabProps {
  profile: Profile
  holdings: Holding[]
  briefing?: Briefing | null
  metrics: {
    totalValue: number
    costBasis: number
    totalPL: number
    totalPLPercent: number
    bestPerformer: { ticker: string; plPercent: number } | null
    worstPerformer: { ticker: string; plPercent: number } | null
  }
  onAddHolding: (data: Omit<Holding, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  onDeleteHolding: (ticker: string) => Promise<void>
  onUpdateProfile: (updates: Partial<Profile>) => Promise<void>
  loading: boolean
}

function calcPortfolioBeta(holdings: Holding[], totalValue: number): number {
  if (totalValue === 0 || holdings.length === 0) return 1.0
  return holdings.reduce((sum, h) => {
    const weight = (h.current_price * h.shares) / totalValue
    const beta = STOCK_BETAS[h.ticker.toUpperCase()] ?? 1.0
    return sum + weight * beta
  }, 0)
}

function calcDiversification(holdings: Holding[], totalValue: number) {
  if (totalValue === 0 || holdings.length === 0) return { hhi: 0, label: 'N/A', color: 'text-muted', pct: 0 }
  const hhi = holdings.reduce((sum, h) => {
    const w = (h.current_price * h.shares) / totalValue
    return sum + w * w * 10000
  }, 0)
  let label: string, color: string, pct: number
  if (hhi < 1000) { label = 'Excellent'; color = 'text-green-text'; pct = 95 }
  else if (hhi < 1800) { label = 'Good'; color = 'text-green-text'; pct = 75 }
  else if (hhi < 2500) { label = 'Moderate'; color = 'text-amber-text'; pct = 50 }
  else if (hhi < 4000) { label = 'Concentrated'; color = 'text-red-text'; pct = 30 }
  else { label = 'High Risk'; color = 'text-red-text'; pct = 15 }
  return { hhi: Math.round(hhi), label, color, pct }
}

function parseSharesiesCSV(text: string): Array<Omit<Holding, 'id' | 'user_id' | 'created_at' | 'updated_at'>> {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0].toLowerCase()

  const cols = header.split(',').map(c => c.trim().replace(/"/g, ''))
  const tickerCol = cols.findIndex(c => c.includes('instrument code') || c.includes('ticker') || c.includes('symbol'))
  const nameCol = cols.findIndex(c => c.includes('instrument name') || c.includes('name'))
  const sharesCol = cols.findIndex(c => c.includes('units') || c.includes('shares') || c.includes('quantity'))
  const priceCol = cols.findIndex(c => c.includes('price'))
  const directionCol = cols.findIndex(c => c.includes('direction') || c.includes('type') || c.includes('order'))
  const marketCol = cols.findIndex(c => c.includes('market') || c.includes('exchange'))

  if (tickerCol === -1) return []

  const positions: Record<string, {
    name: string; totalShares: number; totalCost: number
    sector: string; currency: string; market: string
  }> = {}

  lines.slice(1).forEach(line => {
    const parts = line.split(',').map(p => p.trim().replace(/"/g, ''))
    const ticker = parts[tickerCol]?.toUpperCase()
    if (!ticker) return

    const direction = directionCol >= 0 ? parts[directionCol]?.toLowerCase() : 'buy'
    const isBuy = !direction || direction.includes('buy')
    const shares = sharesCol >= 0 ? parseFloat(parts[sharesCol]) || 0 : 0
    const price = priceCol >= 0 ? parseFloat(parts[priceCol]) || 0 : 0
    const name = nameCol >= 0 ? parts[nameCol] || ticker : ticker
    const market = marketCol >= 0 ? parts[marketCol] || 'NZX' : 'NZX'
    const currency = market === 'NZX' ? 'NZD' : market === 'ASX' ? 'AUD' : 'USD'

    if (!positions[ticker]) {
      positions[ticker] = { name, totalShares: 0, totalCost: 0, sector: 'Other', currency, market }
    }
    if (isBuy) {
      positions[ticker].totalShares += shares
      positions[ticker].totalCost += shares * price
    } else {
      positions[ticker].totalShares -= shares
      positions[ticker].totalCost -= shares * price
    }
  })

  return Object.entries(positions)
    .filter(([, p]) => p.totalShares > 0)
    .map(([ticker, p]) => ({
      ticker,
      name: p.name,
      shares: Math.round(p.totalShares * 10000) / 10000,
      buy_price: p.totalShares > 0 ? Math.round((p.totalCost / p.totalShares) * 10000) / 10000 : 0,
      current_price: p.totalShares > 0 ? Math.round((p.totalCost / p.totalShares) * 10000) / 10000 : 0,
      sector: 'Other',
      currency: p.currency,
    }))
}

const PASTEL_PALETTE = [
  { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4', line: '#be185d' },
  { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd', line: '#1d4ed8' },
  { bg: '#dcfce7', text: '#15803d', border: '#86efac', line: '#15803d' },
  { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', line: '#b45309' },
  { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe', line: '#7e22ce' },
  { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4', line: '#0f766e' },
  { bg: '#ffedd5', text: '#c2410c', border: '#fdba74', line: '#c2410c' },
  { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc', line: '#3730a3' },
  { bg: '#fdf2f8', text: '#9d174d', border: '#f0abfc', line: '#9d174d' },
  { bg: '#ecfccb', text: '#3f6212', border: '#bef264', line: '#3f6212' },
]

function getStockColor(ticker: string, allTickers: string[]) {
  const idx = allTickers.indexOf(ticker)
  return PASTEL_PALETTE[idx % PASTEL_PALETTE.length]
}

// Mini sparkline that fetches its own data
function StockSparkline({
  ticker, currency, color, buyPrice
}: { ticker: string; currency: string; color: typeof PASTEL_PALETTE[0]; buyPrice: number }) {
  const [data, setData] = useState<{ date: string; close: number }[]>([])
  const [sector, setSector] = useState<string>('')
  const [industry, setIndustry] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/stock?ticker=${ticker}&currency=${currency}`)
      .then(r => r.json())
      .then(d => {
        setData(d.prices || [])
        setSector(d.sector || '')
        setIndustry(d.industry || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ticker, currency])

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center">
        <p className="text-xs text-muted">No price history available</p>
      </div>
    )
  }

  const firstPrice = data[0].close
  const lastPrice = data[data.length - 1].close
  const pctChange = ((lastPrice - firstPrice) / firstPrice) * 100
  const isUp = pctChange >= 0
  const lineColor = isUp ? '#15803d' : '#dc2626'
  const fillColor = isUp ? 'rgba(21,128,61,0.08)' : 'rgba(220,38,38,0.08)'

  // Thin out labels — show one per month
  const labels = data.map((p, i) => {
    if (i === 0 || i === data.length - 1) return p.date.slice(5) // MM-DD
    const prev = data[i - 1]
    if (p.date.slice(5, 7) !== prev.date.slice(5, 7)) return p.date.slice(5, 7) // month change
    return ''
  })

  const chartData = {
    labels,
    datasets: [{
      data: data.map(p => p.close),
      borderColor: lineColor,
      backgroundColor: fillColor,
      borderWidth: 2,
      pointRadius: 0,
      fill: true,
      tension: 0.3,
    }],
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-medium">6-Month Return:</span>
          <span className={`text-sm font-black ${isUp ? 'text-green-text' : 'text-red-text'}`}>
            {isUp ? '+' : ''}{pctChange.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-medium">vs Buy Price:</span>
          <span className={`text-sm font-black ${lastPrice >= buyPrice ? 'text-green-text' : 'text-red-text'}`}>
            {lastPrice >= buyPrice ? '+' : ''}{(((lastPrice - buyPrice) / buyPrice) * 100).toFixed(1)}%
          </span>
        </div>
        {(sector || industry) && (
          <div className="ml-auto flex items-center gap-1.5">
            {sector && (
              <span style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                className="text-xs font-bold px-2.5 py-1 rounded-full border">
                {sector}
              </span>
            )}
            {industry && (
              <span className="text-xs text-muted italic">{industry}</span>
            )}
          </div>
        )}
      </div>
      <div className="h-28">
        <Line
          data={chartData}
          options={{
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: {
              callbacks: { label: (ctx) => `$${ctx.parsed.y.toFixed(2)}` }
            }},
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 10 }, color: '#a0a0a0', maxRotation: 0 },
              },
              y: {
                grid: { color: '#f0ede8' },
                ticks: { font: { size: 10 }, color: '#a0a0a0', callback: (v) => `$${v}` },
                position: 'right',
              },
            },
          }}
        />
      </div>
    </div>
  )
}

export default function PortfolioTab({
  profile,
  holdings,
  briefing,
  metrics,
  onAddHolding,
  onDeleteHolding,
  onUpdateProfile,
  loading,
}: PortfolioTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvMessage, setCsvMessage] = useState('')
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null)
  // Map of ticker → fetched sector (from Yahoo Finance after CSV import or on expand)
  const [yahooSectors, setYahooSectors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    ticker: '', name: '', shares: '', buy_price: '', current_price: '',
    sector: 'Technology', currency: 'NZD',
  })

  const portfolioBeta = calcPortfolioBeta(holdings, metrics.totalValue)
  const diversification = calcDiversification(holdings, metrics.totalValue)
  const allTickers = holdings.map(h => h.ticker)

  // News signals affecting user's holdings
  const newsSignals = briefing?.content.newsCards
    .filter(c => c.tickers && c.tickers.some(t => allTickers.includes(t)))
    .map(c => ({ ...c, affected: c.tickers!.filter(t => allTickers.includes(t)) }))
    .slice(0, 6) || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.ticker || !formData.name) return
    await onAddHolding({
      ticker: formData.ticker.toUpperCase(),
      name: formData.name,
      shares: parseFloat(formData.shares) || 0,
      buy_price: parseFloat(formData.buy_price) || 0,
      current_price: parseFloat(formData.current_price) || 0,
      sector: formData.sector,
      currency: formData.currency,
    })
    setFormData({ ticker: '', name: '', shares: '', buy_price: '', current_price: '', sector: 'Technology', currency: 'NZD' })
    setShowForm(false)
  }

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvImporting(true)
    setCsvMessage('')
    try {
      const text = await file.text()
      const parsed = parseSharesiesCSV(text)
      if (parsed.length === 0) {
        setCsvMessage('Could not parse CSV. Make sure it is a Sharesies transaction export.')
        return
      }

      // Fetch Yahoo Finance sectors for all tickers in parallel
      const sectorResults = await Promise.allSettled(
        parsed.map(h => fetch(`/api/stock?ticker=${h.ticker}&currency=${h.currency}`)
          .then(r => r.json())
          .then(d => ({ ticker: h.ticker, sector: d.sector || 'Other' }))
          .catch(() => ({ ticker: h.ticker, sector: 'Other' }))
        )
      )

      const sectorMap: Record<string, string> = {}
      sectorResults.forEach(r => {
        if (r.status === 'fulfilled') sectorMap[r.value.ticker] = r.value.sector
      })

      let added = 0
      for (const holding of parsed) {
        await onAddHolding({ ...holding, sector: sectorMap[holding.ticker] || 'Other' })
        added++
      }
      setYahooSectors(prev => ({ ...prev, ...sectorMap }))
      setCsvMessage(`Imported ${added} position${added !== 1 ? 's' : ''} — sectors auto-detected.`)
    } catch {
      setCsvMessage('Error reading file.')
    } finally {
      setCsvImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const holdingsWithPL = holdings.map(h => ({
    ...h,
    pl: (h.current_price - h.buy_price) * h.shares,
    plPercent: h.buy_price > 0 ? ((h.current_price - h.buy_price) / h.buy_price) * 100 : 0,
    beta: STOCK_BETAS[h.ticker.toUpperCase()] ?? 1.0,
    weight: metrics.totalValue > 0 ? (h.current_price * h.shares) / metrics.totalValue * 100 : 0,
  }))

  // Use Yahoo-detected sectors where available, fallback to holding.sector
  const effectiveSectors = holdings.map(h => ({
    ticker: h.ticker,
    sector: yahooSectors[h.ticker] || h.sector || 'Other',
    value: h.current_price * h.shares,
  }))

  const sectorAllocation = effectiveSectors.reduce((acc, h) => {
    const existing = acc.find(s => s.sector === h.sector)
    if (existing) existing.value += h.value
    else acc.push({ sector: h.sector, value: h.value })
    return acc
  }, [] as { sector: string; value: number }[])

  const doughnutData = {
    labels: sectorAllocation.map(s => s.sector),
    datasets: [{
      data: sectorAllocation.map(s => s.value),
      backgroundColor: PASTEL_PALETTE.slice(0, sectorAllocation.length).map(p => p.bg),
      borderColor: PASTEL_PALETTE.slice(0, sectorAllocation.length).map(p => p.border),
      borderWidth: 2,
    }],
  }

  const barData = {
    labels: holdingsWithPL.map(h => h.ticker),
    datasets: [{
      label: 'P&L ($)',
      data: holdingsWithPL.map(h => h.pl),
      backgroundColor: holdingsWithPL.map(h => h.pl >= 0 ? '#dcfce7' : '#fee2e2'),
      borderColor: holdingsWithPL.map(h => h.pl >= 0 ? '#15803d' : '#dc2626'),
      borderWidth: 2,
      borderRadius: 6,
    }],
  }

  const getRecommendation = (holding: typeof holdingsWithPL[0]) => {
    const { plPercent, beta } = holding
    const isConservative = profile.risk_tolerance === 'conservative' || profile.risk_tolerance === 'low'
    const isAggressive = profile.risk_tolerance === 'aggressive' || profile.risk_tolerance === 'growth'
    if (plPercent > 60 && isConservative) return { action: 'REDUCE', style: 'bg-amber-bg text-amber-text border-amber-text/30' }
    if (plPercent < -25 && isConservative) return { action: 'SELL', style: 'bg-red-bg text-red-text border-red-text/30' }
    if (plPercent < -15 && isAggressive && profile.horizon === 'long') return { action: 'ADD', style: 'bg-green-bg text-green-text border-green-text/30' }
    if (plPercent > 40 && profile.horizon === 'short') return { action: 'TAKE PROFIT', style: 'bg-amber-bg text-amber-text border-amber-text/30' }
    if (beta > 1.8 && isConservative) return { action: 'REDUCE', style: 'bg-amber-bg text-amber-text border-amber-text/30' }
    if (plPercent > 20) return { action: 'HOLD', style: 'bg-blue-bg text-blue-text border-blue-text/30' }
    if (plPercent > 0) return { action: 'HOLD', style: 'bg-blue-bg text-blue-text border-blue-text/30' }
    return { action: 'HOLD', style: 'bg-surface2 text-text2 border-border' }
  }

  return (
    <div className="space-y-10">

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard label="Total Value" value={`$${metrics.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
        <MetricCard label="Cost Basis" value={`$${metrics.costBasis.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
        <MetricCard
          label="Unrealised P&L"
          value={`${metrics.totalPL >= 0 ? '+' : ''}$${Math.abs(metrics.totalPL).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          accent={metrics.totalPL >= 0 ? 'text-green-text' : 'text-red-text'}
        />
        <MetricCard
          label="Return"
          value={`${metrics.totalPLPercent >= 0 ? '+' : ''}${metrics.totalPLPercent.toFixed(1)}%`}
          accent={metrics.totalPLPercent >= 0 ? 'text-green-text' : 'text-red-text'}
        />
        <MetricCard label="Holdings" value={`${holdings.length}`} />
        <MetricCard
          label="Portfolio Beta"
          value={portfolioBeta.toFixed(2)}
          accent={portfolioBeta > 1.5 ? 'text-red-text' : portfolioBeta > 1.1 ? 'text-amber-text' : 'text-green-text'}
          sub={portfolioBeta > 1.2 ? 'Higher market risk' : portfolioBeta < 0.8 ? 'Defensive' : 'Market-like'}
        />
        <MetricCard
          label="Diversification"
          value={diversification.label}
          accent={diversification.color}
          sub={`HHI ${diversification.hhi}`}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-text text-bg font-semibold text-sm rounded-full hover:opacity-90 transition-opacity shadow-soft"
        >
          + Add Position
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={csvImporting}
          className="px-6 py-3 bg-surface border border-border text-text2 font-semibold text-sm rounded-full hover:bg-surface2 transition-colors disabled:opacity-50 shadow-soft"
        >
          {csvImporting ? 'Detecting sectors...' : 'Import Sharesies CSV'}
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
        {csvMessage && (
          <span className="text-sm text-green-text font-medium bg-green-bg px-3 py-1.5 rounded-full">{csvMessage}</span>
        )}
      </div>

      {/* Add Position Form */}
      {showForm && (
        <div className="bg-surface border border-border rounded-2xl p-7 shadow-card">
          <h3 className="text-base font-bold text-text mb-6">Add Position</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { key: 'ticker', placeholder: 'Ticker (e.g. AAPL)', type: 'text' },
              { key: 'name', placeholder: 'Company Name', type: 'text' },
              { key: 'shares', placeholder: 'No. of Shares', type: 'number' },
              { key: 'buy_price', placeholder: 'Avg Buy Price', type: 'number' },
              { key: 'current_price', placeholder: 'Current Price', type: 'number' },
            ].map(({ key, placeholder, type }) => (
              <input
                key={key}
                type={type}
                placeholder={placeholder}
                step="0.0001"
                value={formData[key as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                className="px-3 py-2.5 bg-bg border border-border rounded-[8px] text-text text-sm placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                required={key === 'ticker' || key === 'name'}
              />
            ))}
            <select
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              className="px-3 py-2.5 bg-bg border border-border rounded-[8px] text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              {['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial', 'Materials', 'Utilities', 'Real Estate', 'Other'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="px-3 py-2.5 bg-bg border border-border rounded-[8px] text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              {['NZD', 'AUD', 'USD', 'GBP', 'EUR'].map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="flex gap-4 sm:col-span-2">
              <button type="submit" disabled={loading}
                className="flex-1 py-3 bg-text text-bg font-semibold text-sm rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity shadow-soft">
                {loading ? 'Adding...' : 'Add Position'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-7 py-3 border border-border text-text2 font-semibold text-sm rounded-full hover:bg-surface2 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Charts */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-muted mb-1">Sector Allocation</h3>
            <p className="text-xs text-dim mb-4">Auto-detected from Yahoo Finance</p>
            <div className="h-56">
              <Doughnut
                data={doughnutData}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } },
                  },
                }}
              />
            </div>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-muted mb-5">Position P&L</h3>
            <div className="h-56">
              <Bar
                data={barData}
                options={{
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: '#e4e0da' }, ticks: { callback: (v) => `$${v}` } },
                    y: { grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* News Signals */}
      {newsSignals.length > 0 && (
        <div>
          <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-accent mb-4">
            World Events Affecting Your Portfolio
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {newsSignals.map((signal, idx) => {
              const impactColors: Record<string, string> = {
                high: 'border-l-red-text bg-red-bg/30',
                medium: 'border-l-amber-text bg-amber-bg/30',
                low: 'border-l-green-text bg-green-bg/30',
              }
              return (
                <div key={idx} className={`rounded-2xl border border-border border-l-4 p-5 shadow-card ${impactColors[signal.impact] || ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-text2 uppercase tracking-wide">{signal.tag}</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {signal.affected.map(t => {
                        const color = getStockColor(t, allTickers)
                        return (
                          <span key={t} style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                            className="text-xs px-2 py-0.5 rounded font-bold border">
                            {t}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-text leading-snug mb-1">{signal.headline}</p>
                  <p className="text-xs text-dim leading-relaxed">{signal.layer1}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Holdings Table with expandable charts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-muted">Holdings</h3>
          <p className="text-xs text-dim">Click a row to see price history</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-card">
          {holdings.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-full bg-surface2 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-text2 font-semibold mb-1">No positions yet</p>
              <p className="text-dim text-sm">Add your first position or import from Sharesies</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface2 border-b border-border">
                    {['Ticker', 'Sector', 'Weight', 'Shares', 'Buy Price', 'Current', 'Value', 'P&L %', 'Beta', 'Signal', ''].map(h => (
                      <th key={h} className={`px-5 py-4 text-xs font-semibold tracking-[0.1em] uppercase text-muted whitespace-nowrap ${
                        h === '' || h === 'Signal' ? 'text-center' :
                        ['Value', 'Buy Price', 'Current', 'P&L %', 'Beta', 'Weight', 'Shares'].includes(h) ? 'text-right' : 'text-left'
                      }`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdingsWithPL.map((holding) => {
                    const rec = getRecommendation(holding)
                    const color = getStockColor(holding.ticker, allTickers)
                    const isExpanded = expandedTicker === holding.ticker
                    const effectiveSector = yahooSectors[holding.ticker] || holding.sector || 'Other'

                    return (
                      <>
                        <tr
                          key={holding.ticker}
                          onClick={() => setExpandedTicker(isExpanded ? null : holding.ticker)}
                          className={`border-b border-border transition-colors cursor-pointer select-none ${
                            isExpanded ? 'bg-mocha-bg/40' : 'hover:bg-surface2'
                          } ${isExpanded ? '' : 'last:border-0'}`}
                        >
                          {/* Ticker */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <span style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                                className="text-xs font-black px-2.5 py-1 rounded-lg border min-w-[54px] text-center">
                                {holding.ticker}
                              </span>
                              <p className="text-xs text-muted truncate max-w-[90px] hidden sm:block">{holding.name}</p>
                            </div>
                          </td>
                          {/* Sector */}
                          <td className="px-5 py-4">
                            <span className="text-xs text-dim">{effectiveSector}</span>
                          </td>
                          {/* Weight */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-14 h-1.5 bg-surface2 rounded-full overflow-hidden">
                                <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(holding.weight, 100)}%` }} />
                              </div>
                              <span className="text-xs text-dim w-10 text-right">{holding.weight.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right text-dim">{holding.shares.toFixed(2)}</td>
                          <td className="px-5 py-4 text-right text-dim">${holding.buy_price.toFixed(2)}</td>
                          <td className="px-5 py-4 text-right text-dim">${holding.current_price.toFixed(2)}</td>
                          <td className="px-5 py-4 text-right font-semibold text-text">
                            ${(holding.current_price * holding.shares).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </td>
                          <td className={`px-5 py-4 text-right font-bold ${holding.plPercent >= 0 ? 'text-green-text' : 'text-red-text'}`}>
                            {holding.plPercent >= 0 ? '+' : ''}{holding.plPercent.toFixed(1)}%
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className={`text-xs font-semibold ${holding.beta > 1.5 ? 'text-red-text' : holding.beta > 1.1 ? 'text-amber-text' : 'text-green-text'}`}>
                              {holding.beta.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-full border ${rec.style}`}>
                              {rec.action}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onDeleteHolding(holding.ticker)}
                              className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-red-text hover:bg-red-bg transition-all text-xs"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>

                        {/* Expandable chart row */}
                        {isExpanded && (
                          <tr key={`${holding.ticker}-chart`} className="bg-mocha-bg/20 border-b border-border">
                            <td colSpan={11} className="p-0">
                              <div className="border-l-4" style={{ borderColor: color.line }}>
                                <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                                  <span className="text-xs font-black tracking-wider uppercase" style={{ color: color.text }}>
                                    {holding.ticker}
                                  </span>
                                  <span className="text-xs text-muted">— 6 Month Price History</span>
                                </div>
                                <StockSparkline
                                  ticker={holding.ticker}
                                  currency={holding.currency}
                                  color={color}
                                  buyPrice={holding.buy_price}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Risk Profile */}
      <div className="bg-surface border border-border rounded-2xl p-8 shadow-card">
        <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-muted mb-7">Your Risk Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <p className="text-xs font-bold text-text2 mb-4 tracking-wide uppercase">Risk Tolerance</p>
            <div className="flex flex-wrap gap-3">
              {(['conservative', 'low', 'moderate', 'growth', 'aggressive'] as const).map((level) => (
                <button key={level}
                  onClick={() => onUpdateProfile({ risk_tolerance: level })}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                    profile.risk_tolerance === level
                      ? 'bg-text text-bg shadow-soft'
                      : 'bg-surface2 text-dim border border-border hover:border-border2 hover:text-text2'
                  }`}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-text2 mb-4 tracking-wide uppercase">Time Horizon</p>
            <div className="flex gap-3">
              {(['short', 'long'] as const).map((h) => (
                <button key={h}
                  onClick={() => onUpdateProfile({ horizon: h })}
                  className={`px-7 py-2.5 rounded-full text-xs font-bold transition-all ${
                    profile.horizon === h
                      ? 'bg-text text-bg shadow-soft'
                      : 'bg-surface2 text-dim border border-border hover:border-border2 hover:text-text2'
                  }`}>
                  {h === 'short' ? 'Short-term' : 'Long-term'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

function MetricCard({ label, value, accent = '', sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 hover:border-border2 hover:shadow-card transition-all shadow-card">
      <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted mb-2.5">{label}</p>
      <p className={`text-xl font-black ${accent || 'text-text'}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted mt-1.5 font-medium">{sub}</p>}
    </div>
  )
}
