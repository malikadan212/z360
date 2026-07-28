"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle, CheckCircle2, XCircle, Clock,
  FileText, ChevronDown, ChevronUp,
  Send, Bot, User, Loader2, Info, Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ReadinessReport, ChatMessage } from "@/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const scoreColor = (s: number) => s >= 80 ? "text-emerald-600" : s >= 50 ? "text-amber-500" : "text-red-500"
const scoreLabel = (s: number) => s >= 80 ? "Ready to file" : s >= 50 ? "Needs attention" : "Not ready"
const scoreLabelCls = (s: number) =>
  s >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
  s >= 50 ? "text-amber-700 bg-amber-50 border-amber-200" :
            "text-red-700 bg-red-50 border-red-200"
const severityCls = (v: string) =>
  v === "high"   ? "text-red-700 bg-red-50 border-red-200" :
  v === "medium" ? "text-amber-700 bg-amber-50 border-amber-200" :
                   "text-slate-600 bg-slate-100 border-slate-200"

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 52, circ = 2 * Math.PI * r
  const [n, setN] = React.useState(0)

  React.useEffect(() => {
    let raf: number
    const t0 = performance.now(), dur = 900
    const run = (t: number) => {
      const p = Math.min((t - t0) / dur, 1)
      setN(Math.round((1 - Math.pow(1 - p, 3)) * score))
      if (p < 1) raf = requestAnimationFrame(run)
    }
    raf = requestAnimationFrame(run)
    return () => cancelAnimationFrame(raf)
  }, [score])

  return (
    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <motion.circle cx="60" cy="60" r={r} fill="none" stroke="url(#sg2)"
          strokeWidth="8" strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (n / 100) * circ }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-4xl font-bold tabular-nums leading-none", scoreColor(score))}>{n}</span>
        <span className="text-sm text-slate-400 mt-1">/ 100</span>
      </div>
    </div>
  )
}

// ─── Breakdown row ────────────────────────────────────────────────────────────
function BreakdownRow({ label, earned, max, delay }: { label: string; earned: number; max: number; delay: number }) {
  const full = earned === max
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.25 }}
      className="flex items-center gap-4">
      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0",
        full ? "bg-emerald-100" : "bg-amber-100")}>
        {full
          ? <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={3} />
          : <AlertTriangle className="w-3 h-3 text-amber-500" strokeWidth={3} />}
      </div>
      <span className="text-base text-slate-600 flex-1 min-w-0">{label}</span>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", full ? "bg-emerald-500" : "bg-amber-400")}
            initial={{ width: 0 }}
            animate={{ width: `${(earned / max) * 100}%` }}
            transition={{ delay: delay + 0.1, duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <span className={cn("text-sm font-semibold tabular-nums w-12 text-right",
          full ? "text-emerald-600" : "text-amber-500")}>
          {earned}/{max}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Collapsible ─────────────────────────────────────────────────────────────
function Collapsible({ title, count, children, accentCls = "text-indigo-600", defaultOpen = true }: {
  title: string; count?: number; children: React.ReactNode; accentCls?: string; defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 w-full py-4 text-left border-b border-slate-100 group">
        <span className="text-base font-semibold text-slate-800 flex-1">{title}</span>
        {count !== undefined && <span className={cn("text-base font-bold tabular-nums", accentCls)}>{count}</span>}
        {open
          ? <ChevronUp className="w-5 h-5 text-slate-400" />
          : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="pt-4 pb-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "Why is my score not 100%?",
  "What is a PRC and how do I get one?",
  "How urgent is my notice deadline?",
]

function Chat({ messages, onSend, loading }: {
  messages: ChatMessage[]; onSend: (t: string) => void; loading: boolean
}) {
  const [input, setInput] = React.useState("")
  const endRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])
  const send = () => { const t = input.trim(); if (!t || loading) return; onSend(t); setInput("") }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-900">Ask questions</p>
          <p className="text-sm text-slate-400">About your report or next steps</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-5 text-center py-6">
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Ask why you scored as you did, what a document means, or how urgent your notice deadline is.
            </p>
            <div className="flex flex-col w-full gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-sm text-left text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg px-4 py-2.5 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(m => (
              <motion.div key={m.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className={cn("flex items-start gap-3", m.role === "user" ? "flex-row-reverse" : "")}>
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                  m.role === "user" ? "gradient-bg" : "bg-slate-100")}>
                  {m.role === "user"
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-slate-500" />}
                </div>
                <div className={cn("max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "gradient-bg text-white rounded-tr-none"
                    : "bg-slate-100 text-slate-700 rounded-tl-none")}>
                  {m.content}
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="flex gap-1.5 bg-slate-100 rounded-xl rounded-tl-none px-4 py-3">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-pulse-dot"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-slate-200 flex items-end gap-2 shrink-0">
        <Textarea
          placeholder="Ask about your report…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
          className="min-h-0 h-10 max-h-28 resize-none text-sm py-2.5 flex-1 bg-slate-50 border-slate-200"
        />
        <Button size="icon" onClick={send} disabled={!input.trim() || loading}
          className="h-10 w-10 gradient-bg border-0 text-white hover:opacity-90 shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ReportPhase({ report, chatMessages, onChatSend, isChatLoading }: {
  report: ReadinessReport; chatMessages: ChatMessage[]
  onChatSend: (t: string) => void; isChatLoading: boolean
}) {
  const { score, breakdown, missingItems, issues, recommendations } = report

  const brows = [
    { label: "Invoices present",           earned: breakdown.invoicesPresent,     max: 25 },
    { label: "Required documents present", earned: breakdown.requiredDocsPresent, max: 40 },
    { label: "Case validated as in-scope", earned: breakdown.caseValidated,       max: 10 },
    { label: "No open notice issues",      earned: breakdown.noOpenNoticeIssues,  max: 10 },
    { label: "No missing evidence",        earned: breakdown.noMissingEvidence,   max: 15 },
  ]

  return (
    <motion.div
      key="report"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-[calc(100vh-3.5rem)] flex flex-col xl:flex-row"
    >
      {/* ── Report ── */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-2xl mx-auto px-5 sm:px-10 py-10 lg:py-14">

          {/* Score hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
            className="flex items-center gap-8 pb-8 border-b border-slate-100"
          >
            <ScoreRing score={score} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h2 className="text-2xl font-bold text-slate-900">Filing Readiness</h2>
                <span className={cn("text-sm font-semibold px-3 py-1 rounded-full border", scoreLabelCls(score))}>
                  {scoreLabel(score)}
                </span>
              </div>
              <p className="text-base text-slate-500 leading-relaxed">
                {score >= 80
                  ? "Your documentation looks solid. Review recommendations before submitting."
                  : score >= 50
                  ? "You're missing some required documents. Address these before filing."
                  : "Several critical items are missing. You're not ready to file yet."}
              </p>
              <p className="text-sm text-slate-400 mt-2">
                {new Date(report.generatedAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          </motion.div>

          {/* Breakdown */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }} className="py-2 border-b border-slate-100">
            <Collapsible title="Score Breakdown">
              <div className="space-y-4">
                {brows.map((r, i) => <BreakdownRow key={r.label} {...r} delay={i * 0.05} />)}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total</span>
                  <span className={cn("text-2xl font-bold tabular-nums", scoreColor(score))}>{score} / 100</span>
                </div>
              </div>
            </Collapsible>
          </motion.div>

          {/* Missing docs */}
          {missingItems.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }} className="py-2 border-b border-slate-100">
              <Collapsible title="Missing Documents" count={missingItems.length} accentCls="text-red-500">
                <div className="space-y-3">
                  {missingItems.map((item, i) => (
                    <motion.div key={item.document}
                      initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-4 rounded-xl border border-red-100 bg-red-50/40 px-5 py-4"
                    >
                      <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" strokeWidth={2} />
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-800">{item.document}</p>
                        <p className="text-sm text-slate-500 mt-1">{item.reason}</p>
                        <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-mono text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                          <FileText className="w-3 h-3" />{item.reference}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Collapsible>
            </motion.div>
          )}

          {/* Notice issues */}
          {issues.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }} className="py-2 border-b border-slate-100">
              <Collapsible title="Notice Issues" count={issues.length} accentCls="text-amber-500">
                <div className="space-y-3">
                  {issues.map((issue, i) => (
                    <motion.div key={issue.type}
                      initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-4 rounded-xl border border-amber-100 bg-amber-50/40 px-5 py-4"
                    >
                      <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" strokeWidth={2} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-base font-semibold text-slate-800">{issue.type}</p>
                          <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full border", severityCls(issue.severity))}>
                            {issue.severity} severity
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          Response deadline: <strong className="text-slate-700">{issue.deadline}</strong>
                        </p>
                        {issue.daysRemaining <= 7 && (
                          <p className="text-sm text-red-600 font-semibold mt-1">
                            ⚠ {issue.daysRemaining} day{issue.daysRemaining !== 1 ? "s" : ""} remaining
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Collapsible>
            </motion.div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }} className="py-2 border-b border-slate-100">
              <Collapsible title="Next Steps" accentCls="text-emerald-600">
                <div className="space-y-4">
                  {recommendations.map((rec, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-4"
                    >
                      <span className="w-6 h-6 rounded-full gradient-bg text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-base text-slate-600 leading-relaxed">{rec}</p>
                    </motion.div>
                  ))}
                </div>
              </Collapsible>
            </motion.div>
          )}

          {/* Disclaimer */}
          <div className="pt-8 flex items-start gap-2.5 text-sm text-slate-400">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Advisory readiness tool only — not a substitute for a tax consultant or official FBR guidance. All rules sourced from seeded reference data, not AI-generated.</p>
          </div>
        </div>
      </div>

      {/* ── Chat panel ── */}
      <div className="xl:w-[22rem] 2xl:w-96 shrink-0 border-t xl:border-t-0 xl:border-l border-slate-200 bg-white flex flex-col min-h-72 xl:min-h-0 xl:h-[calc(100vh-3.5rem)] xl:sticky xl:top-14">
        <Chat messages={chatMessages} onSend={onChatSend} loading={isChatLoading} />
      </div>
    </motion.div>
  )
}
