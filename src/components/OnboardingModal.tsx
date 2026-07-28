"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FileCheck2, FileText, Upload, Bot, ArrowRight, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    icon: FileText,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    title: "Add your income",
    body: "Enter your freelance invoices — invoice number, client name, amount, currency, and date. You can type them in directly or import a CSV file. This is the core input the agent needs.",
    tip: "Even one invoice is enough to start. You can add more rows anytime.",
  },
  {
    icon: Upload,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    title: "Upload supporting files (optional)",
    body: "If you have invoice PDFs, drop them in. If you've received an FBR notice (show-cause, audit, or tax demand), upload that too — the agent will decode it and extract your response deadline.",
    tip: "PDF extraction is best-effort. Manual entry above is always more reliable.",
  },
  {
    icon: Bot,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    title: "We check your readiness",
    body: "A 6-step agent workflow runs automatically — it validates your income type, looks up FBR document rules, compares what you've provided, and calculates a deterministic Filing Readiness Score out of 100.",
    tip: "The score is calculated by code, not AI. Rules come from seeded FBR reference data.",
  },
  {
    icon: FileCheck2,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Get your report",
    body: "You'll see your score with a full breakdown, a list of every missing document with the rule reference explaining why it's needed, any notice deadlines, and recommended next steps.",
    tip: "This is a readiness check — not a tax filing or tax calculation tool.",
  },
]

interface OnboardingModalProps {
  onDismiss: () => void
}

export function OnboardingModal({ onDismiss }: OnboardingModalProps) {
  const [step, setStep] = React.useState(0)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]
  const Icon = current.icon

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onDismiss() }}
      >
        {/* Modal */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md gradient-bg flex items-center justify-center">
                <FileCheck2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-slate-900">How it works</span>
            </div>
            <button onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 px-6 pt-4">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={cn("h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-6 gradient-bg" : i < step ? "w-4 bg-indigo-200" : "w-4 bg-slate-200"
                )} />
            ))}
            <span className="ml-auto text-xs text-slate-400 tabular-nums">{step + 1} / {STEPS.length}</span>
          </div>

          {/* Step content */}
          <div className="px-6 py-5 min-h-[220px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", current.iconBg)}>
                    <Icon className={cn("w-5 h-5", current.iconColor)} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{current.title}</h3>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{current.body}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <p className="text-xs text-slate-500 leading-relaxed">{current.tip}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* What we support */}
          {step === 0 && (
            <div className="mx-6 mb-4 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2.5">
              <p className="text-xs font-semibold text-indigo-700 mb-1.5">Supported income types</p>
              <div className="flex flex-wrap gap-1.5">
                {["Software development", "IT consulting", "SaaS", "Web/mobile dev", "UI/UX design", "QA & testing"].map(t => (
                  <span key={t} className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-md">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-0"
            >
              ← Back
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button onClick={onDismiss} className="text-sm text-slate-400 hover:text-slate-600 transition-colors px-2">
                Skip
              </button>
              {isLast ? (
                <Button onClick={onDismiss} className="gradient-bg border-0 text-white hover:opacity-90 gap-2 h-9 px-5 text-sm">
                  Get started <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button onClick={() => setStep(s => s + 1)}
                  className="gradient-bg border-0 text-white hover:opacity-90 gap-2 h-9 px-5 text-sm">
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
