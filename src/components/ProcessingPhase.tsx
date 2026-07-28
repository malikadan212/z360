"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Loader2, Clock, FileText, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentEvent, AgentEventStatus, UploadedFile, IncomeRow } from "@/types"

// ─── Step icon ────────────────────────────────────────────────────────────────
function StepIcon({ status }: { status: AgentEventStatus }) {
  if (status === "completed") {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" strokeWidth={2.2} />
      </motion.div>
    )
  }
  if (status === "failed") {
    return (
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
        <XCircle className="w-4.5 h-4.5 text-red-400" strokeWidth={2.2} />
      </motion.div>
    )
  }
  if (status === "running") {
    return <Loader2 className="w-4.5 h-4.5 text-indigo-500 animate-spin" strokeWidth={2.2} />
  }
  return <Clock className="w-4.5 h-4.5 text-slate-300" strokeWidth={2} />
}

// ─── Step row label map ───────────────────────────────────────────────────────
const STEP_LABELS: Record<string, string> = {
  parse_document:       "Parsing income documents",
  validate_case:        "Validating income type",
  rule_lookup:          "Loading FBR document rules",
  check_evidence:       "Comparing uploaded evidence",
  notice_analyzer:      "Analysing FBR notice",
  readiness_evaluator:  "Calculating filing readiness",
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  parse_document:       <FileText className="w-3.5 h-3.5" />,
  validate_case:        <Zap className="w-3.5 h-3.5" />,
  rule_lookup:          <FileText className="w-3.5 h-3.5" />,
  check_evidence:       <FileText className="w-3.5 h-3.5" />,
  notice_analyzer:      <Zap className="w-3.5 h-3.5" />,
  readiness_evaluator:  <Zap className="w-3.5 h-3.5" />,
}

function stepDetail(event: AgentEvent): string | null {
  const m = event.metadata
  if (!m) return null
  if (event.step === "parse_document" && event.status === "completed") {
    const count = (m.invoiceCount as number) ?? 0
    return count ? `Parsed ${count} invoice${count > 1 ? "s" : ""}` : null
  }
  if (event.step === "validate_case" && event.status === "completed") {
    return (m.incomeType as string) ?? null
  }
  if (event.step === "rule_lookup" && event.status === "completed") {
    const count = (m.ruleCount as number) ?? 0
    return count ? `Loaded ${count} required document rules` : null
  }
  if (event.step === "notice_analyzer" && event.status === "completed") {
    return (m.noticeType as string) ?? "Notice processed"
  }
  if (event.step === "readiness_evaluator" && event.status === "completed") {
    const score = m.score as number | undefined
    return score !== undefined ? `Score: ${score}/100` : null
  }
  return null
}

// ─── Elapsed timer ────────────────────────────────────────────────────────────
function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    const start = new Date(startedAt).getTime()
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500)
    return () => clearInterval(iv)
  }, [startedAt])

  return (
    <span className="text-xs text-slate-400 tabular-nums">
      {elapsed}s
    </span>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ events }: { events: AgentEvent[] }) {
  const total = events.length || 6
  const done = events.filter((e) => e.status === "completed").length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-slate-500 font-medium">{done} of {total} steps complete</span>
        <span className="text-xs text-indigo-600 font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full gradient-bg"
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

// ─── Demo / placeholder steps for initial render ──────────────────────────────
const PLACEHOLDER_STEPS: AgentEvent[] = [
  { id: "p1", case_id: "", step: "parse_document",      status: "pending", started_at: null, completed_at: null, metadata: {} },
  { id: "p2", case_id: "", step: "validate_case",       status: "pending", started_at: null, completed_at: null, metadata: {} },
  { id: "p3", case_id: "", step: "rule_lookup",         status: "pending", started_at: null, completed_at: null, metadata: {} },
  { id: "p4", case_id: "", step: "check_evidence",      status: "pending", started_at: null, completed_at: null, metadata: {} },
  { id: "p5", case_id: "", step: "notice_analyzer",     status: "pending", started_at: null, completed_at: null, metadata: {} },
  { id: "p6", case_id: "", step: "readiness_evaluator", status: "pending", started_at: null, completed_at: null, metadata: {} },
]

// ─── Main Component ────────────────────────────────────────────────────────────
interface ProcessingPhaseProps {
  events: AgentEvent[]
  rows: IncomeRow[]
  invoiceFiles: UploadedFile[]
  noticeFiles: UploadedFile[]
}

export function ProcessingPhase({ events, rows, invoiceFiles, noticeFiles }: ProcessingPhaseProps) {
  const displayEvents = events.length > 0 ? events : PLACEHOLDER_STEPS

  const runningEvent = displayEvents.find((e) => e.status === "running")

  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4"
    >
      {/* Collapsed summary */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {rows.length} income entr{rows.length === 1 ? "y" : "ies"}
        </span>
        {invoiceFiles.length > 0 && (
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {invoiceFiles.length} invoice PDF{invoiceFiles.length > 1 ? "s" : ""}
          </span>
        )}
        {noticeFiles.length > 0 && (
          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
            1 FBR notice
          </span>
        )}
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        {/* Card header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl gradient-bg shadow-sm">
              <Loader2 className="w-4.5 h-4.5 text-white animate-spin" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Analysing your filing readiness</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {runningEvent
                  ? (STEP_LABELS[runningEvent.step] ?? runningEvent.step) + "…"
                  : "Setting up agent workflow…"}
              </p>
            </div>
          </div>
          <ProgressBar events={displayEvents} />
        </div>

        {/* Step checklist */}
        <div className="divide-y divide-slate-50">
          <AnimatePresence initial={false}>
            {displayEvents.map((event, i) => {
              const label = STEP_LABELS[event.step] ?? event.step
              const detail = stepDetail(event)
              const isRunning = event.status === "running"
              const isDone = event.status === "completed"
              const isFailed = event.status === "failed"

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className={cn(
                    "flex items-center gap-3 px-6 py-3.5 transition-colors",
                    isRunning && "bg-indigo-50/40",
                    isFailed && "bg-red-50/40"
                  )}
                >
                  {/* Icon */}
                  <div className="w-5 shrink-0 flex justify-center">
                    <StepIcon status={event.status} />
                  </div>

                  {/* Label + detail */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "text-sm transition-colors",
                        isDone ? "text-slate-700 font-medium" : "",
                        isRunning ? "text-indigo-700 font-medium" : "",
                        isFailed ? "text-red-600 font-medium" : "",
                        event.status === "pending" ? "text-slate-400" : ""
                      )}
                    >
                      {label}
                    </span>
                    <AnimatePresence>
                      {detail && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-xs text-slate-400 mt-0.5 truncate"
                        >
                          {detail}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isRunning && event.started_at && (
                      <ElapsedTimer startedAt={event.started_at} />
                    )}
                    {isDone && event.started_at && event.completed_at && (
                      <span className="text-xs text-slate-300 tabular-nums">
                        {(
                          (new Date(event.completed_at).getTime() -
                            new Date(event.started_at).getTime()) /
                          1000
                        ).toFixed(1)}s
                      </span>
                    )}
                    {/* Step index dot */}
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      isDone ? "bg-emerald-50 text-emerald-600" :
                      isRunning ? "bg-indigo-100 text-indigo-600" :
                      isFailed ? "bg-red-50 text-red-500" :
                      "bg-slate-100 text-slate-300"
                    )}>
                      {i + 1}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            The page updates automatically — no need to refresh.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
