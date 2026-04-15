'use client'

import { useState, useRef } from 'react'
import { Profile, Holding, RiskTolerance, Horizon } from '@/lib/types'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

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

const SECTOR_COLORS = [
  '#1d4ed8', '#059669', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#6366f1',
]

interface PortfolioTabProps {
  profile: Profile
  holdings: Holding[]
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

  // Detect Sharesies CSV columns
  const cols = header.split(',').map(c => c.trim().replace(/"/g, ''))
  const tickerCol = cols.findIndex(c => c.includes('instrument code') || c.includes('ticker') || c.includes('symbol'))
  const nameCol = cols.findIndex(c => c.includes('instrument name') || c.includes('name'))
  const sharesCol = cols.findIndex(c => c.includes('units') || c.includes('shares') || c.includes('quantity'))
  const priceCol = cols.findIndex(c => c.includes('price'))
  const directionCol = cols.findIndex(c => c.includes('direction') || c.includes('type') || c.includes('order'))
  const marketCol = cols.findIndex(c => c.includes('market') || c.includes('exchange'))

  if (tickerCol === -1) return []

  const positions: Record<string, { name: string; totalShares: number; totalCost: number; sector: string; currency: string; market: string }> = {}

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

export default function PortfolioTab({
  profile,
  holdings,
  metrics,
  onAddHolding,
  onDeleteHolding,
  onUpdateProfile,
  loading,
}: PortfolioTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvMessage, setCsvMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    ticker: '',
    name: '',
    shares: '',
    buy_price: '',
    current_price: '',
    sector: 'Technology',
    currency: 'NZD',
  })

  const portfolioBeta = calcPortfolioBeta(holdings, metrics.totalValue)
  const diversification = calcDiversification(holdings, metrics.totalValue)

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
      let added = 0
      for (const holding of parsed) {
        await onAddHolding(holding)
        added++
      }
      setCsvMessage(`Imported ${added} position${added !== 1 ? 's' : ''} from Sharesies.`)
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

  const sectorAllocation = holdings.reduce((acc, h) => {
    const value = h.current_price * h.shares
    const existing = acc.find(s => s.sector === h.sector)
    if (existing) existing.value += value
    else acc.push({ sector: h.sector, value })
    return acc
  }, [] as { sector: string; value: number }[])

  const doughnutData = {
    labels: sectorAllocation.map(s => s.sector),
    datasets: [{
      data: sectorAllocation.map(s => s.value),
      backgroundColor: SECTOR_COLORS.slice(0, sectorAllocation.length),
      borderColor: '#f4f3ef',
      borderWidth: 3,
    }],
  }

  const barData = {
    labels: holdingsWithPL.map(h => h.ticker),
    datasets: [{
      label: 'P&L ($)',
      data: holdingsWithPL.map(h => h.pl),
      backgroundColor: holdingsWithPL.map(h => h.pl >= 0 ? '#059669' : '#dc2626'),
      borderRadius: 6,
    }],
  }

  const getRecommendation = (holding: typeof holdingsWithPL[0]) => {
    const { plPercent, beta } = holding
    const isConservative = profile.risk_tolerance === 'conservative' || profile.risk_tolerance === 'low'
    const isAggressive = profile.risk_tolerance === 'aggressive' || profile.risk_tolerance === 'growth'

    if (plPercent > 60 && isConservative) return { action: 'REDUCE', style: 'bg-amber-bg text-amber-text border-amber/30' }
    if (plPercent < -25 && isConservative) return { action: 'SELL', style: 'bg-red-bg text-red-text border-red/30' }
    if (plPercent < -15 && isAggressive && profile.horizon === 'long') return { action: 'ADD', style: 'bg-green-bg text-green-text border-green/30' }
    if (plPercent > 40 && profile.horizon === 'short') return { action: 'TAKE PROFIT', style: 'bg-amber-bg text-amber-text border-amber/30' }
    if (beta > 1.8 && isConservative) return { action: 'REDUCE', style: 'bg-amber-bg text-amber-text border-amber/30' }
    if (plPercent > 20) return { action: 'HOLD', style: 'bg-blue-bg text-blue-text border-blue/30' }
    if (plPercent > 0) return { action: 'HOLD', style: 'bg-blue-bg text-blue-text border-blue/30' }
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
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-text text-bg font-semibold text-sm rounded-[8px] hover:opacity-90 transition-opacity"
        >
          + Add Position
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={csvImporting}
          className="px-4 py-2.5 bg-surface border border-border text-text2 font-semibold text-sm rounded-[8px] hover:bg-surface2 transition-colors disabled:opacity-50"
        >
          {csvImporting ? 'Importing...' : 'Import Sharesies CSV'}
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
        {csvMessage && (
          <span className="text-sm text-green-text font-medium">{csvMessage}</span>
        )}
      </div>

      {/* Add Position Form */}
      {showForm && (
        <div className="bg-surface border border-border rounded-[10px] p-6">
          <h3 className="text-base font-bold text-text mb-5">Add Position</h3>
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
            <div className="flex gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-text text-bg font-semibold text-sm rounded-[8px] hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Adding...' : 'Add Position'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border border-border text-text2 font-semibold text-sm rounded-[8px] hover:bg-surface2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Charts */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-surface border border-border rounded-[10px] p-6">
            <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-muted mb-5">Sector Allocation</h3>
            <div className="h-56">
              <Doughnut
                data={doughnutData}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } },
                }}
              />
            </div>
          </div>
          <div className="bg-surface border border-border rounded-[10px] p-6">
            <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-muted mb-5">Position P&L</h3>
            <div className="h-56">
              <Bar
                data={barData}
                options={{
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { color: '#e0ddd8' } }, y: { grid: { display: false } } },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <div>
        <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-muted mb-4">Holdings</h3>
        <div className="bg-surface border border-border rounded-[10px] overflow-hidden">
          {holdings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text2 font-medium mb-1">No positions yet</p>
              <p className="text-dim text-sm">Add your first position or import from Sharesies</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface2 border-b border-border">
                    {['Ticker', 'Weight', 'Shares', 'Buy Price', 'Current', 'Value', 'P&L %', 'Beta', 'Recommendation', ''].map(h => (
                      <th key={h} className={`px-4 py-3.5 text-xs font-semibold tracking-[0.1em] uppercase text-muted ${h === '' || h === 'Recommendation' ? 'text-center' : h === 'Value' || h === 'Buy Price' || h === 'Current' || h === 'P&L %' || h === 'Beta' || h === 'Weight' ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdingsWithPL.map((holding) => {
                    const rec = getRecommendation(holding)
                    return (
                      <tr key={holding.ticker} className="border-b border-border last:border-0 hover:bg-surface2 transition-colors">
                        <td className="px-4 py-4">
                          <p className="font-bold text-text">{holding.ticker}</p>
                          <p className="text-xs text-muted truncate max-w-[120px]">{holding.name}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-surface2 rounded-full overflow-hidden">
                              <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(holding.weight, 100)}%` }} />
                            </div>
                            <span className="text-xs text-dim w-10 text-right">{holding.weight.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right text-dim">{holding.shares.toFixed(2)}</td>
                        <td className="px-4 py-4 text-right text-dim">${holding.buy_price.toFixed(2)}</td>
                        <td className="px-4 py-4 text-right text-dim">${holding.current_price.toFixed(2)}</td>
                        <td className="px-4 py-4 text-right font-semibold text-text">
                          ${(holding.current_price * holding.shares).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`px-4 py-4 text-right font-bold ${holding.plPercent >= 0 ? 'text-green-text' : 'text-red-text'}`}>
                          {holding.plPercent >= 0 ? '+' : ''}{holding.plPercent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={`text-xs font-semibold ${holding.beta > 1.5 ? 'text-red-text' : holding.beta > 1.1 ? 'text-amber-text' : 'text-green-text'}`}>
                            {holding.beta.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-md border ${rec.style}`}>
                            {rec.action}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => onDeleteHolding(holding.ticker)}
                            className="text-muted hover:text-red-text transition-colors text-xs font-medium"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Risk Profile */}
      <div className="bg-surface border border-border rounded-[10px] p-6">
        <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-muted mb-5">Your Risk Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-semibold text-text2 mb-3">Risk Tolerance</p>
            <div className="flex flex-wrap gap-2">
              {(['conservative', 'low', 'moderate', 'growth', 'aggressive'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => onUpdateProfile({ risk_tolerance: level })}
                  className={`px-4 py-2 rounded-[8px] text-xs font-semibold transition-all ${
                    profile.risk_tolerance === level
                      ? 'bg-text text-bg shadow-sm'
                      : 'bg-surface2 text-text2 border border-border hover:border-border2'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-text2 mb-3">Time Horizon</p>
            <div className="flex gap-2">
              {(['short', 'long'] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => onUpdateProfile({ horizon: h })}
                  className={`px-5 py-2 rounded-[8px] text-xs font-semibold transition-all ${
                    profile.horizon === h
                      ? 'bg-text text-bg shadow-sm'
                      : 'bg-surface2 text-text2 border border-border hover:border-border2'
                  }`}
                >
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
    <div className="bg-surface border border-border rounded-[10px] p-4 hover:border-border2 transition-colors">
      <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-2">{label}</p>
      <p className={`text-xl font-bold ${accent || 'text-text'}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  )
}
