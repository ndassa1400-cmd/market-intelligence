import { createAdminClient } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

// ── Fetch live headlines from RSS feeds ──────────────────────────────────────
async function fetchNewsHeadlines(): Promise<string> {
  const feeds = [
    { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters' },
    { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', name: 'CNBC' },
    { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', name: 'MarketWatch' },
  ]

  const headlines: string[] = []

  await Promise.allSettled(feeds.map(async ({ url, name }) => {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketBot/1.0)' },
      })
      clearTimeout(timer)
      const xml = await res.text()

      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      for (const item of items.slice(0, 10)) {
        const titleRaw = item[1].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
        const descRaw = item[1].match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)
        const title = titleRaw?.[1]?.replace(/<[^>]+>/g, '').trim()
        const desc = descRaw?.[1]?.replace(/<[^>]+>/g, '').trim().slice(0, 150)
        if (title && title.length > 10 && !title.toLowerCase().includes('rss')) {
          headlines.push(`[${name}] ${title}${desc ? ' — ' + desc : ''}`)
        }
      }
    } catch {
      // Feed unavailable — skip silently
    }
  }))

  if (headlines.length === 0) {
    return 'Live RSS feeds unavailable. Use your training knowledge to construct today\'s most likely macro environment based on recent trends.'
  }

  return headlines.slice(0, 28).join('\n')
}

// ── Main GET handler ─────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Return existing real briefing (skip stubs with no news items)
    const { data: existingBriefing } = await supabase
      .from('briefings')
      .select('*')
      .eq('briefing_date', today)
      .single()

    const hasContent =
      (existingBriefing?.content?.newsItems?.length ?? 0) > 0 ||
      (existingBriefing?.content?.newsCards?.length ?? 0) > 0

    if (existingBriefing && hasContent) {
      return NextResponse.json(existingBriefing)
    }

    // Get last 3 real briefings for narrative continuity
    const { data: recent } = await supabase
      .from('briefings')
      .select('content')
      .order('briefing_date', { ascending: false })
      .limit(5)

    const priorContext = (recent || [])
      .filter((b: any) => b.content?.newsItems?.length > 0 || b.content?.newsCards?.length > 0)
      .slice(0, 3)
      .map((b: any) => {
        const date = b.content.displayDate
        const macro = b.content.macroSummary
        const headlines = (b.content.newsItems || b.content.newsCards || [])
          .slice(0, 3)
          .map((n: any) => n.headline)
          .join(' | ')
        const theses = (b.content.theses || []).map((t: any) => `${t.name} (${t.strength})`).join(', ')
        return `${date}: ${macro} | Headlines: ${headlines} | Themes: ${theses}`
      })
      .join('\n') || 'No prior briefings — establish baseline today.'

    // Fetch live headlines from RSS
    const liveNews = await fetchNewsHeadlines()

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `You are a senior macro strategist and equity analyst at Goldman Sachs / JPMorgan / Citi calibre. Write Ned's personalised morning market briefing.

NED'S PROFILE: Financial engineering student (COSC, maths, stats, finance, economics, accounting). Deloitte corporate finance intern. Above-average risk tolerance. Invests via Sharesies (high transaction costs — prefers mid-to-long term holds, should NOT churn frequently).

TODAY'S DATE: ${today}

TODAY'S LIVE NEWS HEADLINES (from Reuters, CNBC, MarketWatch):
${liveNews}

PRIOR BRIEFING CONTEXT (for narrative continuity — reference and build on these):
${priorContext}

NED'S PORTFOLIO:
Positive 3M: NVDA (NASDAQ), TEM (NZX), IAU (NYSE), ACDC (ASX), RNRG (NASDAQ)
Near flat: MEL (NZX), ITA (CBOE), CVX (NYSE), WIRE (ASX), NDQ (ASX)
Underperformers: GUSH (NYSE leveraged ETF — flag if thesis broken), Pathfinder Water Fund (NZX), Pathfinder Responsibility Fund (NZX), BOT (NZX), XOM (NYSE), RKLB (NASDAQ), OCA (NZX)

INSTRUCTIONS — Return ONLY valid JSON matching this exact schema. No markdown, no code fences.

Section 1 (newsItems): Write 8 news items covering today's most important developments. Categories must include at least one each of: Geopolitics, Energy, Technology, Markets, Central Banks, Commodities. For each item write a vivid newspaper-quality headline and a 3–4 sentence summary (what happened → why it matters → which assets/sectors move and in which direction). Be specific — name actual prices, percentages, countries, companies.

Section 2 (shortTermMovers): Identify 4 stocks/ETFs most likely to move in the next 0–4 weeks based on today's news. At least 2 should be from Ned's portfolio. Set inPortfolio: true if the ticker appears in Ned's portfolio above.

Section 3 (theses): 3 macro/sector themes with a 6–24 month horizon. Reference prior briefing theses where available and update their strength. Add new themes if today's news warrants.

Section 4 (analystVerdict): 3-sentence state of play + market mood tag.

{
  "displayDate": "April 20, 2026",
  "macroSummary": "Paragraph summarising today's macro environment — dominant risks, key themes, market tone.",
  "marketLevels": {
    "SP500": "5,234 (+0.8%)", "NASDAQ": "16,850 (+1.2%)", "NZX50": "12,906 (-0.3%)",
    "ASX200": "7,890 (+0.5%)", "BrentOil": "$82 (-1.1%)", "Gold": "$3,300 (+0.4%)",
    "Copper": "$4.85 (+0.6%)", "Bitcoin": "$84,000 (+1.2%)", "UST10Y": "4.35%",
    "FedRate": "4.25-4.50%", "RBNZ": "3.50%", "RBA": "4.10%"
  },
  "newsItems": [
    {
      "category": "Geopolitics",
      "impact": "high",
      "headline": "VIVID SPECIFIC HEADLINE — not generic",
      "summary": "What happened and specific details. Why this matters for markets. Which assets move: e.g. oil prices, safe havens, EM currencies. What the 2nd and 3rd order effects are for investors.",
      "assets": "Gold Up, Oil Up, USD Strengthens, EM Currencies Weaken",
      "tickers": ["GLD", "IAU", "XOM", "GUSH"]
    }
  ],
  "shortTermMovers": [
    {
      "ticker": "NVDA",
      "name": "NVIDIA Corp",
      "exchange": "NASDAQ",
      "inPortfolio": true,
      "thesis": "Specific catalyst-driven thesis for the next 4 weeks.",
      "catalyst": "Specific event or data point driving the move.",
      "risk": "Primary risk that would invalidate the near-term thesis.",
      "conviction": 8
    }
  ],
  "theses": [
    {
      "name": "AI Infrastructure Supercycle",
      "strength": "Strengthening",
      "body": "2–3 sentence overview of the structural thesis.",
      "todayUpdate": "Specific update: how today's news adds to or detracts from this theme."
    }
  ],
  "analystVerdict": {
    "macroCycle": "One sentence: where we are in the macro cycle right now.",
    "dominantTheme": "One sentence: the single dominant theme driving markets this week.",
    "watchFor": "One sentence: the specific event or data point to watch in the next 5–7 days.",
    "marketMood": "Risk-off. Energy and safe havens in favour."
  }
}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 5000,
      temperature: 0.65,
    })

    const responseText = completion.choices[0]?.message?.content || ''

    let briefingContent
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      briefingContent = JSON.parse(jsonMatch[0])
      if (!briefingContent.newsItems?.length) throw new Error('Empty newsItems')
    } catch (parseError) {
      console.error('Parse error:', parseError)
      console.error('Raw response (first 600 chars):', responseText.slice(0, 600))
      return NextResponse.json(
        { error: 'Generation produced invalid output — please try again' },
        { status: 500 }
      )
    }

    // Delete any stub/failed briefing for today
    await supabase.from('briefings').delete().eq('briefing_date', today)

    // Save real briefing
    const { data: newBriefing, error } = await supabase
      .from('briefings')
      .insert({ briefing_date: today, content: briefingContent })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save briefing' }, { status: 500 })
    }

    return NextResponse.json(newBriefing)
  } catch (error) {
    console.error('Briefing error:', error)
    return NextResponse.json(
      { error: 'Failed to generate briefing', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST — force regenerate (clears today's briefing including stubs)
export async function POST() {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('briefings').delete().eq('briefing_date', today)
    return GET(new NextRequest('http://localhost/api/briefing'))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to regenerate' }, { status: 500 })
  }
}
