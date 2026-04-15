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

// Hardcoded fallback for NZX/ASX stocks that Yahoo doesn't return profile data for
const REGIONAL_SECTOR_MAP: Record<string, { sector: string; industry: string }> = {
  // NZX
  AIR: { sector: 'Industrial', industry: 'Airlines' },
  SPK: { sector: 'Technology', industry: 'Telecommunications' },
  FPH: { sector: 'Healthcare', industry: 'Medical Devices' },
  MEL: { sector: 'Utilities', industry: 'Electric Utilities' },
  MCY: { sector: 'Utilities', industry: 'Electric Utilities' },
  CEN: { sector: 'Utilities', industry: 'Renewable Energy' },
  SKC: { sector: 'Consumer', industry: 'Casinos & Gaming' },
  PCT: { sector: 'Real Estate', industry: 'REITs' },
  ARG: { sector: 'Finance', industry: 'Asset Management' },
  VHP: { sector: 'Healthcare', industry: 'Healthcare Services' },
  GTK: { sector: 'Technology', industry: 'Software' },
  EBO: { sector: 'Healthcare', industry: 'Pharmaceuticals' },
  SCL: { sector: 'Consumer', industry: 'Food & Beverages' },
  NZR: { sector: 'Energy', industry: 'Oil & Gas Refining' },
  WHS: { sector: 'Consumer', industry: 'Retail' },
  RBD: { sector: 'Consumer', industry: 'Restaurants' },
  MFT: { sector: 'Finance', industry: 'Freight & Logistics' },
  // ASX
  BHP: { sector: 'Materials', industry: 'Diversified Metals & Mining' },
  CBA: { sector: 'Finance', industry: 'Banking' },
  ANZ: { sector: 'Finance', industry: 'Banking' },
  WBC: { sector: 'Finance', industry: 'Banking' },
  NAB: { sector: 'Finance', industry: 'Banking' },
  RIO: { sector: 'Materials', industry: 'Diversified Metals & Mining' },
  WES: { sector: 'Consumer', industry: 'Retail' },
  CSL: { sector: 'Healthcare', industry: 'Biotechnology' },
  MQG: { sector: 'Finance', industry: 'Investment Banking' },
  WDS: { sector: 'Energy', industry: 'Oil & Gas' },
  GMG: { sector: 'Real Estate', industry: 'Real Estate' },
  TLS: { sector: 'Technology', industry: 'Telecommunications' },
  FMG: { sector: 'Materials', industry: 'Iron Ore Mining' },
  TCL: { sector: 'Industrial', industry: 'Toll Roads' },
  REA: { sector: 'Technology', industry: 'Online Classifieds' },
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

    // Fallback: if sector still unknown and ticker has a suffix, try quoteSummary
    // without the suffix (some NZX/ASX companies are indexed under base ticker)
    if (sector === 'Other' && yahooTicker !== ticker) {
      try {
        const fallbackQuoteRes = await fetch(
          `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=assetProfile`,
          { headers }
        )
        if (fallbackQuoteRes.ok) {
          const fqd = await fallbackQuoteRes.json()
          const fp = fqd?.quoteSummary?.result?.[0]?.assetProfile
          if (fp?.sector) {
            sector = SECTOR_MAP[fp.sector] || fp.sector
          }
          if (fp?.industry && !industry) {
            industry = fp.industry
          }
        }
      } catch { /* ignore */ }
    }

    // Last resort: use our hardcoded regional sector map for known NZX/ASX tickers
    if (sector === 'Other') {
      const baseTicker = ticker.toUpperCase().split('.')[0]
      const regional = REGIONAL_SECTOR_MAP[baseTicker]
      if (regional) {
        sector = regional.sector
        if (!industry) industry = regional.industry
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
