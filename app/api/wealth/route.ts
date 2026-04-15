import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('wealth_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Wealth fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch wealth snapshots' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { total_value } = body

    if (total_value === undefined) {
      return NextResponse.json(
        { error: 'Missing total_value' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('wealth_snapshots')
      .upsert({
        user_id: user.id,
        total_value: parseFloat(total_value),
        snapshot_date: today,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Wealth save error:', error)
    return NextResponse.json({ error: 'Failed to save wealth snapshot' }, { status: 500 })
  }
}
