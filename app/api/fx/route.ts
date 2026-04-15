import { NextResponse } from 'next/server'

// Fetch live NZD exchange rates from Yahoo Finance.
// All portfolio values are converted to NZD before summing.
export async function GET() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
  }

  const fetchRate = async (pair: string): Promise<number | null> => {
    try {
      const res = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${pair}?interval=1d&range=1d`,
        { headers }
      )
      if (!res.ok) return null
      const data = await res.json()
      return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
    } catch {
      return null
    }
  }

  const [usdToNzd, audToNzd] = await Promise.all([
    fetchRate('USDNZD=X'),
    fetchRate('AUDNZD=X'),
  ])

  return NextResponse.json({
    USD: usdToNzd ?? 1.72,   // fallback: approx April 2026
    AUD: audToNzd ?? 1.07,
    NZD: 1,
  })
}
