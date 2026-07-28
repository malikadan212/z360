"use client"

import { motion } from "framer-motion"
import { AlertTriangle, RotateCcw, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const SUPPORTED_EXAMPLES = [
  "Software development",
  "IT consulting",
  "SaaS subscriptions",
  "Web / mobile development",
  "UI/UX design services",
  "QA and testing services",
]

interface RejectedPhaseProps {
  onNewCase: () => void
}

export function RejectedPhase({ onNewCase }: RejectedPhaseProps) {
  return (
    <motion.div
      key="rejected"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-amber-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />

        <div className="p-8 space-y-6">
          {/* Icon + heading */}
          <div className="flex items-start gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 shrink-0"
            >
              <AlertTriangle className="w-5 h-5 text-amber-500" strokeWidth={2} />
            </motion.div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 leading-snug">
                Income type not supported in this MVP
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Your uploaded income doesn&apos;t appear to match the currently supported category.
                This tool is scoped to Pakistani IT export freelancers earning foreign-service income.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Supported list */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Currently supported — IT Export Services
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUPPORTED_EXAMPLES.map((ex, i) => (
                <motion.div
                  key={ex}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.05 }}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={2.2} />
                  {ex}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Scope note */}
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Scope:</strong> This MVP supports software/IT freelancers with
            foreign-service export income and three common FBR notice types. It assesses document readiness,
            not tax liability.
          </div>

          {/* CTA */}
          <Button
            onClick={onNewCase}
            className="gap-2 gradient-bg border-0 text-white hover:opacity-90 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start a new case
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
