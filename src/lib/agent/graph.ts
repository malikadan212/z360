/**
 * LangGraph agent graph for TaxReady.pk
 *
 * Nodes:
 *   parse_document      → LLM (PDF vision) or passthrough (manual/CSV)
 *   validate_case       → deterministic code — DB lookup, no LLM
 *   rule_lookup         → deterministic code — DB read, no LLM
 *   check_evidence      → deterministic code — compare sets, no LLM
 *   notice_analyzer     → LLM (Claude reads notice) — conditional
 *   readiness_evaluator → deterministic scoring + deterministic recommendations
 *
 * Two conditional edges:
 *   1. After validate_case: supported → continue | unsupported → END (rejected)
 *   2. After check_evidence: notice present → notice_analyzer | absent → readiness_evaluator
 */

import { StateGraph, END, START } from '@langchain/langgraph'
import { Annotation } from '@langchain/langgraph'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  parseDocument, ruleLookup, noticeAnalyzer, readinessEvaluator,
  type ParsedInvoice, type RuleResult, type NoticeResult, type ReadinessResult,
} from './tools'

// ─── State ────────────────────────────────────────────────────────────────────

const GraphState = Annotation.Root({
  caseId:             Annotation<string>(),
  manualRows:         Annotation<Array<{ invoiceNumber: string; client: string; amount: string; currency: string; date: string }>>(),
  invoicePdfPaths:    Annotation<string[]>(),
  noticePdfPath:      Annotation<string | null>(),
  uploadedFileNames:  Annotation<string[]>(),

  // Populated by nodes
  parsedInvoices:     Annotation<ParsedInvoice[]>(),
  incomeType:         Annotation<string | null>(),
  caseValidated:      Annotation<boolean>(),
  rules:              Annotation<RuleResult[]>(),
  noticeResult:       Annotation<NoticeResult | null>(),
  finalReport:        Annotation<ReadinessResult | null>(),
  error:              Annotation<string | null>(),
})

type GraphStateType = typeof GraphState.State

// ─── Helper: update agent_event status ───────────────────────────────────────

async function setEventStatus(
  caseId:   string,
  step:     string,
  status:   'running' | 'completed' | 'failed',
  metadata: Record<string, unknown> = {}
) {
  const admin = createAdminClient()
  const now   = new Date().toISOString()

  await admin
    .from('agent_events')
    .update({
      status,
      ...(status === 'running'    ? { started_at:   now } : {}),
      ...(status === 'completed' || status === 'failed' ? { completed_at: now } : {}),
      metadata,
    })
    .eq('case_id', caseId)
    .eq('step', step)
}

// ─── Node 1: parse_document ───────────────────────────────────────────────────

async function nodeParseDocument(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { caseId } = state
  await setEventStatus(caseId, 'parse_document', 'running')

  try {
    const parsed = await parseDocument({
      manualRows:      state.manualRows,
      pdfStoragePaths: state.invoicePdfPaths,
      caseId,
    })

    // Update income_entries with any PDF-extracted data + confidence
    if (parsed.filter(p => p.source === 'pdf').length > 0) {
      const admin = createAdminClient()
      for (const entry of parsed.filter(p => p.source === 'pdf')) {
        await admin.from('income_entries').insert({
          case_id:               caseId,
          source:                'pdf',
          invoice_number:        entry.invoiceNumber,
          client:                entry.client,
          amount:                entry.amount,
          currency:              entry.currency,
          date:                  entry.date,
          extraction_confidence: entry.extractionConfidence,
        })
      }
    }

    await setEventStatus(caseId, 'parse_document', 'completed', {
      invoiceCount: parsed.length,
      lowConfidence: parsed.filter(p => p.extractionConfidence === 'low').length,
    })

    return { parsedInvoices: parsed, error: null }
  } catch (err) {
    await setEventStatus(caseId, 'parse_document', 'failed', { error: String(err) })
    return { parsedInvoices: [], error: String(err) }
  }
}

// ─── Node 2: validate_case ───────────────────────────────────────────────────
// Deterministic DB lookup — no LLM.

async function nodeValidateCase(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { caseId, parsedInvoices } = state
  await setEventStatus(caseId, 'validate_case', 'running')

  try {
    const admin = createAdminClient()

    // Check if the active income type exists
    const { data } = await admin
      .from('supported_income_types')
      .select('label')
      .eq('active', true)
      .limit(1)
      .single()

    // For MVP: only one supported type. If invoices exist, they're IT export services.
    // In a real build this would classify based on invoice content.
    const hasInvoices  = parsedInvoices.length > 0
    const incomeType   = data?.label ?? null
    const validated    = hasInvoices && !!incomeType

    await setEventStatus(caseId, 'validate_case', 'completed', {
      incomeType:    validated ? `${incomeType} — validated` : 'Not validated',
      invoiceCount:  parsedInvoices.length,
    })

    if (!validated) {
      // Mark case as rejected
      await admin.from('cases').update({ status: 'rejected' }).eq('id', caseId)
    }

    return { caseValidated: validated, incomeType: validated ? incomeType : null }
  } catch (err) {
    await setEventStatus(caseId, 'validate_case', 'failed', { error: String(err) })
    return { caseValidated: false, incomeType: null, error: String(err) }
  }
}

// ─── Node 3: rule_lookup ──────────────────────────────────────────────────────
// Pure DB read — no LLM.

async function nodeRuleLookup(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { caseId, incomeType } = state
  await setEventStatus(caseId, 'rule_lookup', 'running')

  try {
    const rules = await ruleLookup(incomeType ?? 'IT Export Services')

    await setEventStatus(caseId, 'rule_lookup', 'completed', {
      ruleCount: rules.length,
    })

    return { rules }
  } catch (err) {
    await setEventStatus(caseId, 'rule_lookup', 'failed', { error: String(err) })
    return { rules: [], error: String(err) }
  }
}

// ─── Node 4: check_evidence ───────────────────────────────────────────────────
// Deterministic set comparison — no LLM.

async function nodeCheckEvidence(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { caseId } = state
  await setEventStatus(caseId, 'check_evidence', 'running')

  try {
    const required  = state.rules.map(r => r.requiredDocument)
    const uploaded  = state.uploadedFileNames
    const present   = required.filter(doc =>
      uploaded.some(u => u.toLowerCase().includes(doc.toLowerCase().slice(0, 8)))
    )

    await setEventStatus(caseId, 'check_evidence', 'completed', {
      requiredCount: required.length,
      presentCount:  present.length,
      missingCount:  required.length - present.length,
    })

    return {}
  } catch (err) {
    await setEventStatus(caseId, 'check_evidence', 'failed', { error: String(err) })
    return { error: String(err) }
  }
}

// ─── Node 5: notice_analyzer ─────────────────────────────────────────────────
// Only called when a notice file is present. Uses Claude vision.

async function nodeNoticeAnalyzer(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { caseId, noticePdfPath } = state

  if (!noticePdfPath) {
    await setEventStatus(caseId, 'notice_analyzer', 'completed', { skipped: true })
    return { noticeResult: null }
  }

  await setEventStatus(caseId, 'notice_analyzer', 'running')

  try {
    const result = await noticeAnalyzer({ noticeStoragePath: noticePdfPath })

    await setEventStatus(caseId, 'notice_analyzer', 'completed', {
      noticeType:  result?.noticeType ?? 'Unknown',
      severity:    result?.severity,
      confidence:  result?.confidence,
    })

    return { noticeResult: result }
  } catch (err) {
    await setEventStatus(caseId, 'notice_analyzer', 'failed', { error: String(err) })
    return { noticeResult: null, error: String(err) }
  }
}

// ─── Node 6: readiness_evaluator ─────────────────────────────────────────────
// Deterministic scoring. Saves report to DB.

async function nodeReadinessEvaluator(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const { caseId } = state
  await setEventStatus(caseId, 'readiness_evaluator', 'running')

  try {
    const report = await readinessEvaluator({
      parsedInvoices:    state.parsedInvoices,
      rules:             state.rules,
      noticeResult:      state.noticeResult ?? null,
      uploadedFileNames: state.uploadedFileNames,
    })

    // Persist report to DB
    const admin = createAdminClient()
    await admin.from('readiness_reports').insert({
      case_id:         caseId,
      score:           report.score,
      score_breakdown: report.breakdown,
      missing_items:   report.missingItems,
      issues:          report.issues,
      recommendations: report.recommendations,
    })

    // Mark case complete
    await admin.from('cases').update({ status: 'completed' }).eq('id', caseId)

    await setEventStatus(caseId, 'readiness_evaluator', 'completed', {
      score: report.score,
    })

    return { finalReport: report }
  } catch (err) {
    await setEventStatus(caseId, 'readiness_evaluator', 'failed', { error: String(err) })
    return { finalReport: null, error: String(err) }
  }
}

// ─── Conditional edges ────────────────────────────────────────────────────────

function routeAfterValidation(state: GraphStateType): string {
  return state.caseValidated ? 'rule_lookup' : END
}

function routeAfterEvidence(state: GraphStateType): string {
  return state.noticePdfPath ? 'notice_analyzer' : 'readiness_evaluator'
}

// ─── Build graph ──────────────────────────────────────────────────────────────

export function buildGraph() {
  const graph = new StateGraph(GraphState)

  graph
    .addNode('parse_document',      nodeParseDocument)
    .addNode('validate_case',       nodeValidateCase)
    .addNode('rule_lookup',         nodeRuleLookup)
    .addNode('check_evidence',      nodeCheckEvidence)
    .addNode('notice_analyzer',     nodeNoticeAnalyzer)
    .addNode('readiness_evaluator', nodeReadinessEvaluator)

    .addEdge(START,                'parse_document')
    .addEdge('parse_document',     'validate_case')
    .addConditionalEdges('validate_case', routeAfterValidation, {
      rule_lookup: 'rule_lookup',
      [END]:       END,
    })
    .addEdge('rule_lookup',        'check_evidence')
    .addConditionalEdges('check_evidence', routeAfterEvidence, {
      notice_analyzer:     'notice_analyzer',
      readiness_evaluator: 'readiness_evaluator',
    })
    .addEdge('notice_analyzer',    'readiness_evaluator')
    .addEdge('readiness_evaluator', END)

  return graph.compile()
}
