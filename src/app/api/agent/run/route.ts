/**
 * POST /api/agent/run
 *
 * Runs the full LangGraph graph for a given case.
 * The browser fires this without awaiting the response — it gets a 202
 * immediately because we use the NextResponse trick below.
 *
 * IMPORTANT: On Vercel, a function is kept alive only as long as it's actively
 * executing. Returning early and running a Promise in the background does NOT
 * keep it alive. We use waitUntil() from @vercel/functions to correctly
 * register the background work with the runtime so the function stays alive
 * until the graph finishes, regardless of when the HTTP response was sent.
 *
 * export const maxDuration = 120 — Vercel Pro supports up to 800s;
 * set to 120 for safety. The graph typically runs in 15-40s.
 */

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildGraph } from '@/lib/agent/graph'

export const runtime     = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const { caseId } = await req.json() as { caseId: string }

  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
  }

  // Register the graph run with the Vercel runtime before returning the response.
  // waitUntil keeps the function alive until the Promise resolves, even after
  // the HTTP response has been sent to the client.
  waitUntil(runGraph(caseId))

  return NextResponse.json({ status: 'running', caseId }, { status: 202 })
}

async function runGraph(caseId: string) {
  const admin = createAdminClient()

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

  const invoicePdfPaths   = (files ?? []).filter(f => f.kind === 'invoice_pdf').map(f => f.storage_path)
  const noticeFile        = (files ?? []).find(f => f.kind === 'notice')
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
      parsedInvoices: [],
      incomeType:     null,
      caseValidated:  false,
      rules:          [],
      noticeResult:   null,
      finalReport:    null,
      error:          null,
    })
  } catch (err) {
    console.error('Graph invoke error', caseId, err)
    await admin.from('cases').update({ status: 'failed' }).eq('id', caseId)
  }
}
