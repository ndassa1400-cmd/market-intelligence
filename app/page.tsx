'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RiskTolerance, Horizon } from '@/lib/types'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>('moderate')
  const [horizon, setHorizon] = useState<Horizon>('long')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkAuth()
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        router.push('/dashboard')
      } else {
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        })
        if (signUpError) throw signUpError

        if (user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              name,
              risk_tolerance: riskTolerance,
              horizon,
            })
          if (profileError) throw profileError
        }

        router.push('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-12">
          <h1 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted mb-8">
            Market Intelligence
          </h1>
          <div className="space-y-3">
            <h2 className="text-4xl font-bold tracking-tight text-text">
              Your edge, every morning.
            </h2>
            <p className="text-base text-dim leading-relaxed">
              Institutional-grade briefings. Personalised to your portfolio and risk profile.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-surface border border-border rounded-[6px] text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-text2"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-surface border border-border rounded-[6px] text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-text2"
              placeholder="••••••••"
            />
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-surface border border-border rounded-[6px] text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-text2"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-3">
                  Risk Tolerance
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['conservative', 'low', 'moderate', 'growth', 'aggressive'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setRiskTolerance(level)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        riskTolerance === level
                          ? 'bg-text text-bg'
                          : 'bg-surface border border-border text-text2 hover:bg-surface2'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-[0.1em] uppercase text-muted mb-3">
                  Time Horizon
                </label>
                <div className="flex gap-2">
                  {(['short', 'long'] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHorizon(h)}
                      className={`flex-1 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors ${
                        horizon === h
                          ? 'bg-text text-bg'
                          : 'bg-surface border border-border text-text2 hover:bg-surface2'
                      }`}
                    >
                      {h === 'short' ? 'Short-term' : 'Long-term'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-bg border border-red rounded-[6px] text-red text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-text text-bg font-medium text-sm rounded-[6px] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-dim">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(null)
              }}
              className="font-medium text-text hover:underline"
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
