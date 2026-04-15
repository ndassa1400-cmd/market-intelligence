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
      .from('holdings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Portfolio fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
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
    const { ticker, name, shares, buy_price, current_price, sector, currency } = body

    if (!ticker || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('holdings')
      .upsert({
        user_id: user.id,
        ticker: ticker.toUpperCase(),
        name,
        shares: parseFloat(shares) || 0,
        buy_price: parseFloat(buy_price) || 0,
        current_price: parseFloat(current_price) || 0,
        sector,
        currency,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Portfolio save error:', error)
    return NextResponse.json({ error: 'Failed to save holding' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get('ticker')

    if (!ticker) {
      return NextResponse.json(
        { error: 'Missing ticker parameter' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('holdings')
      .delete()
      .eq('user_id', user.id)
      .eq('ticker', ticker.toUpperCase())

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Portfolio delete error:', error)
    return NextResponse.json({ error: 'Failed to delete holding' }, { status: 500 })
  }
}
