'use client'

import { useState } from 'react'
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
  const [formData, setFormData] = useState({
    ticker: '',
    name: '',
    shares: '',
    buy_price: '',
    current_price: '',
    sector: 'Technology',
    currency: 'NZD',
  })

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

    setFormData({
      ticker: '',
      name: '',
      shares: '',
      buy_price: '',
      current_price: '',
      sector: 'Technology',
      currency: 'NZD',
    })
    setShowForm(false)
  }

  const sectorAllocation = holdings.reduce((acc, h) => {
    const value = h.current_price * h.shares
    const existing = acc.find(s => s.sector === h.sector)
    if (existing) {
      existing.value += value
    } else {
      acc.push({ sector: h.sector, value })
    }
    return acc
  }, [] as { sector: string; value: number }[])

  const doughnutData = {
    labels: sectorAllocation.map(s => s.sector),
    datasets: [
      {
        data: sectorAllocation.map(s => s.value),
        backgroundColor: ['#1a5c2a', '#1a3d6b', '#6b4800', '#8b1f1f', '#0f0f0f'],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  }

  const holdingsWithPL = holdings.map(h => ({
    ...h,
    pl: (h.current_price - h.buy_price) * h.shares,
    plPercent: h.buy_price > 0 ? ((h.current_price - h.buy_price) / h.buy_price) * 100 : 0,
  }))

  const barData = {
    labels: holdingsWithPL.map(h => h.ticker),
    datasets: [
      {
        label: 'P&L',
        data: holdingsWithPL.map(h => h.pl),
        backgroundColor: holdingsWithPL.map(h => h.pl >= 0 ? '#1a5c2a' : '#8b1f1f'),
        borderRadius: 4,
      },
    ],
  }

  const getRecommendation = (holding: Holding) => {
    const plPercent = holding.buy_price > 0 ? ((holding.current_price - holding.buy_price) / holding.buy_price) * 100 : 0

    if (plPercent > 50 && profile.risk_tolerance === 'conservative') {
      return { action: 'REDUCE', color: 'bg-amber-bg text-amber' }
    }
    if (plPercent < -20 && profile.risk_tolerance === 'aggressive' && profile.horizon === 'long') {
      return { action: 'ADD', color: 'bg-green-bg text-green' }
    }
    if (plPercent < -15 && profile.risk_tolerance === 'conservative') {
      return { action: 'SELL', color: 'bg-red-bg text-red' }
    }
    if (plPercent > 30) {
      return { action: 'HOLD', color: 'bg-blue-bg text-blue' }
    }
    return { action: 'HOLD', color: 'bg-blue-bg text-blue' }
  }

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Total Value"
          value={`$${metrics.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        />
        <StatCard
          label="Cost Basis"
          value={`$${metrics.costBasis.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        />
        <StatCard
          label="Unrealised P&L"
          value={`$${metrics.totalPL.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          accent={metrics.totalPL >= 0 ? 'text-green' : 'text-red'}
        />
        <StatCard
          label="Return"
          value={`${metrics.totalPLPercent.toFixed(1)}%`}
          accent={metrics.totalPLPercent >= 0 ? 'text-green' : 'text-red'}
        />
        <div className="bg-surface border border-border rounded-[8px] p-4">
          <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-2">Holdings</p>
          <p className="text-2xl font-bold text-text">{holdings.length}</p>
        </div>
      </div>

      {/* Add Position Form */}
      {showForm ? (
        <div className="bg-surface border border-border rounded-[8px] p-6">
          <h3 className="text-lg font-semibold text-text mb-4">Add Position</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Ticker"
              value={formData.ticker}
              onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
              className="px-3 py-2 bg-bg border border-border rounded-[6px] text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-text2"
              required
            />
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 bg-bg border border-border rounded-[6px] text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-text2"
              required
            />
            <input
              type="number"
              placeholder="Shares"
              step="0.01"
              value={formData.shares}
              onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
              className="px-3 py-2 bg-bg border border-border rounded-[6px] text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-text2"
            />
            <input
              type="number"
              placeholder="Buy Price"
              step="0.01"
              value={formData.buy_price}
              onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })}
              className="px-3 py-2 bg-bg border border-border rounded-[6px] text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-text2"
            />
            <input
              type="number"
              placeholder="Current Price"
              step="0.01"
              value={formData.current_price}
              onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
              className="px-3 py-2 bg-bg border border-border rounded-[6px] text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-text2"
            />
            <select
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              className="px-3 py-2 bg-bg border border-border rounded-[6px] text-text focus:outline-none focus:ring-1 focus:ring-text2"
            >
              <option>Technology</option>
              <option>Healthcare</option>
              <option>Finance</option>
              <option>Energy</option>
              <option>Consumer</option>
              <option>Industrial</option>
              <option>Materials</option>
              <option>Other</option>
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-text text-bg font-medium text-sm rounded-[6px] hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Add Position
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-border text-text2 font-medium text-sm rounded-[6px] hover:bg-surface2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 border border-border text-text2 font-medium text-sm rounded-[6px] hover:bg-surface2 transition-colors"
        >
          Add Position
        </button>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-[8px] p-6">
          <h3 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted mb-4">
            Sector Allocation
          </h3>
          <div className="h-64">
            <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[8px] p-6">
          <h3 className="text-sm font-semibold tracking-[0.1em] uppercase text-muted mb-4">
            Position P&L
          </h3>
          <div className="h-64">
            <Bar data={barData} options={{ maintainAspectRatio: false, indexAxis: 'y' }} />
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-4">Your Holdings</h3>
        <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f0eeea] border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Ticker</th>
                <th className="text-left px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Shares</th>
                <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Buy Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Current</th>
                <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Position Value</th>
                <th className="text-right px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">P&L %</th>
                <th className="text-center px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted">Recommendation</th>
                <th className="text-center px-4 py-3 text-xs font-semibold tracking-[0.1em] uppercase text-muted"></th>
              </tr>
            </thead>
            <tbody>
              {holdingsWithPL.map((holding) => {
                const rec = getRecommendation(holding)
                return (
                  <tr key={holding.ticker} className="border-b border-border hover:bg-[#fafaf8] transition-colors">
                    <td className="px-4 py-3 font-medium text-text">{holding.ticker}</td>
                    <td className="px-4 py-3 text-dim">{holding.shares.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-dim">${holding.buy_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-dim">${holding.current_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-text">
                      ${(holding.current_price * holding.shares).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${holding.plPercent >= 0 ? 'text-green' : 'text-red'}`}>
                      {holding.plPercent >= 0 ? '+' : ''}{holding.plPercent.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${rec.color}`}>
                        {rec.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onDeleteHolding(holding.ticker)}
                        className="text-muted hover:text-red transition-colors text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {holdings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-dim">No holdings yet. Add your first position to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Risk & Profile */}
      <div className="bg-surface border border-border rounded-[8px] p-6">
        <h3 className="text-lg font-semibold text-text mb-4">Your Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-2">Risk Tolerance</p>
            <div className="flex flex-wrap gap-2">
              {(['conservative', 'low', 'moderate', 'growth', 'aggressive'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => onUpdateProfile({ risk_tolerance: level })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    profile.risk_tolerance === level
                      ? 'bg-text text-bg'
                      : 'bg-[#f0eeea] text-text2 hover:bg-surface2'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-2">Time Horizon</p>
            <div className="flex gap-2">
              {(['short', 'long'] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => onUpdateProfile({ horizon: h })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    profile.horizon === h
                      ? 'bg-text text-bg'
                      : 'bg-[#f0eeea] text-text2 hover:bg-surface2'
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

function StatCard({
  label,
  value,
  accent = '',
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="bg-surface border border-border rounded-[8px] p-4">
      <p className="text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-2">{label}</p>
      <p className={`text-2xl font-bold ${accent || 'text-text'}`}>{value}</p>
    </div>
  )
}
