'use client'

import { useState, useRef, useEffect } from 'react'
import { Profile, Holding } from '@/lib/types'
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

// Client-side sector map — covers NZX, ASX, and major US stocks.
// This is the primary source: no API call needed, works instantly.
const TICKER_SECTORS: Record<string, string> = {
  // ── NZX ──────────────────────────────────────────────────────────────────
  AIR: 'Industrial',   SPK: 'Technology',  FPH: 'Healthcare',
  MEL: 'Utilities',   MCY: 'Utilities',   CEN: 'Utilities',
  SKC: 'Consumer',    PCT: 'Real Estate', ARG: 'Finance',
  VHP: 'Healthcare',  GTK: 'Technology',  EBO: 'Healthcare',
  SCL: 'Consumer',    NZR: 'Energy',      WHS: 'Consumer',
  RBD: 'Consumer',    MFT: 'Industrial',  KMD: 'Consumer',
  ATM: 'Consumer',    IFT: 'Finance',     SUM: 'Healthcare',
  OCA: 'Healthcare',  RYM: 'Healthcare',  HLG: 'Industrial',
  PFI: 'Real Estate', GMT: 'Real Estate', NPH: 'Healthcare',
  NZM: 'Real Estate', AIA: 'Industrial',  SKT: 'Technology',
  THL: 'Consumer',    MHJ: 'Consumer',    CVT: 'Materials',
  // ── ASX ──────────────────────────────────────────────────────────────────
  BHP: 'Materials',   CBA: 'Finance',     ANZ: 'Finance',
  WBC: 'Finance',     NAB: 'Finance',     RIO: 'Materials',
  WES: 'Consumer',    CSL: 'Healthcare',  MQG: 'Finance',
  WDS: 'Energy',      GMG: 'Real Estate', TLS: 'Technology',
  FMG: 'Materials',   TCL: 'Industrial',  REA: 'Technology',
  COL: 'Consumer',    WOW: 'Consumer',    NCM: 'Materials',
  ALL: 'Technology',  APA: 'Utilities',   ASX: 'Finance',
  MIN: 'Materials',   ORG: 'Energy',      STO: 'Energy',
  WTC: 'Technology',  XRO: 'Technology',  APX: 'Technology',
  // ── US Technology ─────────────────────────────────────────────────────────
  AAPL: 'Technology', MSFT: 'Technology', GOOGL: 'Technology',
  GOOG: 'Technology', META: 'Technology', NVDA: 'Technology',
  AMD: 'Technology',  INTC: 'Technology', AVGO: 'Technology',
  TSM: 'Technology',  MU: 'Technology',   QCOM: 'Technology',
  ORCL: 'Technology', CRM: 'Technology',  ADBE: 'Technology',
  NOW: 'Technology',  SNOW: 'Technology', PLTR: 'Technology',
  NFLX: 'Technology', SPOT: 'Technology', UBER: 'Technology',
  LYFT: 'Technology', ABNB: 'Technology', NET: 'Technology',
  DDOG: 'Technology', ZM: 'Technology',   TWLO: 'Technology',
  // ── US Finance ────────────────────────────────────────────────────────────
  JPM: 'Finance',     GS: 'Finance',      MS: 'Finance',
  BAC: 'Finance',     C: 'Finance',       WFC: 'Finance',
  BLK: 'Finance',     V: 'Finance',       MA: 'Finance',
  PYPL: 'Finance',    SQ: 'Finance',      COIN: 'Finance',
  AXP: 'Finance',     SCHW: 'Finance',    BRK: 'Finance',
  // ── US Consumer ───────────────────────────────────────────────────────────
  AMZN: 'Consumer',   TSLA: 'Consumer',   WMT: 'Consumer',
  COST: 'Consumer',   TGT: 'Consumer',    NKE: 'Consumer',
  SBUX: 'Consumer',   MCD: 'Consumer',    DIS: 'Consumer',
  HD: 'Consumer',     LOW: 'Consumer',    BABA: 'Consumer',
  // ── US Healthcare ─────────────────────────────────────────────────────────
  JNJ: 'Healthcare',  PFE: 'Healthcare',  UNH: 'Healthcare',
  ABBV: 'Healthcare', MRK: 'Healthcare',  LLY: 'Healthcare',
  BMY: 'Healthcare',  AMGN: 'Healthcare', GILD: 'Healthcare',
  // ── US Energy ─────────────────────────────────────────────────────────────
  XOM: 'Energy',      CVX: 'Energy',      COP: 'Energy',
  USO: 'Energy',      SLB: 'Energy',
  // ── US Industrial ─────────────────────────────────────────────────────────
  BA: 'Industrial',   CAT: 'Industrial',  GE: 'Industrial',
  HON: 'Industrial',  RTX: 'Industrial',  LMT: 'Industrial',
  UPS: 'Industrial',  FDX: 'Industrial',
  // ── US Materials / Commodities ────────────────────────────────────────────
  GLD: 'Materials',   SLV: 'Materials',   GOLD: 'Materials',
  // ── ETFs ──────────────────────────────────────────────────────────────────
  SPY: 'ETF',         QQQ: 'ETF',         VTI: 'ETF',
  IWM: 'ETF',         VOO: 'ETF',         VEA: 'ETF',
}

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

  const positions: Record<string, { name: string; totalShares: number; totalCost: number; currency: string }> = {}
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
    if (!positions[ticker]) positions[ticker] = { name, totalShares: 0, totalCost: 0, currency }
    if (isBuy) { positions[ticker].totalShares += shares; positions[ticker].totalCost += shares * price }
    else { positions[ticker].totalShares -= shares; positions[ticker].totalCost -= shares * price }
  })

  return Object.entries(positions)
    .filter(([, p]) => p.totalShares > 0)
    .map(([ticker, p]) => ({
      ticker, name: p.name,
      shares: Math.round(p.totalShares * 10000) / 10000,
      buy_price: p.totalShares > 0 ? Math.round((p.totalCost / p.totalShares) * 10000) / 10000 : 0,
      current_price: p.totalShares > 0 ? Math.round((p.totalCost / p.totalShares) * 10000) / 10000 : 0,
      sector: 'Other', currency: p.currency,
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

// ── Portfolio History Chart ──────────────────────────────────────────────────
function PortfolioHistoryChart({ holdings }: { holdings: Holding[] }) {
  const [data, setData] = useState<{ date: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)
  const tickerKey = holdings.map(h => h.ticker).sort().join(',')

  useEffect(() => {
    if (!holdings.length) { setLoading(false); return }
    setLoading(true)

    Promise.allSettled(
      holdings.map(h =>
        fetch(`/api/stock?ticker=${h.ticker}&currency=${h.currency}`)
          .then(r => r.json())
          .then((d: { prices?: { date: string; close: number }[] }) => ({
            shares: h.shares,
            prices: (d.prices || []) as { date: string; close: number }[],
          }))
          .catch(() => ({ shares: h.shares, prices: [] as { date: string; close: number }[] }))
      )
    ).then(results => {
      // Build per-stock price maps for carry-forward interpolation.
      // Different markets (NZX, ASX, NYSE) trade on different days, so a naive
      // date-union sum creates wild oscillation. Carry-forward fills gaps with
      // the last known closing price so every stock has a value on every date.
      const stockMaps = results
        .filter((r): r is PromiseFulfilledResult<{ shares: number; prices: { date: string; close: number }[] }> =>
          r.status === 'fulfilled' && r.value.prices.length > 0)
        .map(r => ({
          shares: r.value.shares,
          priceMap: Object.fromEntries(r.value.prices.map(p => [p.date, p.close])) as Record<string, number>,
          sortedDates: r.value.prices.map(p => p.date).sort(),
        }))

      if (!stockMaps.length) { setLoading(false); return }

      // Union of all trading dates across all markets
      const allDates = [...new Set(stockMaps.flatMap(s => s.sortedDates))].sort()

      // For each date, sum (shares × carry-forward price) across all stocks
      const series = allDates.map(date => {
        let total = 0
        for (const { shares, priceMap, sortedDates } of stockMaps) {
          if (priceMap[date] !== undefined) {
            total += shares * priceMap[date]
          } else {
            // Carry-forward: use the most recent available price before this date
            const prev = sortedDates.filter(d => d < date).pop()
            if (prev !== undefined) {
              total += shares * priceMap[prev]
            } else {
              // This stock has no history yet at this date — skip the whole date
              return null
            }
          }
        }
        return { date, value: total }
      }).filter((d): d is { date: string; value: number } => d !== null)

      setData(series)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey])

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-muted">Portfolio History</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (data.length < 2) return null

  const first = data[0].value
  const last = data[data.length - 1].value
  const totalReturn = ((last - first) / first) * 100
  const isUp = totalReturn >= 0
  const lineColor = isUp ? '#15803d' : '#dc2626'
  const fillColor = isUp ? 'rgba(21,128,61,0.06)' : 'rgba(220,38,38,0.06)'

  // Label every ~20 data points
  const labels = data.map((p, i) => {
    if (i === 0 || i === data.length - 1 || i % 20 === 0) return p.date.slice(5)
    return ''
  })

  const chartData = {
    labels,
    datasets: [{
      data: data.map(p => p.value),
      borderColor: lineColor,
      backgroundColor: fillColor,
      borderWidth: 2.5,
      pointRadius: 0,
      fill: true,
      tension: 0.4,
    }],
  }

  const minVal = Math.min(...data.map(d => d.value))
  const maxVal = Math.max(...data.map(d => d.value))
  const padding = (maxVal - minVal) * 0.1

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-muted mb-1">Portfolio History</p>
          <p className="text-2xl font-black text-text">
            ${last.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-dim mt-1">6-month total value</p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-black ${isUp ? 'text-green-text' : 'text-red-text'}`}>
            {isUp ? '+' : ''}{totalReturn.toFixed(1)}%
          </span>
          <p className="text-xs text-dim mt-1">
            {isUp ? '+' : ''}${Math.abs(last - first).toLocaleString('en-US', { maximumFractionDigits: 0 })} total return
          </p>
        </div>
      </div>

      <div className="h-48">
        <Line
          data={chartData}
          options={{
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => `$${((ctx.parsed.y ?? 0) as number).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 10 }, color: '#8a8078', maxRotation: 0 },
              },
              y: {
                min: minVal - padding,
                max: maxVal + padding,
                grid: { color: '#f0ede8' },
                ticks: {
                  font: { size: 10 },
                  color: '#8a8078',
                  callback: (v) => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                },
                position: 'right',
              },
            },
          }}
        />
      </div>
    </div>
  )
}

// ── Per-stock sparkline ──────────────────────────────────────────────────────
function StockSparkline({ ticker, currency, color, buyPrice }: {
  ticker: string; currency: string
  color: typeof PASTEL_PALETTE[0]; buyPrice: number
}) {
  const [prices, setPrices] = useState<{ date: string; close: number }[]>([])
  const [sector, setSector] = useState('')
  const [industry, setIndustry] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/stock?ticker=${ticker}&currency=${currency}`)
      .then(r => r.json())
      .then(d => {
        setPrices(d.prices || [])
        setSector(d.sector || '')
        setIndustry(d.industry || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ticker, currency])

  if (loading) {
    return (
      <div className="h-28 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }
  if (!prices.length) {
    return (
      <div className="h-20 flex items-center justify-center">
        <p className="text-xs text-muted">No price data available</p>
      </div>
    )
  }

  const first = prices[0].close
  const last = prices[prices.length - 1].close
  const pct6m = ((last - first) / first) * 100
  const vsEntry = buyPrice > 0 ? ((last - buyPrice) / buyPrice) * 100 : 0
  const isUp = pct6m >= 0
  const lineColor = isUp ? '#15803d' : '#dc2626'
  const fillColor = isUp ? 'rgba(21,128,61,0.07)' : 'rgba(220,38,38,0.07)'

  const labels = prices.map((p, i) => {
    if (i === 0 || i === prices.length - 1) return p.date.slice(5)
    const prev = prices[i - 1]
    if (p.date.slice(5, 7) !== prev.date.slice(5, 7)) return p.date.slice(5, 7)
    return ''
  })

  const chartData = {
    labels,
    datasets: [{
      data: prices.map(p => p.close),
      borderColor: lineColor,
      backgroundColor: fillColor,
      borderWidth: 2,
      pointRadius: 0,
      fill: true,
      tension: 0.35,
    }],
  }

  return (
    <div className="px-5 pb-5 pt-3">
      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div>
          <p className="text-[10px] text-muted uppercase tracking-wide font-bold">6-Month</p>
          <p className={`text-base font-black ${isUp ? 'text-green-text' : 'text-red-text'}`}>
            {isUp ? '+' : ''}{pct6m.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted uppercase tracking-wide font-bold">vs Entry</p>
          <p className={`text-base font-black ${vsEntry >= 0 ? 'text-green-text' : 'text-red-text'}`}>
            {vsEntry >= 0 ? '+' : ''}{vsEntry.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted uppercase tracking-wide font-bold">Current</p>
          <p className="text-base font-black text-text">${last.toFixed(2)}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          {sector && (
            <span style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
              className="text-xs font-bold px-3 py-1 rounded-full border">
              {sector}
            </span>
          )}
          {industry && (
            <span className="text-xs text-dim font-medium">{industry}</span>
          )}
        </div>
      </div>

      <div className="h-32">
        <Line
          data={chartData}
          options={{
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => `$${((ctx.parsed.y ?? 0) as number).toFixed(2)}` } },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 10 }, color: '#8a8078', maxRotation: 0 },
              },
              y: {
                grid: { color: '#f0ede8' },
                ticks: { font: { size: 10 }, color: '#8a8078', callback: (v) => `$${v}` },
                position: 'right',
              },
            },
          }}
        />
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PortfolioTab({
  profile, holdings, briefing, metrics,
  onAddHolding, onDeleteHolding, onUpdateProfile, loading,
}: PortfolioTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvMessage, setCsvMessage] = useState('')
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set())
  const [yahooSectors, setYahooSectors] = useState<Record<string, string>>({})
  // Live prices from Yahoo Finance — overrides DB-stored current_price
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const [pricesLoading, setPricesLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  // On mount, fetch live prices + sectors for all holdings from Yahoo Finance.
  // current_price in DB is set at import time (= buy price) — we need real market prices.
  const tickerKey = holdings.map(h => h.ticker).sort().join(',')
  useEffect(() => {
    if (!holdings.length) { setPricesLoading(false); return }
    setPricesLoading(true)
    Promise.allSettled(
      holdings.map(h =>
        fetch(`/api/stock?ticker=${h.ticker}&currency=${h.currency}`)
          .then(r => r.json())
          .then((d: { sector?: string; currentPrice?: number }) => ({
            ticker: h.ticker,
            sector: d.sector || 'Other',
            currentPrice: typeof d.currentPrice === 'number' ? d.currentPrice : null,
          }))
          .catch(() => ({ ticker: h.ticker, sector: 'Other', currentPrice: null }))
      )
    ).then(results => {
      const sectorMap: Record<string, string> = {}
      const priceMap: Record<string, number> = {}
      results.forEach(r => {
        if (r.status !== 'fulfilled') return
        sectorMap[r.value.ticker] = r.value.sector
        if (r.value.currentPrice !== null) priceMap[r.value.ticker] = r.value.currentPrice
      })
      setYahooSectors(sectorMap)
      setLivePrices(priceMap)
      setPricesLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey])

  // Get the best available price for a holding: live Yahoo price > DB price
  const getPrice = (h: Holding): number => livePrices[h.ticker] ?? h.current_price
  const [formData, setFormData] = useState({
    ticker: '', name: '', shares: '', buy_price: '', current_price: '',
    sector: 'Technology', currency: 'NZD',
  })

  // Recalculate metrics using live prices so value reflects today's market, not buy price
  const liveMetrics = (() => {
    const totalValue = holdings.reduce((sum, h) => sum + getPrice(h) * h.shares, 0)
    const costBasis  = holdings.reduce((sum, h) => sum + h.buy_price * h.shares, 0)
    const totalPL = totalValue - costBasis
    const totalPLPercent = costBasis > 0 ? (totalPL / costBasis) * 100 : 0
    const holdingsPL = holdings.map(h => ({
      ticker: h.ticker,
      plPercent: h.buy_price > 0 ? ((getPrice(h) - h.buy_price) / h.buy_price) * 100 : 0,
      value: getPrice(h) * h.shares,
    }))
    const best  = holdingsPL.length ? holdingsPL.reduce((a, b) => a.plPercent > b.plPercent ? a : b) : null
    const worst = holdingsPL.length ? holdingsPL.reduce((a, b) => a.plPercent < b.plPercent ? a : b) : null
    return { totalValue, costBasis, totalPL, totalPLPercent, bestPerformer: best, worstPerformer: worst }
  })()

  const portfolioBeta = calcPortfolioBeta(holdings, liveMetrics.totalValue)
  const diversification = calcDiversification(holdings, liveMetrics.totalValue)
  const allTickers = holdings.map(h => h.ticker)

  const newsSignals = briefing?.content.newsCards
    .filter(c => c.tickers && c.tickers.some(t => allTickers.includes(t)))
    .map(c => ({ ...c, affected: c.tickers!.filter(t => allTickers.includes(t)) }))
    .slice(0, 6) || []

  const toggleTicker = (ticker: string) => {
    setExpandedTickers(prev => {
      const next = new Set(prev)
      if (next.has(ticker)) next.delete(ticker)
      else next.add(ticker)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.ticker || !formData.name) return
    await onAddHolding({
      ticker: formData.ticker.toUpperCase(), name: formData.name,
      shares: parseFloat(formData.shares) || 0,
      buy_price: parseFloat(formData.buy_price) || 0,
      current_price: parseFloat(formData.current_price) || 0,
      sector: formData.sector, currency: formData.currency,
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
      if (!parsed.length) { setCsvMessage('Could not parse CSV. Use a Sharesies transaction export.'); return }

      // Fetch live prices + sectors for all tickers in parallel
      const yahooResults = await Promise.allSettled(
        parsed.map(h =>
          fetch(`/api/stock?ticker=${h.ticker}&currency=${h.currency}`)
            .then(r => r.json())
            .then((d: { sector?: string; industry?: string; currentPrice?: number }) => ({
              ticker: h.ticker,
              sector: d.sector || 'Other',
              industry: d.industry || '',
              currentPrice: typeof d.currentPrice === 'number' ? d.currentPrice : null,
            }))
            .catch(() => ({ ticker: h.ticker, sector: 'Other', industry: '', currentPrice: null }))
        )
      )
      const sectorMap: Record<string, string> = {}
      const importPriceMap: Record<string, number> = {}
      yahooResults.forEach(r => {
        if (r.status !== 'fulfilled') return
        sectorMap[r.value.ticker] = r.value.sector
        if (r.value.currentPrice !== null) importPriceMap[r.value.ticker] = r.value.currentPrice
      })

      let added = 0
      for (const h of parsed) {
        const baseTicker = h.ticker.toUpperCase().split('.')[0]
        const sector = TICKER_SECTORS[baseTicker] || sectorMap[h.ticker] || 'Other'
        // Use live market price if available; fall back to average buy price
        const current_price = importPriceMap[h.ticker] ?? h.buy_price
        await onAddHolding({ ...h, sector, current_price })
        added++
      }

      // Update live price + sector state, auto-expand newly imported tickers
      setYahooSectors(prev => ({ ...prev, ...sectorMap }))
      setLivePrices(prev => ({ ...prev, ...importPriceMap }))
      setExpandedTickers(new Set(parsed.map(h => h.ticker)))
      setCsvMessage(`Imported ${added} position${added !== 1 ? 's' : ''} — prices & sectors live from Yahoo.`)
    } catch {
      setCsvMessage('Error reading file.')
    } finally {
      setCsvImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const holdingsWithPL = holdings.map(h => {
    const livePrice = getPrice(h)
    return {
      ...h,
      current_price: livePrice,
      pl: (livePrice - h.buy_price) * h.shares,
      plPercent: h.buy_price > 0 ? ((livePrice - h.buy_price) / h.buy_price) * 100 : 0,
      beta: STOCK_BETAS[h.ticker.toUpperCase()] ?? 1.0,
      weight: liveMetrics.totalValue > 0 ? (livePrice * h.shares) / liveMetrics.totalValue * 100 : 0,
    }
  })

  const effectiveSectors = holdings.map(h => {
    const baseTicker = h.ticker.toUpperCase().split('.')[0]
    const sector =
      TICKER_SECTORS[baseTicker] ||
      yahooSectors[h.ticker] ||
      (h.sector && h.sector !== 'Other' ? h.sector : null) ||
      'Other'
    return { sector, value: getPrice(h) * h.shares }
  })

  const sectorAllocation = effectiveSectors.reduce((acc, h) => {
    const ex = acc.find(s => s.sector === h.sector)
    if (ex) ex.value += h.value
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
      borderWidth: 2, borderRadius: 6,
    }],
  }

  const getRecommendation = (h: typeof holdingsWithPL[0]) => {
    const { plPercent, beta } = h
    const cons = profile.risk_tolerance === 'conservative' || profile.risk_tolerance === 'low'
    const agg = profile.risk_tolerance === 'aggressive' || profile.risk_tolerance === 'growth'
    if (plPercent > 60 && cons) return { action: 'REDUCE', style: 'bg-amber-bg text-amber-text border-amber-text/30' }
    if (plPercent < -25 && cons) return { action: 'SELL', style: 'bg-red-bg text-red-text border-red-text/30' }
    if (plPercent < -15 && agg && profile.horizon === 'long') return { action: 'ADD', style: 'bg-green-bg text-green-text border-green-text/30' }
    if (plPercent > 40 && profile.horizon === 'short') return { action: 'TAKE PROFIT', style: 'bg-amber-bg text-amber-text border-amber-text/30' }
    if (beta > 1.8 && cons) return { action: 'REDUCE', style: 'bg-amber-bg text-amber-text border-amber-text/30' }
    if (plPercent > 0) return { action: 'HOLD', style: 'bg-blue-bg text-blue-text border-blue-text/30' }
    return { action: 'HOLD', style: 'bg-surface2 text-text2 border-border' }
  }

  return (
    <div className="space-y-10">

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard
          label="Total Value"
          value={pricesLoading ? '...' : `$${liveMetrics.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        />
        <MetricCard label="Cost Basis" value={`$${liveMetrics.costBasis.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} />
        <MetricCard
          label="Unrealised P&L"
          value={pricesLoading ? '...' : `${liveMetrics.totalPL >= 0 ? '+' : ''}$${Math.abs(liveMetrics.totalPL).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          accent={liveMetrics.totalPL >= 0 ? 'text-green-text' : 'text-red-text'}
        />
        <MetricCard
          label="Return"
          value={pricesLoading ? '...' : `${liveMetrics.totalPLPercent >= 0 ? '+' : ''}${liveMetrics.totalPLPercent.toFixed(1)}%`}
          accent={liveMetrics.totalPLPercent >= 0 ? 'text-green-text' : 'text-red-text'}
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

      {/* Portfolio History Chart */}
      {holdings.length > 0 && <PortfolioHistoryChart holdings={holdings} />}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-text text-bg font-semibold text-sm rounded-full hover:opacity-90 transition-opacity shadow-soft">
          + Add Position
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={csvImporting}
          className="px-6 py-3 bg-surface border border-border text-text2 font-semibold text-sm rounded-full hover:bg-surface2 transition-colors disabled:opacity-50 shadow-soft">
          {csvImporting ? 'Detecting sectors...' : 'Import Sharesies CSV'}
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
        {csvMessage && (
          <span className="text-sm text-green-text font-medium bg-green-bg px-4 py-2 rounded-full border border-green-text/20">
            {csvMessage}
          </span>
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
              <input key={key} type={type} placeholder={placeholder} step="0.0001"
                value={formData[key as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                className="px-4 py-3 bg-bg border border-border rounded-xl text-text text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                required={key === 'ticker' || key === 'name'} />
            ))}
            <select value={formData.sector} onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              className="px-4 py-3 bg-bg border border-border rounded-xl text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent">
              {['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial', 'Materials', 'Utilities', 'Real Estate', 'Other'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="px-4 py-3 bg-bg border border-border rounded-xl text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent">
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

      {/* Charts row */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-muted mb-1">Sector Allocation</h3>
            <p className="text-xs text-dim mb-4">Auto-detected from Yahoo Finance</p>
            <div className="h-56">
              <Doughnut data={doughnutData} options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 14 } } },
              }} />
            </div>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-card">
            <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-muted mb-5">Position P&L</h3>
            <div className="h-56">
              <Bar data={barData} options={{
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { color: '#e8e3db' }, ticks: { callback: (v) => `$${v}` } },
                  y: { grid: { display: false } },
                },
              }} />
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
                high: 'border-l-red-text bg-red-bg/40',
                medium: 'border-l-amber-text bg-amber-bg/40',
                low: 'border-l-green-text bg-green-bg/40',
              }
              return (
                <div key={idx} className={`rounded-2xl border border-border border-l-4 p-5 shadow-card ${impactColors[signal.impact] || ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-text2 uppercase tracking-wide">{signal.tag}</span>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {signal.affected.map(t => {
                        const color = getStockColor(t, allTickers)
                        return (
                          <span key={t} style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                            className="text-xs px-2.5 py-0.5 rounded-full font-bold border">{t}</span>
                        )
                      })}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-text leading-snug mb-1.5">{signal.headline}</p>
                  <p className="text-xs text-dim leading-relaxed">{signal.layer1}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Holdings — cards with expandable charts */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-muted">Holdings</h3>
          {holdings.length > 0 && (
            <button
              onClick={() => setExpandedTickers(expandedTickers.size === holdings.length ? new Set() : new Set(allTickers))}
              className="text-xs text-accent font-semibold hover:underline underline-offset-2"
            >
              {expandedTickers.size === holdings.length ? 'Collapse all charts' : 'Show all charts'}
            </button>
          )}
        </div>

        {holdings.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl py-20 text-center shadow-card">
            <div className="w-14 h-14 rounded-full bg-surface2 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-text2 font-semibold mb-1">No positions yet</p>
            <p className="text-dim text-sm">Add a position or import from Sharesies</p>
          </div>
        ) : (
          <div className="space-y-3">
            {holdingsWithPL.map((holding) => {
              const rec = getRecommendation(holding)
              const color = getStockColor(holding.ticker, allTickers)
              const isExpanded = expandedTickers.has(holding.ticker)
              const effectiveSector = yahooSectors[holding.ticker] || holding.sector || 'Other'

              return (
                <div key={holding.ticker}
                  className={`bg-surface border rounded-2xl shadow-card overflow-hidden transition-all ${
                    isExpanded ? 'border-border2' : 'border-border hover:border-border2'
                  }`}
                  style={isExpanded ? { borderLeftWidth: 4, borderLeftColor: color.line } : {}}
                >
                  {/* Row */}
                  <div
                    className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
                    onClick={() => toggleTicker(holding.ticker)}
                  >
                    {/* Ticker chip */}
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <span style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                        className="text-xs font-black px-2.5 py-1 rounded-lg border min-w-[54px] text-center flex-shrink-0">
                        {holding.ticker}
                      </span>
                      <div className="hidden sm:block min-w-0">
                        <p className="text-xs font-semibold text-text2 truncate max-w-[100px]">{holding.name}</p>
                        <p className="text-[10px] text-muted">{effectiveSector}</p>
                      </div>
                    </div>

                    {/* Weight bar */}
                    <div className="hidden md:flex items-center gap-2 w-24">
                      <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(holding.weight, 100)}%` }} />
                      </div>
                      <span className="text-xs text-dim w-9 text-right flex-shrink-0">{holding.weight.toFixed(1)}%</span>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wide font-bold">Value</p>
                        <p className="text-sm font-bold text-text">
                          ${(holding.current_price * holding.shares).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wide font-bold">P&L</p>
                        <p className={`text-sm font-bold ${holding.plPercent >= 0 ? 'text-green-text' : 'text-red-text'}`}>
                          {holding.plPercent >= 0 ? '+' : ''}{holding.plPercent.toFixed(1)}%
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[10px] text-muted uppercase tracking-wide font-bold">Shares</p>
                        <p className="text-sm font-semibold text-text2">{holding.shares.toFixed(2)}</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[10px] text-muted uppercase tracking-wide font-bold">Beta</p>
                        <p className={`text-sm font-semibold ${holding.beta > 1.5 ? 'text-red-text' : holding.beta > 1.1 ? 'text-amber-text' : 'text-green-text'}`}>
                          {holding.beta.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Signal + actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`hidden sm:inline-block px-3 py-1.5 text-xs font-bold rounded-full border ${rec.style}`}>
                        {rec.action}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteHolding(holding.ticker) }}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-red-text hover:bg-red-bg transition-all text-xs"
                      >✕</button>
                      <span className={`text-muted transition-transform duration-200 text-xs ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </div>

                  {/* Expandable chart */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      <StockSparkline
                        ticker={holding.ticker}
                        currency={holding.currency}
                        color={color}
                        buyPrice={holding.buy_price}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Risk Profile */}
      <div className="bg-surface border border-border rounded-2xl p-8 shadow-card">
        <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-muted mb-7">Your Risk Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <p className="text-xs font-bold text-text2 mb-4 tracking-wide uppercase">Risk Tolerance</p>
            <div className="flex flex-wrap gap-3">
              {(['conservative', 'low', 'moderate', 'growth', 'aggressive'] as const).map((level) => (
                <button key={level} onClick={() => onUpdateProfile({ risk_tolerance: level })}
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
                <button key={h} onClick={() => onUpdateProfile({ horizon: h })}
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
