import { createAdminClient } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Return existing real briefing for today (ignore stub/empty ones)
    const { data: existingBriefing } = await supabase
      .from('briefings')
      .select('*')
      .eq('briefing_date', today)
      .single()

    // Don't return stub data — if newsCards is empty it's a failed generation
    if (existingBriefing && existingBriefing.content?.newsCards?.length > 0) {
      return NextResponse.json(existingBriefing)
    }

    // Get last 5 real briefings for continuity context (keep prompt lean)
    const { data: recentBriefings } = await supabase
      .from('briefings')
      .select('content')
      .order('briefing_date', { ascending: false })
      .limit(5)

    const realBriefings = (recentBriefings || []).filter(
      (b: any) => b.content?.newsCards?.length > 0
    )

    const historyContext = realBriefings.length > 0
      ? realBriefings.map((b: any) =>
          `${b.content.displayDate}: ${b.content.macroSummary} | Headlines: ${b.content.newsCards?.slice(0, 3).map((c: any) => c.headline).join(' | ')}`
        ).join('\n')
      : 'No prior briefings.'

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const prompt = `You are a senior macro strategist. Write today's market intelligence briefing.

Today: ${today}

Recent context for continuity:
${historyContext}

Return ONLY valid JSON, no markdown, no code fences. Use this exact structure:

{
  "displayDate": "April 17, 2026",
  "macroSummary": "One paragraph summary of today's macro environment.",
  "marketLevels": {
    "SP500": "5,234 (+0.8%)", "NASDAQ": "16,850 (+1.2%)", "NZX50": "12,340 (-0.2%)",
    "ASX200": "7,890 (+0.5%)", "BrentOil": "$82 (-1.1%)", "Gold": "$3,300 (+0.4%)",
    "Bitcoin": "$84,000 (+2.1%)", "UST10Y": "4.35%", "FedRate": "4.25-4.50%"
  },
  "newsCards": [
    {
      "tag": "Politics",
      "impact": "high",
      "headline": "VIVID HEADLINE HERE",
      "what": "2 sentences: what happened and why it matters.",
      "layer1": "0-4 week price impact on specific assets.",
      "layer2": "1-6 month sector implications.",
      "layer3": "6-24 month structural shift.",
      "assetMap": "Asset Up/Down, Asset Up/Down",
      "searchQuery": "google news search query",
      "tickers": ["TICK1", "TICK2"]
    }
  ],
  "movers": [
    {
      "ticker": "NVDA", "exchange": "NASDAQ", "sector": "Technology",
      "catalyst": "specific catalyst", "why": "why it moves",
      "risk": "key risk", "conviction": 8, "accessible": "Yes"
    }
  ],
  "theses": [
    {
      "name": "Theme Name", "strength": "Strengthening",
      "body": "2-3 sentences on the thesis.", "todayUpdate": "Specific update today."
    }
  ]
}

Generate: 8 news cards covering Politics, Geopolitics, Energy, Technology, Markets, China, Commodities (use vivid specific headlines), 4 movers, 3 theses. Strength must be one of: Strengthening, Holding, Weakening, New.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.65,
    })

    const responseText = completion.choices[0]?.message?.content || ''

    // Parse JSON — if it fails, return error (do NOT save stub data)
    let briefingContent
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      briefingContent = JSON.parse(jsonMatch[0])
      // Validate it has real content
      if (!briefingContent.newsCards?.length) throw new Error('Empty newsCards')
    } catch (parseError) {
      console.error('Parse error:', parseError, '\nRaw:', responseText.slice(0, 500))
      return NextResponse.json(
        { error: 'Generation produced invalid output — try again' },
        { status: 500 }
      )
    }

    // Delete any existing stub for today before saving real data
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

// POST — force regenerate (deletes today's briefing including stubs, then generates fresh)
export async function POST() {
  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('briefings').delete().eq('briefing_date', today)
    return GET(new NextRequest('http://localhost/api/briefing'))
  } catch (error) {
    console.error('Force regenerate error:', error)
    return NextResponse.json({ error: 'Failed to regenerate' }, { status: 500 })
  }
}
