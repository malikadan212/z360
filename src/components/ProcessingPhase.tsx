"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Loader2, Clock, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentEvent, AgentEventStatus, UploadedFile, IncomeRow } from "@/types"

// ─── Step metadata ────────────────────────────────────────────────────────────
const STEP_META: Record<string, { label: string; desc: string }> = {
  parse_document:      { label: "Parse documents",      desc: "Extract invoice fields from your income data" },
  validate_case:       { label: "Validate income type", desc: "Check against supported income categories" },
  rule_lookup:         { label: "Load FBR rules",       desc: "Fetch required document rules from reference table" },
  check_evidence:      { label: "Compare evidence",     desc: "Match uploaded docs against rule requirements" },
  notice_analyzer:     { label: "Analyse notice",       desc: "Decode FBR notice type, deadline, and severity" },
  readiness_evaluator: { label: "Calculate readiness",  desc: "Compute deterministic score from evidence" },
}

const PLACEHOLDER: AgentEvent[] = Object.keys(STEP_META).map((step, i) => ({
  id: `p${i}`, case_id: "", step, status: "pending" as const,
  started_at: null, completed_at: null, metadata: {},
}))

function detail(e: AgentEvent): string | null {
  const m = e.metadata
  if (e.status !== "completed") return null
  if (e.step === "parse_document")      return `Parsed ${(m.invoiceCount as number) ?? 0} invoice(s)`
  if (e.step === "validate_case")       return (m.incomeType as string) ?? null
  if (e.step === "rule_lookup")         return `Loaded ${(m.ruleCount as number) ?? 0} document rules`
  if (e.step === "notice_analyzer")     return (m.noticeType as string) ?? "Notice processed"
  if (e.step === "readiness_evaluator") return m.score !== undefined ? `Score: ${m.score}/100` : null
  return null
}

function StepIcon({ status }: { status: AgentEventStatus }) {
  if (status === "completed") return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
      <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={2} />
    </motion.div>
  )
  if (status === "failed") return <XCircle className="w-5 h-5 text-red-400" strokeWidth={2} />
  if (status === "running") return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" strokeWidth={2} />
  return <Clock className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
}

function Timer({ startedAt }: { startedAt: string }) {
  const [t, setT] = React.useState(0)
  React.useEffect(() => {
    const s = Date.now() - new Date(startedAt).getTime()
    setT(Math.floor(s / 1000))
    const iv = setInterval(() => setT(v => v + 1), 1000)
    return () => clearInterval(iv)
  }, [startedAt])
  return <span className="text-xs tabular-nums text-slate-400">{t}s</span>
}

export function ProcessingPhase({ events, rows, invoiceFiles, noticeFiles }: {
  events: AgentEvent[]; rows: IncomeRow[]; invoiceFiles: UploadedFile[]; noticeFiles: UploadedFile[]
}) {
  const display = events.length > 0 ? events : PLACEHOLDER
  const done = display.filter(e => e.status === "completed").length
  const total = display.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const running = display.find(e => e.status === "running")

  return (
    <motion.div
      key="processing"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-[calc(100vh-3rem)] flex flex-col lg:flex-row"
    >
      {/* ── Left panel — status overview ── */}
      <aside className="lg:w-80 xl:w-96 shrink-0 bg-slate-950 text-white flex flex-col px-8 py-10 lg:py-16">
        <motion.div
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col gap-8"
        >
          {/* Spinner + heading */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shrink-0">
              <Cpu className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Agent running</h2>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                {running ? (STEP_META[running.step]?.label ?? running.step) + "…" : "Initialising workflow…"}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{done} / {total} steps</span>
              <span className="text-indigo-400 font-semibold tabular-nums">{pct}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full gradient-bg"
                initial={{ width: "0%" }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Submitted summary */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Submitted</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Income entries</span>
                <span className="text-white font-medium">{rows.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Invoice PDFs</span>
                <span className="text-white font-medium">{invoiceFiles.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">FBR notice</span>
                <span className={cn("font-medium", noticeFiles.length > 0 ? "text-amber-400" : "text-slate-500")}>
                  {noticeFiles.length > 0 ? "1 uploaded" : "None"}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 mt-auto">Page updates automatically — no need to refresh.</p>
        </motion.div>
      </aside>

      {/* ── Right panel — step checklist ── */}
      <main className="flex-1 bg-white overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 lg:py-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="space-y-1"
          >
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-6">Workflow steps</h2>
            {display.map((event, i) => {
              const meta = STEP_META[event.step] ?? { label: event.step, desc: "" }
              const d = detail(event)
              const isRunning = event.status === "running"
              const isDone    = event.status === "completed"
              const isFailed  = event.status === "failed"
              const isPending = event.status === "pending"
              const duration  = isDone && event.started_at && event.completed_at
                ? ((new Date(event.completed_at).getTime() - new Date(event.started_at).getTime()) / 1000).toFixed(1)
                : null

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.28 }}
                  className={cn(
                    "flex items-start gap-4 rounded-lg px-4 py-3.5 transition-all duration-200",
                    isRunning ? "bg-indigo-50 ring-1 ring-indigo-100" :
                    isDone    ? "bg-slate-50/60" :
                    isFailed  ? "bg-red-50/60" : ""
                  )}
                >
                  <div className="pt-0.5 shrink-0"><StepIcon status={event.status} /></div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-sm font-medium",
                        isDone ? "text-slate-800" :
                        isRunning ? "text-indigo-700" :
                        isFailed ? "text-red-600" :
                        "text-slate-400"
                      )}>{meta.label}</span>
                      {!isPending && !isRunning && (
                        <span className="text-xs text-slate-400 hidden sm:inline">{meta.desc}</span>
                      )}
                      {isRunning && (
                        <span className="text-xs text-indigo-500 animate-pulse-dot">{meta.desc}</span>
                      )}
                    </div>
                    <AnimatePresence>
                      {d && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          className="text-xs text-slate-500 mt-0.5">
                          {d}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 pt-0.5">
                    {isRunning && event.started_at && <Timer startedAt={event.started_at} />}
                    {isDone && duration && <span className="text-xs text-slate-300 tabular-nums">{duration}s</span>}
                    <span className={cn(
                      "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums",
                      isDone    ? "bg-emerald-100 text-emerald-700" :
                      isRunning ? "bg-indigo-100 text-indigo-700" :
                      isFailed  ? "bg-red-100 text-red-600" :
                                  "bg-slate-100 text-slate-400"
                    )}>{i + 1}</span>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </main>
    </motion.div>
  )
}
