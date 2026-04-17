import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Holding, Profile } from '@/lib/types'

// Allow up to 60s for Groq to generate portfolio intelligence
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { holdings, profile } = await req.json() as { holdings: Holding[]; profile: Profile }

    if (!holdings?.length) {
      return NextResponse.json({ error: 'No holdings provided' }, { status: 400 })
    }

    // Fetch latest briefing for macro context
    const supabase = createAdminClient()
    const { data: briefing } = await supabase
      .from('briefings')
      .select('content')
      .order('briefing_date', { ascending: false })
      .limit(1)
      .single()

    const macroSummary = (briefing?.content as any)?.macroSummary || 'Markets in focus.'
    const newsCards: any[] = (briefing?.content as any)?.newsCards?.slice(0, 14) || []
    const theses: any[] = (briefing?.content as any)?.theses || []

    const newsContext = newsCards.map(c =>
      `[${(c.tag || '').toUpperCase()}] ${c.headline}\n  Immediate: ${c.layer1}\n  Medium: ${c.layer2}\n  Assets: ${c.assetMap}`
    ).join('\n\n')

    const thesesContext = theses.map((t: any) =>
      `${t.name} (${t.strength}): ${t.todayUpdate}`
    ).join('\n')

    const holdingsContext = holdings.map(h => {
      const plPct = h.buy_price > 0
        ? (((h.current_price - h.buy_price) / h.buy_price) * 100).toFixed(1)
        : '0.0'
      return `${h.ticker} | ${h.name} | Sector: ${h.sector} | ${h.currency} | Bought @ ${h.buy_price.toFixed(2)} | Now @ ${h.current_price.toFixed(2)} | P&L: ${plPct}%`
    }).join('\n')

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `You are a managing director at a top global macro hedge fund — think Bridgewater, Elliott Management, or a Goldman Sachs internal portfolio review. You've just read this morning's market briefing and are presenting a personalised analysis to a junior analyst who holds this specific portfolio.

Your edge is CAUSAL CHAIN THINKING — you don't just report what happened, you connect dots across geopolitics, commodities, currencies, sectors, and specific holdings. You think in second and third-order effects.

EXAMPLES OF YOUR LEVEL OF ANALYSIS:
"Iran partial nuclear deal → Strait of Hormuz risk premium falls → Brent -$8-12 → GUSH (3x oil ETF) faces -25-35% drawdown → reduce before any announcement → BUT energy security narrative persists long-term → nuclear thesis strengthens → consider URA or global uranium ETF"
"US-China tech tariffs expand → semiconductor supply chain disruption → NVDA short-term revenue risk from China ban BUT dominant in AI training globally → strategic HOLD with tight stop at -20% from entry → Intel (INTC) loses further market share → avoid"
"NZD weakness vs USD → your USD-denominated holdings (NVDA, XOM) are worth MORE in NZD terms → natural FX hedge → don't convert at current rates → but if RBNZ cuts rates further, NZD weakens more → USD assets appreciate further in local terms"

---
TODAY'S MACRO BRIEFING:
${macroSummary}

LIVE NEWS (analysed for portfolio impact):
${newsContext}

LONG-TERM INVESTMENT THESES (track these for your portfolio):
${thesesContext}

---
THE PORTFOLIO TO ANALYSE:
${holdingsContext}

INVESTOR PROFILE: Risk tolerance = ${profile.risk_tolerance || 'moderate'} | Time horizon = ${profile.horizon || 'long'}

---
INSTRUCTIONS:

1. PORTFOLIO SIGNALS — for EVERY holding above, generate a signal:
   - action: BUY (add new position) | ADD (increase existing) | HOLD | REDUCE (trim) | SELL (exit) | WATCH (monitor closely)
   - conviction: HIGH | MEDIUM | LOW
   - timeframe: SHORT (0-3 months) | MEDIUM (3-12 months) | LONG (1-3 years)
   - headline: 8-12 word punchy analyst-quality signal title
   - reasoning: 2-3 sentences. MUST include: (a) the specific macro/news event driving this, (b) the causal chain connecting it to this holding, (c) a specific price/% impact estimate where possible. DO NOT be vague — name the event, the mechanism, the magnitude.
   - catalyst: The specific near-term event that would trigger this action (e.g. "Iran deal announcement", "Fed pivot signal", "NVDA earnings beat")

2. MACRO THEMES — identify 3 big-picture themes connecting multiple holdings:
   - title: Sharp theme name (e.g. "Energy Security Premium", "NZD Depreciation Tailwind", "Leverage Unwind Risk")
   - chain: Full causal chain written with → arrows. At least 5 steps. Reference specific holdings and plausible % impacts.
   - impact: BULLISH | BEARISH | MIXED (from this portfolio's perspective)
   - affectedTickers: which holdings are affected
   - newIdea: If applicable, suggest a specific ticker/ETF not currently held that expresses this theme better (with NZX/ASX/NASDAQ access noted)

3. WATCH ITEMS — 4-5 specific risks or catalysts to monitor:
   - alert: Concrete, specific thing to watch (not vague — name the event, the trigger level, the timeline)
   - urgency: HIGH | MEDIUM | LOW
   - tickers: affected holdings

4. NEW IDEAS — 3 positions to consider adding, connected to current macro themes:
   - ticker: the actual ticker symbol
   - name: full name
   - thesis: 2-3 sentence investment case connecting to current macro events
   - catalyst: near-term catalyst (specific event/date if possible)
   - risk: main risk to the thesis

5. ANALYST NOTE — 2-3 sentence overall portfolio health read from a macro lens. Mention the portfolio's macro exposure profile, key concentration risks, and one sentence on what the biggest opportunity is right now.

Return ONLY valid JSON (no markdown, no code fences):
{
  "portfolioSignals": [
    {"ticker":"","action":"","conviction":"","timeframe":"","headline":"","reasoning":"","catalyst":""}
  ],
  "macroThemes": [
    {"title":"","chain":"","impact":"","affectedTickers":[],"newIdea":""}
  ],
  "watchItems": [
    {"alert":"","urgency":"","tickers":[]}
  ],
  "newIdeas": [
    {"ticker":"","name":"","thesis":"","catalyst":"","risk":""}
  ],
  "analystNote": ""
}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.35,
      max_tokens: 5000,
    })

    const raw = completion.choices[0]?.message?.content || ''

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const analysis = JSON.parse(cleaned)

    return NextResponse.json(analysis)
  } catch (err) {
    console.error('Portfolio intelligence error:', err)
    return NextResponse.json({ error: 'Analysis generation failed' }, { status: 500 })
  }
}
