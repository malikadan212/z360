/**
 * The four agent tools.
 *
 * LLM is used ONLY in:
 *   parse_document   — field extraction from PDF/image via Gemini vision
 *   notice_analyzer  — reading notice text to extract type + deadline
 *
 * Everything else (rule_lookup, readiness_evaluator) is deterministic code
 * reading from seeded Supabase tables or running the scoring rubric.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createAdminClient } from '@/lib/supabase-admin'
import { calculateScore, type ScoringInput } from './scoring'
import { withRetry } from './retry'

const genai  = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
const MODEL  = 'gemini-2.5-flash'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedInvoice {
  invoiceNumber:        string | null
  client:               string | null
  amount:               number | null
  currency:             string | null
  date:                 string | null
  extractionConfidence: 'high' | 'low' | 'unconfirmed'
  source:               'manual' | 'csv' | 'pdf'
}

export interface RuleResult {
  requiredDocument: string
  reason:           string
  reference:        string | null
}

export interface NoticeResult {
  noticeType:    string
  deadlineDays:  number
  severity:      'high' | 'medium' | 'low'
  deadline:      string   // ISO date string calculated from today
  daysRemaining: number
  confidence:    'high' | 'low'
  rawRequiredDocs: string[]
}

export interface ReadinessResult {
  score:       number
  breakdown:   ReturnType<typeof calculateScore>['breakdown']
  missingItems: Array<{ document: string; reason: string; reference: string }>
  issues:      Array<{ type: string; deadline: string; severity: string; daysRemaining: number }>
  recommendations: string[]
}

// ─── Tool 1: parse_document ───────────────────────────────────────────────────
// Primary path: manual/CSV rows are already structured — return as-is with high confidence.
// Secondary path: PDF/image files — Gemini vision extracts fields (best-effort).

export async function parseDocument(params: {
  manualRows: Array<{
    invoiceNumber: string; client: string
    amount: string; currency: string; date: string
  }>
  pdfStoragePaths: string[]   // paths in case-files bucket
  caseId: string
}): Promise<ParsedInvoice[]> {
  const results: ParsedInvoice[] = []

  // Manual rows — high confidence, no LLM needed
  for (const row of params.manualRows) {
    results.push({
      invoiceNumber:        row.invoiceNumber || null,
      client:               row.client        || null,
      amount:               row.amount        ? parseFloat(row.amount) : null,
      currency:             row.currency      || null,
      date:                 row.date          || null,
      extractionConfidence: 'high',
      source:               'manual',
    })
  }

  // PDF paths — Gemini vision, best-effort
  if (params.pdfStoragePaths.length > 0) {
    const admin = createAdminClient()

    for (const storagePath of params.pdfStoragePaths) {
      try {
        // Download file bytes from Storage
        const { data: fileData, error: dlErr } = await admin.storage
          .from('case-files')
          .download(storagePath)

        if (dlErr || !fileData) {
          console.error('PDF download error', storagePath, dlErr)
          // Push placeholder so this file surfaces as unconfirmed rather than silently vanishing
          results.push({
            invoiceNumber:        null,
            client:               null,
            amount:               null,
            currency:             null,
            date:                 null,
            extractionConfidence: 'unconfirmed',
            source:               'pdf',
          })
          continue
        }

        const buffer     = Buffer.from(await fileData.arrayBuffer())
        const base64Data = buffer.toString('base64')
        const mimeType   = storagePath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'

        const model    = genai.getGenerativeModel({ model: MODEL })
        const response = await withRetry(() => model.generateContent([
          {
            inlineData: { data: base64Data, mimeType },
          },
          `Extract invoice fields from this document. Return ONLY valid JSON with these exact keys:
{
  "invoiceNumber": string or null,
  "client": string or null,
  "amount": number or null,
  "currency": "USD"|"GBP"|"EUR"|"AUD"|"CAD" or null,
  "date": "YYYY-MM-DD" or null,
  "confidence": "high" or "low"
}
If you cannot confidently read a field, set it to null and set confidence to "low".
Do not include any explanation — only the JSON object.`,
        ]))

        const text = response.response.text()
        const jsonMatch = text.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])

            // Validate currency against allowed set — Gemini may return "Rs", "PKR", etc.
            // from messy invoices. Nullify and mark low-confidence rather than letting
            // an invalid value hit the DB check constraint mid-run.
            const VALID_CURRENCIES = new Set(['USD', 'GBP', 'EUR', 'AUD', 'CAD'])
            const rawCurrency   = parsed.currency ?? null
            const safeCurrency  = rawCurrency && VALID_CURRENCIES.has(rawCurrency) ? rawCurrency : null
            const confidence    = (parsed.confidence === 'high' && safeCurrency !== null)
              ? 'high' as const
              : 'low'  as const

            results.push({
              invoiceNumber:        parsed.invoiceNumber ?? null,
              client:               parsed.client        ?? null,
              amount:               parsed.amount        ?? null,
              currency:             safeCurrency,
              date:                 parsed.date          ?? null,
              extractionConfidence: confidence,
              source:               'pdf',
            })
          } catch {
            // JSON.parse failed — push placeholder so the file doesn't silently vanish
            results.push({
              invoiceNumber:        null,
              client:               null,
              amount:               null,
              currency:             null,
              date:                 null,
              extractionConfidence: 'unconfirmed',
              source:               'pdf',
            })
          }
        } else {
          // No JSON in response — push placeholder so file is surfaced, not silently dropped
          results.push({
            invoiceNumber:        null,
            client:               null,
            amount:               null,
            currency:             null,
            date:                 null,
            extractionConfidence: 'unconfirmed',
            source:               'pdf',
          })
        }
      } catch (err) {
        console.error('PDF extraction error', storagePath, err)
        // Push placeholder so this file is counted and surfaced, not silently dropped
        results.push({
          invoiceNumber:        null,
          client:               null,
          amount:               null,
          currency:             null,
          date:                 null,
          extractionConfidence: 'unconfirmed',
          source:               'pdf',
        })
      }
    }
  }

  return results
}

// ─── Tool 2: rule_lookup ──────────────────────────────────────────────────────
// Pure DB read — no LLM. Returns rules from the seeded tax_rules table.

export async function ruleLookup(incomeType: string): Promise<RuleResult[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('tax_rules')
    .select('required_document, reason, reference')
    .eq('income_type', incomeType)

  if (error) {
    console.error('rule_lookup error', error)
    return []
  }

  return (data ?? []).map(r => ({
    requiredDocument: r.required_document,
    reason:           r.reason,
    reference:        r.reference,
  }))
}

// ─── Tool 3: notice_analyzer ──────────────────────────────────────────────────
// Only called when a notice file is present.
// Gemini reads the notice text → matched against seeded notice_types table.

export async function noticeAnalyzer(params: {
  noticeStoragePath: string
}): Promise<NoticeResult | null> {
  const admin = createAdminClient()

  // Download the notice file
  const { data: fileData, error: dlErr } = await admin.storage
    .from('case-files')
    .download(params.noticeStoragePath)

  if (dlErr || !fileData) {
    console.error('Notice download error', dlErr)
    return null
  }

  const buffer     = Buffer.from(await fileData.arrayBuffer())
  const base64Data = buffer.toString('base64')
  const mimeType   = params.noticeStoragePath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'

  const model    = genai.getGenerativeModel({ model: MODEL })
  const response = await withRetry(() => model.generateContent([
    {
      inlineData: { data: base64Data, mimeType },
    },
    `This is an FBR (Federal Board of Revenue) notice from Pakistan.
 Identify the notice type. It will be one of:
 - "Show-Cause Notice"
 - "Audit Notice"
 - "Tax Demand Notice"
 - "Unknown"
 
 Return ONLY valid JSON:
 {
   "noticeType": string,
   "confidence": "high" or "low"
 }`,
  ]))

  const text      = response.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  let noticeType: string
  let confidence: 'high' | 'low'

  try {
    const parsed = JSON.parse(jsonMatch[0])
    noticeType = parsed.noticeType ?? 'Unknown'
    confidence = parsed.confidence === 'high' ? 'high' : 'low'
  } catch {
    return null
  }

  // Look up deadline and severity from seeded table
  const { data: noticeRow } = await admin
    .from('notice_types')
    .select('deadline_days, severity, required_documents')
    .eq('type_name', noticeType)
    .single()

  if (!noticeRow) {
    // Unknown notice type — return low-confidence result
    return {
      noticeType,
      deadlineDays:    30,
      severity:        'medium',
      deadline:        deadlineDate(30),
      daysRemaining:   30,
      confidence:      'low',
      rawRequiredDocs: [],
    }
  }

  return {
    noticeType,
    deadlineDays:    noticeRow.deadline_days,
    severity:        noticeRow.severity as 'high' | 'medium' | 'low',
    deadline:        deadlineDate(noticeRow.deadline_days),
    daysRemaining:   noticeRow.deadline_days,
    confidence,
    rawRequiredDocs: (noticeRow.required_documents as string[]) ?? [],
  }
}

// ─── Tool 4: readiness_evaluator ─────────────────────────────────────────────
// Fully deterministic — calls calculateScore() from scoring.ts.
// No LLM. The readiness score and recommendations are computed deterministically.

export async function readinessEvaluator(params: {
  parsedInvoices:       ParsedInvoice[]
  rules:                RuleResult[]
  noticeResult:         NoticeResult | null
  uploadedFileNames:    string[]
}): Promise<ReadinessResult> {
  const { parsedInvoices, rules, noticeResult, uploadedFileNames } = params

  const scoringInput: ScoringInput = {
    invoiceCount:         parsedInvoices.length,
    requiredDocuments:    rules.map(r => r.requiredDocument),
    uploadedDocumentNames: uploadedFileNames,
    caseValidated:        true,   // we're in this branch because validate_case passed
    noticeIssues:         noticeResult
      ? [{
          type:          noticeResult.noticeType,
          deadline:      noticeResult.deadline,
          severity:      noticeResult.severity,
          daysRemaining: noticeResult.daysRemaining,
        }]
      : [],
  }

  const { score, breakdown, missingDocuments } = calculateScore(scoringInput)

  // Build missing items with reasons from the rules table
  const missingItems = missingDocuments.map((docName: string) => {
    const rule = rules.find(r => r.requiredDocument === docName)
    return {
      document:  docName,
      reason:    rule?.reason    ?? 'Required for FBR filing',
      reference: rule?.reference ?? '',
    }
  })

  // Issues from notice
  const issues = noticeResult
    ? [{
        type:          noticeResult.noticeType,
        deadline:      noticeResult.deadline,
        severity:      noticeResult.severity,
        daysRemaining: noticeResult.daysRemaining,
      }]
    : []

  // Recommendations — deterministic list based on what's missing
  const recommendations = buildRecommendations(missingDocuments, noticeResult)

  return { score, breakdown, missingItems, issues, recommendations }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deadlineDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function buildRecommendations(
  missingDocs: string[],
  notice: NoticeResult | null
): string[] {
  const recs: string[] = []

  const docRecs: Record<string, string> = {
    'Proceeds Realization Certificate (PRC)':
      'Obtain your Proceeds Realization Certificate (PRC) from your bank for all foreign remittances in the relevant tax year.',
    'Freelance Platform Export Certificate':
      'Download your Export Certificate from your Upwork or Fiverr account settings (usually under Settings → Tax Information).',
    'PSEB Registration Certificate':
      'Register with PSEB at pseb.org.pk — free for freelancers, typically takes 5–7 business days, and qualifies you for the 0.25% preferential tax rate.',
    'NTN Registration Certificate':
      'Register for an NTN on the FBR IRIS portal (iris.fbr.gov.pk) if you don\'t have one — required before you can file.',
  }

  for (const doc of missingDocs) {
    const rec = docRecs[doc]
    if (rec) recs.push(rec)
    else recs.push(`Obtain the required document: ${doc}`)
  }

  if (notice) {
    if (notice.severity === 'high') {
      recs.push(`Respond to the ${notice.noticeType} within ${notice.daysRemaining} days (deadline: ${notice.deadline}). Consult a registered tax practitioner immediately.`)
    } else {
      recs.push(`Address the ${notice.noticeType} before the ${notice.deadline} deadline. Gather your income evidence and bank statements.`)
    }
  }

  recs.push('Consult a registered tax practitioner before submitting your FBR filing — this report assesses readiness only and is not legal or tax advice.')

  return recs
}
