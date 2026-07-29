/**
 * POST /api/agent/run
 *
 * Async leg — runs the full LangGraph graph for a given case.
 * Called immediately after /api/cases returns, without the client waiting.
 * Response is returned instantly (202 Accepted); all progress is communicated
 * via Supabase Realtime updates to agent_events and cases.
 *
 * export const maxDuration = 60 gives up to 60s on Vercel Pro.
 * For Hobby (10s limit), use Vercel's waitUntil pattern instead.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildGraph } from '@/lib/agent/graph'

export const runtime    = 'nodejs'
export const maxDuration = 60   // seconds — set higher on Vercel Pro if needed

export async function POST(req: NextRequest) {
  const { caseId } = await req.json() as { caseId: string }

  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
  }

  // Return 202 immediately — the graph runs in the background.
  // On Vercel, the function stays alive until maxDuration.
  const runPromise = runGraph(caseId)
  runPromise.catch(err => console.error('Graph run unhandled error', caseId, err))

  return NextResponse.json({ status: 'running', caseId }, { status: 202 })
}

async function runGraph(caseId: string) {
  const admin = createAdminClient()

  // Load the case data seeded by /api/cases
  const [
    { data: entries },
    { data: files },
  ] = await Promise.all([
    admin.from('income_entries').select('*').eq('case_id', caseId),
    admin.from('uploaded_files').select('*').eq('case_id', caseId),
  ])

  const manualRows = (entries ?? []).map(e => ({
    invoiceNumber: e.invoice_number ?? '',
    client:        e.client         ?? '',
    amount:        e.amount         ? String(e.amount) : '',
    currency:      e.currency       ?? '',
    date:          e.date           ?? '',
  }))

  const invoicePdfPaths = (files ?? [])
    .filter(f => f.kind === 'invoice_pdf')
    .map(f => f.storage_path)

  const noticeFile = (files ?? []).find(f => f.kind === 'notice')
  const noticePdfPath     = noticeFile?.storage_path ?? null
  const uploadedFileNames = (files ?? []).map(f => f.original_name)

  const graph = buildGraph()

  try {
    await graph.invoke({
      caseId,
      manualRows,
      invoicePdfPaths,
      noticePdfPath,
      uploadedFileNames,
      parsedInvoices:    [],
      incomeType:        null,
      caseValidated:     false,
      rules:             [],
      noticeResult:      null,
      finalReport:       null,
      error:             null,
    })
  } catch (err) {
    console.error('Graph invoke error', caseId, err)
    // Mark case as failed so the frontend doesn't hang
    await admin.from('cases').update({ status: 'rejected' }).eq('id', caseId)
  }
}
