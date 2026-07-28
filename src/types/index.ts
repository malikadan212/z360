// ─── Phase State Machine ─────────────────────────────────────────────────────
export type Phase = 'upload' | 'processing' | 'rejected' | 'report'

// ─── Income / Upload ─────────────────────────────────────────────────────────
export interface IncomeRow {
  id: string
  invoiceNumber: string
  client: string
  amount: string
  currency: string
  date: string
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: 'invoice' | 'notice'
  file: File
}

// ─── Agent Events (mirrors agent_events table) ────────────────────────────────
export type AgentEventStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface AgentEvent {
  id: string
  case_id: string
  step: string
  status: AgentEventStatus
  started_at: string | null
  completed_at: string | null
  metadata: Record<string, unknown>
}

// ─── Readiness Report ─────────────────────────────────────────────────────────
export interface ScoreBreakdown {
  invoicesPresent: number       // max 25
  requiredDocsPresent: number   // max 40
  caseValidated: number         // max 10
  noOpenNoticeIssues: number    // max 10
  noMissingEvidence: number     // max 15
}

export interface MissingItem {
  document: string
  reason: string
  reference: string
}

export interface NoticeIssue {
  type: string
  deadline: string
  severity: 'high' | 'medium' | 'low'
  daysRemaining: number
}

export interface ReadinessReport {
  score: number
  breakdown: ScoreBreakdown
  missingItems: MissingItem[]
  issues: NoticeIssue[]
  recommendations: string[]
  generatedAt: string
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
