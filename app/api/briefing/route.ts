import { createAdminClient } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

// Allow up to 60s for Groq to generate the full briefing
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Check if briefing exists for today
    const { data: existingBriefing } = await supabase
      .from('briefings')
      .select('*')
      .eq('briefing_date', today)
      .single()

    if (existingBriefing) {
      return NextResponse.json(existingBriefing)
    }

    // Get last 30 briefings for context
    const { data: recentBriefings } = await supabase
      .from('briefings')
      .select('content')
      .order('briefing_date', { ascending: false })
      .limit(30)

    const historyContext = recentBriefings
      ?.map(
        (b: any) =>
          `Date: ${b.content.displayDate}\nMacro: ${b.content.macroSummary}\nTop headlines: ${b.content.newsCards?.slice(0,4).map((c: any) => c.headline).join(' | ')}\nTheses: ${JSON.stringify(b.content.theses)}`
      )
      .join('\n---\n') || 'No prior briefings.'

    // Generate briefing with Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `You are a senior macro strategist at a top-tier global investment bank. Your job is to write a daily briefing that reads like the front page of a financial newspaper — big stories, clear market angles, and a strong sense of how today's news builds on yesterday's. Think Bloomberg Terminal meets The Economist's briefing page.

PRIOR BRIEFINGS (use this to track story continuity — note how themes evolve):
${historyContext}

Today is ${today}.

INSTRUCTIONS:
1. NARRATIVE CONTINUITY is critical. Reference prior headlines where relevant. If Iran talks were ongoing yesterday, report where they stand today. If a tanker was diverted, follow it. If Trump made a statement last week, note the follow-through. Stories should build — not start fresh every day.
2. Use BOLD, newspaper-style headlines. Not "Fed Discusses Rates" — write "Fed Signals Rates on Hold Until 2027 as Inflation Stalls" or "Three Oil Tankers Rerouted as Houthis Resume Red Sea Attacks". Make them vivid and specific.
3. Assign each news card a TAG that reflects the category. Tags must be one of: Politics, Geopolitics, Energy, Technology, Markets, Healthcare, Crypto, Climate, Trade, Central Banks, Earnings, China, Commodities, Defence, Culture.
4. Group related stories — if you have 2-3 oil stories, tag them all "Energy" so they cluster into a narrative.
5. HALF of your news cards must be non-financial world news. Cover Trump, peace talks, tanker movements, supply chain disruptions, climate events.

MANDATORY STORY CATEGORIES (include at least one card each):
- US Politics: Trump executive orders, statements, tariffs, political drama
- Geopolitics: Wars, peace talks, Iran nuclear deal, Russia-Ukraine, Middle East
- Energy: Oil tankers, OPEC, LNG, supply disruptions, Saudi Arabia
- Technology/AI: Chip wars, AI announcements, semiconductor supply chains
- Markets: Fed, equities, rate decisions, earnings
- China: Taiwan, trade, economy, manufacturing
- Commodities: Gold, copper, wheat, natural gas

For EVERY news card:
- headline: Bold, vivid, newspaper-quality (not bland — make it compelling)
- what: 1-2 sentences summarising what happened and why it matters
- layer1: 0-4 week market impact — be specific about price direction
- layer2: 1-6 month outlook — sector and macro implications
- layer3: 6-24 month structural view — how this reshapes the investment landscape
- assetMap: Which assets move, in which direction (e.g. "Oil Up, USD Strengthens, EM Currencies Weaken")
- searchQuery: 4-6 word Google News search to find this story
- tickers: Array of affected stock symbols (["XOM", "CVX"] for oil, ["NVDA"] for AI, etc.)

For theses:
- Reference prior briefing context — if "AI Infrastructure Supercycle" was Strengthening last week, note today's update specifically
- todayUpdate must be a concrete 1-2 sentence update (not generic)

Return ONLY valid JSON (no markdown, no code fences):
{
  "displayDate": "April 15, 2026",
  "marketLevels": {"SP500": "5,234 (+0.8%)", "NASDAQ": "16,850 (+1.2%)", "NZX50": "12,340 (-0.2%)", "ASX200": "7,890 (+0.5%)", "BrentOil": "$92.50 (+1.2%)", "Gold": "$2,340 (-0.3%)", "Copper": "$4.12 (+0.8%)", "FedRate": "5.25-5.50%", "RBNZ": "5.50%", "RBA": "4.35%", "Bitcoin": "$63,200 (+2.1%)", "UST10Y": "4.15%"},
  "newsCards": [
    {
      "tag": "Politics",
      "impact": "high",
      "headline": "Trump Signs Executive Order Imposing 25% Tariffs on EU Auto Imports",
      "what": "The White House announced sweeping tariffs on European vehicles, citing national security concerns. EU officials warn of immediate retaliation targeting US agricultural exports.",
      "layer1": "Auto stocks (GM, F, STLA) sell off. EUR/USD weakens on trade war fears. Safe havens (gold, JPY) bid up.",
      "layer2": "Supply chain restructuring accelerates. US auto production costs rise. European exporters redirect to Asia.",
      "layer3": "WTO credibility further undermined. Structural shift toward bilateral trade blocs accelerates.",
      "assetMap": "EUR Down, Gold Up, US Auto Stocks Down, EU Exporters Down",
      "searchQuery": "Trump tariffs European auto imports",
      "tickers": ["GM", "F", "GLD", "TM"]
    }
  ],
  "movers": [
    {
      "ticker": "NVDA",
      "exchange": "NASDAQ",
      "sector": "Technology",
      "catalyst": "Microsoft announces $10B AI infrastructure deal",
      "why": "Confirms sustained GPU demand for hyperscaler AI buildout through 2027",
      "risk": "Antitrust scrutiny on AI monopoly formation could pressure multiple",
      "conviction": 8,
      "accessible": "Yes"
    }
  ],
  "theses": [
    {
      "name": "AI Infrastructure Supercycle",
      "strength": "Strengthening",
      "body": "Hyperscaler capex commitments are locking in GPU demand years into the future. Supply constraints on advanced chips persist.",
      "todayUpdate": "Microsoft's $10B AI deal and Google's new data centre announcement confirm the capex cycle is accelerating, not plateauing."
    }
  ],
  "macroSummary": "Tariff escalation dominates risk sentiment today. Tech resilient on AI demand. Energy bid as tanker rerouting tightens Red Sea supply."
}

Generate exactly 10 news cards (5 world/political, 5 financial), 5 movers, 4 theses. Every headline should be bold and specific — a reader should understand the story from the headline alone.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 6000,
      temperature: 0.7,
    })

    const responseText = completion.choices[0]?.message?.content || ''

    // Parse JSON from response
    let briefingContent
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')
      briefingContent = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      // Return mock data if parsing fails
      briefingContent = {
        displayDate: new Date().toLocaleDateString('en-NZ'),
        marketLevels: {
          SP500: '5,234 (+0.8%)',
          NASDAQ: '16,850 (+1.2%)',
          NZX50: '12,340 (-0.2%)',
          ASX200: '7,890 (+0.5%)',
        },
        newsCards: [],
        movers: [],
        theses: [],
        macroSummary: 'Market in consolidation mode.',
      }
    }

    // Save to Supabase
    const { data: newBriefing, error } = await supabase
      .from('briefings')
      .insert({
        briefing_date: today,
        content: briefingContent,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save briefing' }, { status: 500 })
    }

    return NextResponse.json(newBriefing)
  } catch (error) {
    console.error('Briefing generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate briefing',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// POST — force regenerate today's briefing (deletes existing, generates fresh)
export async function POST() {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Delete any existing briefing for today so GET regenerates
    await supabase.from('briefings').delete().eq('briefing_date', today)

    // Delegate to GET logic by calling it internally
    return GET(new NextRequest('http://localhost/api/briefing'))
  } catch (error) {
    console.error('Force regenerate error:', error)
    return NextResponse.json({ error: 'Failed to regenerate' }, { status: 500 })
  }
}
