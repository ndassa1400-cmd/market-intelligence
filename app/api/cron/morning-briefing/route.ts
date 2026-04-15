import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Check if briefing already exists for today
    const { data: existingBriefing } = await supabase
      .from('briefings')
      .select('id')
      .eq('briefing_date', today)
      .single()

    if (existingBriefing) {
      return NextResponse.json({ message: 'Briefing already exists for today' })
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

    // Generate briefing with Claude
    const client = new Anthropic()
    const systemPrompt = `You are a senior macro strategist at a top-tier global investment bank. Generate a complete daily market intelligence briefing as structured JSON.

Prior briefings context:
${historyContext}

Today is ${today}. Generate market analysis covering:
1. Overnight equity market moves
2. Central bank news
3. Commodity prices
4. Geopolitical developments
5. Tech/AI sector news
6. Crypto market
7. Industrial/supply chain
8. Banking and finance
9. Healthcare/pharma

Return ONLY valid JSON matching this exact structure:
{
  "displayDate": "April 15, 2026",
  "marketLevels": {"SP500": "value", "NASDAQ": "value", ...},
  "newsCards": [...],
  "movers": [...],
  "theses": [...],
  "macroSummary": "summary"
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: 'Generate briefing now.',
        },
      ],
      system: systemPrompt,
    })

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON
    let briefingContent
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      briefingContent = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      briefingContent = {
        displayDate: new Date().toLocaleDateString('en-NZ'),
        marketLevels: {},
        newsCards: [],
        movers: [],
        theses: [],
        macroSummary: 'Briefing generation in progress.',
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

    return NextResponse.json({
      success: true,
      message: 'Briefing generated successfully',
      briefing: newBriefing,
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json(
      { error: 'Failed to generate briefing' },
      { status: 500 }
    )
  }
}
