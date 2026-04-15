import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/DashboardClient'
import type { Briefing, Holding, Profile } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  try {
    const [profileRes, holdingsRes, briefingRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single(),
      supabase
        .from('holdings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      fetch(`https://market-intelligence-swart.vercel.app/api/briefing`, {
        headers: {
          'Authorization': `Bearer ${user.id}`,
        },
        cache: 'no-store',
      }).then(r => r.json()).catch(() => null),
    ])

    const profile: Profile = profileRes.data || {
      id: user.id,
      name: user.email?.split('@')[0] || 'User',
      risk_tolerance: 'moderate',
      horizon: 'long',
      created_at: new Date().toISOString(),
    }

    const holdings: Holding[] = holdingsRes.data || []
    const briefing: Briefing | null = briefingRes?.id ? briefingRes : null

    return (
      <DashboardClient
        profile={profile}
        holdings={holdings}
        briefing={briefing}
        userId={user.id}
      />
    )
  } catch (error) {
    console.error('Dashboard error:', error)
    return (
      <div className="min-h-screen bg-bg p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-dim">Error loading dashboard. Please try again.</p>
          </div>
        </div>
      </div>
    )
  }
}
