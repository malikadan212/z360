/**
 * Deterministic Filing Readiness Score calculator.
 * Pure code — no LLM involvement whatsoever.
 *
 * Rubric (100 pts total):
 *   25 — Invoices present
 *   40 — Required documents present
 *   10 — Case validated as in-scope
 *   10 — No open notice issues
 *   15 — No missing evidence
 */

export interface ScoringInput {
  invoiceCount:          number
  requiredDocuments:     string[]   // from tax_rules table
  uploadedDocumentNames: string[]   // file names the user actually provided
  caseValidated:         boolean
  noticeIssues:          NoticeIssueInput[]
}

export interface NoticeIssueInput {
  type:          string
  deadline:      string
  severity:      'high' | 'medium' | 'low'
  daysRemaining: number
}

export interface ScoreBreakdown {
  invoicesPresent:     number   // max 25
  requiredDocsPresent: number   // max 40
  caseValidated:       number   // max 10
  noOpenNoticeIssues:  number   // max 10
  noMissingEvidence:   number   // max 15
}

export interface ScoringResult {
  score:            number
  breakdown:        ScoreBreakdown
  missingDocuments: string[]
}

export function calculateScore(input: ScoringInput): ScoringResult {
  const breakdown: ScoreBreakdown = {
    invoicesPresent:     0,
    requiredDocsPresent: 0,
    caseValidated:       0,
    noOpenNoticeIssues:  0,
    noMissingEvidence:   0,
  }

  // ── 1. Invoices present (25 pts) ─────────────────────────────────────────
  // Full points at 5+ invoices, proportional below that, 0 for none.
  if (input.invoiceCount >= 5) {
    breakdown.invoicesPresent = 25
  } else if (input.invoiceCount > 0) {
    breakdown.invoicesPresent = Math.round((input.invoiceCount / 5) * 25)
  }

  // ── 2. Required documents present (40 pts) ────────────────────────────────
  const uploaded = input.uploadedDocumentNames.map(n => n.toLowerCase())
  const missingDocuments: string[] = []

  for (const doc of input.requiredDocuments) {
    // Extract meaningful keywords from the document name (skip short stop words)
    const keywords = doc
      .toLowerCase()
      .replace(/[()]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)

    const matched = uploaded.some(u => keywords.some(k => u.includes(k)))
    if (!matched) missingDocuments.push(doc)
  }

  const docsPresent = input.requiredDocuments.length - missingDocuments.length
  breakdown.requiredDocsPresent = input.requiredDocuments.length > 0
    ? Math.round((docsPresent / input.requiredDocuments.length) * 40)
    : 0

  // ── 3. Case validated as in-scope (10 pts) ────────────────────────────────
  breakdown.caseValidated = input.caseValidated ? 10 : 0

  // ── 4. No open notice issues (10 pts) ─────────────────────────────────────
  const hasHighSeverity = input.noticeIssues.some(
    n => n.severity === 'high' && n.daysRemaining <= 30
  )
  const hasMedium = input.noticeIssues.some(n => n.severity === 'medium')

  if (input.noticeIssues.length === 0) {
    breakdown.noOpenNoticeIssues = 10
  } else if (!hasHighSeverity && hasMedium) {
    breakdown.noOpenNoticeIssues = 5   // partial credit: medium notice, not urgent
  } else {
    breakdown.noOpenNoticeIssues = 0
  }

  // ── 5. No missing evidence (15 pts) ──────────────────────────────────────
  breakdown.noMissingEvidence = missingDocuments.length === 0 ? 15 : 0

  const score =
    breakdown.invoicesPresent +
    breakdown.requiredDocsPresent +
    breakdown.caseValidated +
    breakdown.noOpenNoticeIssues +
    breakdown.noMissingEvidence

  return { score, breakdown, missingDocuments }
}
