/**
 * POST /api/chat
 *
 * Answers questions about an existing readiness report.
 * Does NOT re-run the LangGraph graph — single Gemini completion
 * with the report + rules as context.
 *
 * Body: { caseId: string, message: string, history: { role, content }[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createAdminClient } from '@/lib/supabase-admin'
import { withRetry } from '@/lib/agent/retry'

export const runtime = 'nodejs'

const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { caseId, message, history = [] } = await req.json() as {
      caseId:  string
      message: string
      history: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!caseId || !message) {
      return NextResponse.json({ error: 'caseId and message are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Fetch the report and the relevant rules — this is all the context Gemini needs
    const [
      { data: report },
      { data: rules },
      { data: caseRow },
    ] = await Promise.all([
      admin.from('readiness_reports').select('*').eq('case_id', caseId).single(),
      admin.from('tax_rules').select('required_document, reason, reference').eq('income_type', 'IT Export Services'),
      admin.from('cases').select('status').eq('id', caseId).single(),
    ])

    if (!report || caseRow?.status !== 'completed') {
      return NextResponse.json({ error: 'Report not ready' }, { status: 404 })
    }

    // Persist the user message
    await admin.from('chat_messages').insert({
      case_id: caseId,
      role:    'user',
      content: message,
    })

    // Build a tight system prompt — scoped context only, no hallucination
    const systemPrompt = `You are a filing readiness assistant for TaxReady.pk, helping Pakistani IT freelancers understand their FBR filing readiness report.

You have access to this specific user's report:

FILING READINESS SCORE: ${report.score}/100

SCORE BREAKDOWN:
${JSON.stringify(report.score_breakdown, null, 2)}

MISSING DOCUMENTS:
${JSON.stringify(report.missing_items, null, 2)}

NOTICE ISSUES:
${JSON.stringify(report.issues, null, 2)}

RECOMMENDATIONS:
${JSON.stringify(report.recommendations, null, 2)}

FBR DOCUMENT RULES (for reference):
${(rules ?? []).map((r: { required_document: string; reason: string; reference: string }) => `- ${r.required_document}: ${r.reason} (${r.reference})`).join('\n')}

CONSTRAINTS — you must follow these:
- Answer only questions about this user's readiness report or the referenced FBR rules.
- Do NOT estimate tax liability, calculate tax owed, or interpret the Finance Act.
- Do NOT give legal advice or act as a tax consultant.
- If asked something outside scope, say: "I can only help with your filing readiness — for that question, please consult a registered tax practitioner."
- Keep answers concise and practical. Use plain language, not legal jargon.
- This is an advisory readiness tool only.`

    // Build message history (cap at last 10 turns to keep tokens reasonable)
    const recentHistory = history.slice(-10)

    const model = genai.getGenerativeModel({
      model:          'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    })

    const chat = model.startChat({
      history: recentHistory.map(m => ({
        role:  m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    })

    const result    = await withRetry(() => chat.sendMessage(message))
    const replyText = result.response.text() || 'Sorry, I could not generate a response.'

    // Persist the assistant reply
    await admin.from('chat_messages').insert({
      case_id: caseId,
      role:    'assistant',
      content: replyText,
    })

    return NextResponse.json({ reply: replyText })

  } catch (err) {
    console.error('POST /api/chat error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
