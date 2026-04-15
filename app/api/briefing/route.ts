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

    const prompt = `You are a senior macro strategist at a top-tier global investment bank. Generate a complete daily market intelligence briefing as structured JSON.

Prior briefings context:
${historyContext}

Today is ${today}. Analyze:
1. Overnight equity market moves (S&P 500, NASDAQ, NZX 50, ASX 200)
2. Central bank news (Fed, RBNZ, RBA, ECB, BoJ)
3. Commodity prices (oil WTI/Brent, gold, copper, lithium)
4. Geopolitical developments with market implications
5. Tech/AI sector news (semiconductors, AI capex, earnings)
6. Crypto market overview
7. Industrial/supply chain developments
8. Banking and finance news
9. Healthcare/pharma developments

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
      "searchQuery": "Federal Reserve interest rates 2026"
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

Generate at least 8 news cards, 5-6 movers, and 5-6 theses. For every news card include a "searchQuery" field with 3-5 words that would find the real story on Google News (e.g. "Fed rate decision April 2026").`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8000,
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
