import { createAdminClient } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

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
          `Date: ${b.content.displayDate}\nTheses: ${JSON.stringify(b.content.theses)}`
      )
      .join('\n---\n') || 'No prior briefings.'

    // Generate briefing with Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `You are a senior macro strategist at a top-tier global investment bank who also tracks world events with the eye of a seasoned journalist. Generate a complete daily briefing as structured JSON — covering BOTH financial markets AND major world news. Think Bloomberg meets Reuters meets The Economist.

Prior briefings context:
${historyContext}

Today is ${today}. Cover ALL of the following — do not skip non-financial stories:

FINANCIAL MARKETS:
1. Overnight equity market moves (S&P 500, NASDAQ, NZX 50, ASX 200, Europe)
2. Central bank news (Fed, RBNZ, RBA, ECB, BoJ) — rate decisions, minutes, speeches
3. Commodity moves (oil WTI/Brent, gold, copper, lithium, wheat, natural gas)
4. Tech/AI earnings, semiconductor supply chains, AI capex announcements
5. Crypto market overview (BTC, ETH, regulatory news)
6. Banking, M&A, IPO activity

WORLD NEWS (with market angle — these are MANDATORY, include every category):
7. US politics — Trump statements, social media posts, executive orders, tariffs, political drama. Even Trump posting a picture has market implications. Cover it.
8. Peace talks, wars, ceasefires — Iran nuclear talks, Russia-Ukraine negotiations, Middle East ceasefires, Israel-Gaza, any peace deal or escalation
9. Trade routes and supply chains — oil tankers, container ships, Suez Canal, Red Sea, Panama Canal, port strikes, sanctions on shipping
10. Energy — OPEC meetings, Saudi Arabia production, Iranian oil exports, LNG cargos, gas pipeline politics, oil price moves
11. China — economy, Taiwan tensions, trade with US, manufacturing data, property crisis, export controls
12. Climate and natural disasters — flooding, droughts, earthquakes, wildfires affecting agriculture or infrastructure
13. Big cultural and social moments — sporting events, celebrity influence on markets, viral consumer trends, social media movements
14. Space and technology breakthroughs — rocket launches, AI announcements, biotech discoveries, defence tech

CRITICAL: For every news card, include a "tickers" array listing which stock tickers from common indices are most affected by this story (e.g. ["XOM", "CVX"] for oil news, ["NVDA", "AMD"] for AI news, ["GLD"] for geopolitical tension). Leave as empty array [] if no specific stocks are affected.

For each news card, explain the MARKET ANGLE explicitly — even for non-financial stories. Trump posting on social media, a tanker diversion, a drought in key wheat-growing regions — all of these move markets. Be direct about which way prices move and why.

For each theme in prior briefings, explicitly note whether today's data STRENGTHENS, HOLDS, or WEAKENS the thesis.

Return ONLY valid JSON with no markdown or code fences:
{
  "displayDate": "April 15, 2026",
  "marketLevels": {"SP500": "5,234 (+0.8%)", "NASDAQ": "16,850 (+1.2%)", "NZX50": "12,340 (-0.2%)", "ASX200": "7,890 (+0.5%)", "BrentOil": "$92.50 (+1.2%)", "Gold": "$2,340 (-0.3%)", "Copper": "$4.12 (+0.8%)", "FedRate": "5.25-5.50%", "RBNZ": "5.50%", "RBA": "4.35%", "Bitcoin": "$63,200 (+2.1%)", "UST10Y": "4.15%"},
  "newsCards": [
    {
      "tag": "Federal Reserve",
      "impact": "high",
      "headline": "Fed Signals Patience on Rate Cuts",
      "what": "Fed chair comments suggest rates will remain higher for longer than previously expected.",
      "layer1": "USD strengthens, bond yields rise, equity valuations under pressure.",
      "layer2": "Companies refinancing debt face higher costs. Consumer spending may slow as mortgage rates adjust.",
      "layer3": "Economic growth moderates. Long-term bond yields rise, pressuring dividend and growth stocks.",
      "assetMap": "USD Up, Bonds Down, Equities Mixed, Real Estate Down",
      "searchQuery": "Federal Reserve interest rates 2026",
      "tickers": ["JPM", "BAC", "TLT"]
    }
  ],
  "movers": [
    {
      "ticker": "NVDA",
      "exchange": "NASDAQ",
      "sector": "Technology",
      "catalyst": "AI capex cycle acceleration",
      "why": "Enterprise AI investment surging",
      "risk": "Valuation compression if growth slows",
      "conviction": 8,
      "accessible": "Yes"
    }
  ],
  "theses": [
    {
      "name": "AI Infrastructure Supercycle",
      "strength": "Strengthening",
      "body": "Semiconductor and data center capex accelerating globally. GPU demand outpacing supply. Long-term structural driver of technology sector outperformance.",
      "todayUpdate": "New enterprise AI contracts announced. Reinforces structural demand outlook for semiconductors."
    }
  ],
  "macroSummary": "Risk-off sentiment from Fed pricing. Tech holding up on AI strength. Commodities mixed on growth concerns."
}

Generate at least 14 news cards — HALF must be world/political/geopolitical news (not just financial markets). Include peace talks if ongoing, Trump social media activity, tanker movements, supply chain disruptions, climate events, cultural moments. 5-6 movers, 5-6 theses. Every news card needs "searchQuery" (4-6 words for Google News) and "tickers" array (affected stock symbols, empty array if none).`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 12000,
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
