/**
 * POST /api/cases
 *
 * Fast, synchronous leg — runs in < 2 seconds.
 * Creates the case, uploads files to Storage via signed URLs,
 * inserts income_entries, seeds all agent_events as pending,
 * then returns case_id immediately.
 *
 * The browser flips to the processing phase and starts its
 * Realtime subscription on agent_events. The actual graph run
 * is triggered by a fire-and-forget POST to /api/agent/run.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// Agent steps in order — seeded as pending immediately so the
// Processing screen can render the full checklist before any run.
const AGENT_STEPS = [
  { step: 'parse_document',      label: 'Parsing income documents' },
  { step: 'validate_case',       label: 'Validating income type' },
  { step: 'rule_lookup',         label: 'Loading FBR document rules' },
  { step: 'check_evidence',      label: 'Comparing uploaded evidence' },
  { step: 'notice_analyzer',     label: 'Analysing FBR notice' },
  { step: 'readiness_evaluator', label: 'Calculating filing readiness' },
]

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    // ── Parse income rows (JSON string from the form) ──────────────────────
    const rowsJson = formData.get('rows') as string | null
    if (!rowsJson) {
      return NextResponse.json({ error: 'rows field is required' }, { status: 400 })
    }
    const rows: Array<{
      invoiceNumber: string
      client: string
      amount: string
      currency: string
      date: string
    }> = JSON.parse(rowsJson)

    if (!rows.length) {
      return NextResponse.json({ error: 'At least one income row is required' }, { status: 400 })
    }

    // Validate currencies — must be foreign-source only (matches DB constraint)
    const VALID_CURRENCIES = new Set(['USD', 'GBP', 'EUR', 'AUD', 'CAD'])
    const invalidRows = rows.filter(r => r.currency && !VALID_CURRENCIES.has(r.currency))
    if (invalidRows.length > 0) {
      const bad = [...new Set(invalidRows.map(r => r.currency))].join(', ')
      return NextResponse.json({
        error: `Invalid currency: ${bad}. This tool only supports foreign-source income (USD, GBP, EUR, AUD, CAD). PKR income does not qualify as export income for FBR filing purposes.`,
      }, { status: 400 })
    }

    const admin = createAdminClient()

    // ── 1. Create case ─────────────────────────────────────────────────────
    const { data: caseRow, error: caseErr } = await admin
      .from('cases')
      .insert({ status: 'created' })
      .select('id')
      .single()

    if (caseErr || !caseRow) {
      console.error('case insert error', caseErr)
      return NextResponse.json({ error: 'Failed to create case' }, { status: 500 })
    }

    const caseId = caseRow.id

    // ── 2. Upload files to Storage + record in uploaded_files ──────────────
    const invoiceFiles = formData.getAll('invoices') as File[]
    const noticeFiles  = formData.getAll('notice')   as File[]
    const allFiles = [
      ...invoiceFiles.map(f => ({ file: f, kind: 'invoice_pdf' as const })),
      ...noticeFiles.map(f  => ({ file: f, kind: 'notice'      as const })),
    ]

    const uploadedFilePaths: { kind: string; path: string; name: string }[] = []

    for (const { file, kind } of allFiles) {
      const ext  = file.name.split('.').pop() ?? 'bin'
      const path = `${caseId}/${kind}/${Date.now()}-${file.name}`

      const { error: uploadErr } = await admin.storage
        .from('case-files')
        .upload(path, await file.arrayBuffer(), {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadErr) {
        console.error('Storage upload error', uploadErr)
        // Non-fatal — log and continue; file simply won't be processed
        continue
      }

      uploadedFilePaths.push({ kind, path, name: file.name })
    }

    // Insert uploaded_files rows
    if (uploadedFilePaths.length > 0) {
      const { error: filesErr } = await admin.from('uploaded_files').insert(
        uploadedFilePaths.map(f => ({
          case_id:       caseId,
          kind:          f.kind,
          original_name: f.name,
          storage_path:  f.path,
        }))
      )
      if (filesErr) console.error('uploaded_files insert error', filesErr)
    }

    // ── 3. Insert income_entries ───────────────────────────────────────────
    const { error: entriesErr } = await admin.from('income_entries').insert(
      rows.map(r => ({
        case_id:        caseId,
        source:         'manual' as const,
        invoice_number: r.invoiceNumber || null,
        client:         r.client        || null,
        amount:         r.amount ? parseFloat(r.amount) : null,
        currency:       r.currency      || null,
        date:           r.date          || null,
      }))
    )
    if (entriesErr) console.error('income_entries insert error', entriesErr)

    // ── 4. Seed all agent_events as pending ────────────────────────────────
    const { error: eventsErr } = await admin.from('agent_events').insert(
      AGENT_STEPS.map(s => ({
        case_id:  caseId,
        step:     s.step,
        label:    s.label,
        status:   'pending',
        metadata: {},
      }))
    )
    if (eventsErr) console.error('agent_events seed error', eventsErr)

    // ── 5. Update case status to processing ────────────────────────────────
    await admin.from('cases').update({ status: 'processing' }).eq('id', caseId)

    // ── Return case_id — frontend now starts Realtime subscription ─────────
    return NextResponse.json({ caseId }, { status: 201 })

  } catch (err) {
    console.error('POST /api/cases unhandled error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
