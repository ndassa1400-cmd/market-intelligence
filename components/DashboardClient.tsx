'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, TrendingUp, TrendingDown } from 'lucide-react'
import IntelligenceTab from './tabs/IntelligenceTab'
import PortfolioTab from './tabs/PortfolioTab'
import type { Profile, Holding, Briefing, RiskTolerance, Horizon } from '@/lib/types'

interface DashboardClientProps {
  profile: Profile
  holdings: Holding[]
  briefing: Briefing | null
  userId: string
}

export default function DashboardClient({
  profile: initialProfile,
  holdings: initialHoldings,
  briefing,
  userId,
}: DashboardClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'intelligence' | 'portfolio'>('intelligence')
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings)
  const [loading, setLoading] = useState(false)
  const [currentBriefing, setCurrentBriefing] = useState<Briefing | null>(briefing)
  const [briefingLoading, setBriefingLoading] = useState(true)

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const res = await fetch('/api/briefing')
        const data = await res.json()
        if (data?.id) setCurrentBriefing(data)
      } catch (e) {
        console.error('Briefing fetch error:', e)
      } finally {
        setBriefingLoading(false)
      }
    }
    fetchBriefing()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleAddHolding = async (data: Omit<Holding, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('holdings')
        .upsert({
          ...data,
          user_id: userId,
        })
      if (error) throw error

      const { data: updated } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', userId)
      setHoldings(updated || [])
    } catch (error) {
      console.error('Error adding holding:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteHolding = async (ticker: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('user_id', userId)
        .eq('ticker', ticker)
      if (error) throw error

      setHoldings(holdings.filter(h => h.ticker !== ticker))
    } catch (error) {
      console.error('Error deleting holding:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (updates: Partial<Profile>) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
      if (error) throw error

      setProfile({ ...profile, ...updates })
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculatePortfolioMetrics = () => {
    const totalValue = holdings.reduce((sum, h) => sum + (h.current_price * h.shares), 0)
    const costBasis = holdings.reduce((sum, h) => sum + (h.buy_price * h.shares), 0)
    const totalPL = totalValue - costBasis
    const totalPLPercent = costBasis > 0 ? (totalPL / costBasis) * 100 : 0

    const holdingsPL = holdings.map(h => ({
      ticker: h.ticker,
      pl: (h.current_price - h.buy_price) * h.shares,
      plPercent: h.buy_price > 0 ? ((h.current_price - h.buy_price) / h.buy_price) * 100 : 0,
      value: h.current_price * h.shares,
    }))

    const bestPerformer = holdingsPL.length > 0 ? holdingsPL.reduce((a, b) => a.plPercent > b.plPercent ? a : b) : null
    const worstPerformer = holdingsPL.length > 0 ? holdingsPL.reduce((a, b) => a.plPercent < b.plPercent ? a : b) : null

    return {
      totalValue,
      costBasis,
      totalPL,
      totalPLPercent,
      bestPerformer,
      worstPerformer,
    }
  }

  const metrics = calculatePortfolioMetrics()

  return (
    <div className="min-h-screen bg-bg">
      {/* Navigation */}
      <nav className="sticky top-0 h-[52px] bg-bg border-b border-border flex items-center px-6 z-50">
        <div className="flex-1">
          <h1 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted">
            Market Intelligence
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-dim">
            {profile.name || 'User'}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-surface2 rounded-[6px] transition-colors text-dim hover:text-text"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="mb-8 border-b border-border">
          <div className="flex gap-1">
            {(['intelligence', 'portfolio'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-text text-text'
                    : 'border-transparent text-dim hover:text-text2'
                }`}
              >
                {tab === 'intelligence' ? 'Intelligence' : 'Portfolio'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'intelligence' ? (
          <IntelligenceTab
            briefing={currentBriefing}
            profile={profile}
            loading={briefingLoading}
          />
        ) : (
          <PortfolioTab
            profile={profile}
            holdings={holdings}
            metrics={metrics}
            onAddHolding={handleAddHolding}
            onDeleteHolding={handleDeleteHolding}
            onUpdateProfile={handleUpdateProfile}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}
