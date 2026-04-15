import { NextRequest, NextResponse } from 'next/server'

// Map currency/market to Yahoo Finance ticker suffix
function buildYahooTicker(ticker: string, currency?: string): string {
  const t = ticker.toUpperCase()
  if (t.includes('.')) return t // Already has suffix
  if (currency === 'NZD') return `${t}.NZ`
  if (currency === 'AUD') return `${t}.AX`
  return t // USD — no suffix
}

// Map Yahoo Finance sector strings to our canonical sector names
const SECTOR_MAP: Record<string, string> = {
  'Technology': 'Technology',
  'Financial Services': 'Finance',
  'Healthcare': 'Healthcare',
  'Consumer Cyclical': 'Consumer',
  'Consumer Defensive': 'Consumer',
  'Energy': 'Energy',
  'Basic Materials': 'Materials',
  'Industrials': 'Industrial',
  'Utilities': 'Utilities',
  'Real Estate': 'Real Estate',
  'Communication Services': 'Technology',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get('ticker')
  const currency = searchParams.get('currency') || 'USD'

  if (!ticker) {
    return NextResponse.json({ error: 'Missing ticker' }, { status: 400 })
  }

  const yahooTicker = buildYahooTicker(ticker, currency)

  try {
    // Fetch 6-month daily price history
    const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=6mo`
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
    }

    const [chartRes, quoteRes] = await Promise.allSettled([
      fetch(chartUrl, { headers }),
      fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooTicker)}?modules=assetProfile,price`, { headers }),
    ])

    let prices: { date: string; close: number }[] = []
    let sector = 'Other'
    let industry = ''
    let currentPrice: number | null = null

    // Parse chart data
    if (chartRes.status === 'fulfilled' && chartRes.value.ok) {
      const chartData = await chartRes.value.json()
      const result = chartData?.chart?.result?.[0]
      if (result) {
        const timestamps: number[] = result.timestamps || result.timestamp || []
        const closes: number[] = result.indicators?.quote?.[0]?.close || []
        prices = timestamps
          .map((ts, i) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0],
            close: closes[i],
          }))
          .filter(p => p.close != null && !isNaN(p.close))

        currentPrice = result.meta?.regularMarketPrice || null
      }
    }

    // Parse profile/sector data
    if (quoteRes.status === 'fulfilled' && quoteRes.value.ok) {
      const quoteData = await quoteRes.value.json()
      const profile = quoteData?.quoteSummary?.result?.[0]?.assetProfile
      const price = quoteData?.quoteSummary?.result?.[0]?.price

      if (profile?.sector) {
        sector = SECTOR_MAP[profile.sector] || profile.sector
      }
      if (profile?.industry) {
        industry = profile.industry
      }
      if (price?.regularMarketPrice?.raw) {
        currentPrice = price.regularMarketPrice.raw
      }
    }

    // Fallback: try without suffix if no prices found
    if (prices.length === 0 && yahooTicker !== ticker) {
      const fallbackUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=6mo`
      const fallbackRes = await fetch(fallbackUrl, { headers })
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json()
        const result = fallbackData?.chart?.result?.[0]
        if (result) {
          const timestamps: number[] = result.timestamps || result.timestamp || []
          const closes: number[] = result.indicators?.quote?.[0]?.close || []
          prices = timestamps
            .map((ts, i) => ({
              date: new Date(ts * 1000).toISOString().split('T')[0],
              close: closes[i],
            }))
            .filter(p => p.close != null && !isNaN(p.close))
          currentPrice = result.meta?.regularMarketPrice || currentPrice
        }
      }
    }

    return NextResponse.json({
      ticker,
      yahooTicker,
      sector,
      industry,
      currentPrice,
      prices,
    })
  } catch (err) {
    console.error(`Stock API error for ${ticker}:`, err)
    return NextResponse.json({ error: 'Failed to fetch stock data', ticker, sector: 'Other', prices: [] }, { status: 200 })
  }
}
