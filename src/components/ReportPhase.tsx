"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle, CheckCircle2, XCircle, Clock,
  FileText, ArrowRight, ChevronDown, ChevronUp,
  Send, Bot, User, Loader2, Info, Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ReadinessReport, ChatMessage } from "@/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600"
  if (score >= 50) return "text-amber-500"
  return "text-red-500"
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-emerald-50 border-emerald-100"
  if (score >= 50) return "bg-amber-50 border-amber-100"
  return "bg-red-50 border-red-100"
}

function scoreLabel(score: number) {
  if (score >= 80) return "Ready to file"
  if (score >= 50) return "Needs attention"
  return "Not ready"
}

function scoreLabelColor(score: number) {
  if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200"
  if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200"
  return "text-red-600 bg-red-50 border-red-200"
}

function severityBadge(severity: string) {
  if (severity === "high") return "bg-red-50 text-red-600 border-red-200"
  if (severity === "medium") return "bg-amber-50 text-amber-600 border-amber-200"
  return "bg-slate-50 text-slate-600 border-slate-200"
}

const nanoid = () => Math.random().toString(36).slice(2, 9)

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const [displayed, setDisplayed] = React.useState(0)

  React.useEffect(() => {
    let frame: number
    const start = performance.now()
    const duration = 1000
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * score))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score])

  const offset = circumference - (displayed / 100) * circumference

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* Track */}
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        {/* Progress */}
        <motion.circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      {/* Number */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold tabular-nums leading-none", scoreColor(score))}>
          {displayed}
        </span>
        <span className="text-[11px] text-slate-400 font-medium mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

// ─── Score breakdown row ──────────────────────────────────────────────────────
function BreakdownRow({
  label, earned, max, delay
}: { label: string; earned: number; max: number; delay: number }) {
  const pct = max > 0 ? (earned / max) * 100 : 0
  const full = earned === max

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center gap-3"
    >
      <div className={cn(
        "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
        full ? "bg-emerald-100" : "bg-amber-100"
      )}>
        {full
          ? <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
          : <AlertTriangle className="w-3 h-3 text-amber-500" strokeWidth={2.5} />
        }
      </div>
      <span className="text-xs text-slate-600 flex-1">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", full ? "bg-emerald-500" : "bg-amber-400")}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: delay + 0.1, duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <span className={cn(
          "text-xs font-semibold tabular-nums w-12 text-right",
          full ? "text-emerald-600" : "text-amber-500"
        )}>
          {earned}/{max}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Missing item card ────────────────────────────────────────────────────────
function MissingItemCard({
  document: doc, reason, reference, index
}: { document: string; reason: string; reference: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/40 px-4 py-3"
    >
      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{doc}</p>
        <p className="text-xs text-slate-500 mt-0.5">{reason}</p>
        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
          <FileText className="w-2.5 h-2.5" />
          {reference}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Notice issue card ────────────────────────────────────────────────────────
function NoticeCard({
  issue, index
}: { issue: ReadinessReport["issues"][0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3"
    >
      <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={2} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800">{issue.type}</p>
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border",
            severityBadge(issue.severity)
          )}>
            {issue.severity} severity
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Response deadline: <strong className="text-slate-700">{issue.deadline}</strong>
        </p>
        {issue.daysRemaining <= 7 && (
          <p className="text-xs text-red-600 font-medium mt-1">
            ⚠ {issue.daysRemaining} day{issue.daysRemaining !== 1 ? "s" : ""} remaining
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function Section({
  title, count, children, defaultOpen = true, accentColor = "indigo"
}: {
  title: string
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
  accentColor?: "indigo" | "red" | "amber" | "emerald"
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  const accent = {
    indigo: "text-indigo-600",
    red: "text-red-500",
    amber: "text-amber-500",
    emerald: "text-emerald-500",
  }[accentColor]

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <h3 className="text-sm font-semibold text-slate-800 flex-1">{title}</h3>
        {count !== undefined && (
          <span className={cn("text-xs font-bold tabular-nums", accent)}>{count}</span>
        )}
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        }
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────
function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn("flex items-start gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        isUser ? "bg-indigo-600" : "bg-slate-100"
      )}>
        {isUser
          ? <User className="w-3 h-3 text-white" />
          : <Bot className="w-3 h-3 text-slate-500" />
        }
      </div>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
        isUser
          ? "bg-indigo-600 text-white rounded-tr-sm"
          : "bg-slate-100 text-slate-700 rounded-tl-sm"
      )}>
        {message.content}
      </div>
    </motion.div>
  )
}

// ─── Ask Questions ────────────────────────────────────────────────────────────
interface AskQuestionsProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
  isLoading: boolean
}

function AskQuestions({ messages, onSend, isLoading }: AskQuestionsProps) {
  const [input, setInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    onSend(text)
    setInput("")
  }

  const SUGGESTIONS = [
    "Why is my score not 100%?",
    "What is a PRC and how do I get one?",
    "How urgent is my notice deadline?",
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Ask questions</h3>
          <p className="text-xs text-slate-400">About your report, score, or next steps</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="h-56 overflow-y-auto px-5 py-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-xs text-slate-400 max-w-xs">
              Ask anything about your readiness report — why you scored as you did,
              what documents you need, or what a notice means.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s) }}
                  className="text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => <ChatBubble key={m.id} message={m} />)}
            {isLoading && (
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-slate-500" />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse-dot"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-end gap-2">
        <Textarea
          placeholder="Ask about your report…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          className="min-h-0 h-9 max-h-32 resize-none text-sm py-2 flex-1"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="h-9 w-9 gradient-bg border-0 text-white hover:opacity-90 shrink-0 transition-all"
        >
          {isLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Send className="w-3.5 h-3.5" />
          }
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface ReportPhaseProps {
  report: ReadinessReport
  chatMessages: ChatMessage[]
  onChatSend: (text: string) => void
  isChatLoading: boolean
}

export function ReportPhase({ report, chatMessages, onChatSend, isChatLoading }: ReportPhaseProps) {
  const { score, breakdown, missingItems, issues, recommendations } = report

  const breakdownRows = [
    { label: "Invoices present",          earned: breakdown.invoicesPresent,      max: 25 },
    { label: "Required documents present", earned: breakdown.requiredDocsPresent,  max: 40 },
    { label: "Case validated as in-scope", earned: breakdown.caseValidated,        max: 10 },
    { label: "No open notice issues",      earned: breakdown.noOpenNoticeIssues,   max: 10 },
    { label: "No missing evidence",        earned: breakdown.noMissingEvidence,    max: 15 },
  ]

  return (
    <motion.div
      key="report"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4"
    >

      {/* ── Report Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        {/* Top accent bar */}
        <div className="h-1 w-full gradient-bg" />

        {/* Score hero */}
        <div className={cn(
          "px-6 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-6",
          scoreBg(score)
        )}>
          <ScoreRing score={score} />
          <div className="text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg font-bold text-slate-900">Filing Readiness Report</h2>
              <span className={cn(
                "text-xs font-semibold px-2.5 py-0.5 rounded-full border",
                scoreLabelColor(score)
              )}>
                {scoreLabel(score)}
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm">
              {score >= 80
                ? "Your documentation looks solid. Review the recommendations before submitting."
                : score >= 50
                ? "You're missing some required documents. Address these before filing."
                : "Several critical items are missing. You're not ready to file yet."}
            </p>
            <p className="text-[11px] text-slate-400">
              Generated {new Date(report.generatedAt).toLocaleString("en-PK", {
                dateStyle: "medium", timeStyle: "short"
              })}
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">

          {/* Score Breakdown */}
          <div className="px-6 py-5 space-y-3">
            <Section title="Score Breakdown" accentColor="indigo" defaultOpen>
              <div className="space-y-3 pt-1">
                {breakdownRows.map((row, i) => (
                  <BreakdownRow key={row.label} {...row} delay={i * 0.06} />
                ))}
                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Total</span>
                  <span className={cn("text-base font-bold tabular-nums", scoreColor(score))}>
                    {score} / 100
                  </span>
                </div>
              </div>
            </Section>
          </div>

          {/* Missing Items */}
          {missingItems.length > 0 && (
            <div className="px-6 py-5">
              <Section
                title="Missing Documents"
                count={missingItems.length}
                accentColor="red"
                defaultOpen
              >
                <div className="space-y-2.5 pt-1">
                  {missingItems.map((item, i) => (
                    <MissingItemCard key={item.document} {...item} index={i} />
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Notice Issues */}
          {issues.length > 0 && (
            <div className="px-6 py-5">
              <Section
                title="Notice Issues"
                count={issues.length}
                accentColor="amber"
                defaultOpen
              >
                <div className="space-y-2.5 pt-1">
                  {issues.map((issue, i) => (
                    <NoticeCard key={issue.type} issue={issue} index={i} />
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="px-6 py-5">
              <Section title="Recommended Next Steps" accentColor="emerald" defaultOpen>
                <div className="space-y-2 pt-1">
                  {recommendations.map((rec, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3 }}
                      className="flex items-start gap-2.5"
                    >
                      <span className="flex items-center justify-center w-5 h-5 rounded-full gradient-bg text-white text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-600 leading-relaxed">{rec}</p>
                    </motion.div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Disclaimer */}
          <div className="px-6 py-4 bg-slate-50/60">
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>
                This is an advisory readiness tool only — not a substitute for a tax consultant
                or official FBR guidance. All rules are sourced from seeded reference data, not
                generated by AI.
              </p>
            </div>
          </div>

        </div>
      </motion.div>

      {/* ── Ask Questions ── */}
      <AskQuestions
        messages={chatMessages}
        onSend={onChatSend}
        isLoading={isChatLoading}
      />

    </motion.div>
  )
}
