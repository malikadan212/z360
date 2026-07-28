"use client"

import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

const SUPPORTED = [
  "Software development",
  "IT consulting",
  "SaaS subscriptions",
  "Web / mobile development",
  "UI/UX design services",
  "QA and testing services",
]

export function RejectedPhase({ onNewCase }: { onNewCase: () => void }) {
  return (
    <motion.div
      key="rejected"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row"
    >
      {/* Left sidebar */}
      <aside className="lg:w-80 xl:w-[22rem] shrink-0 bg-slate-950 text-white flex flex-col px-8 py-10 lg:py-16">
        <motion.div
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex-1 flex flex-col gap-6"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-400" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Out of scope</h2>
            <p className="text-base text-slate-400 mt-2 leading-relaxed">
              Your income doesn't match the currently supported category for this MVP.
            </p>
          </div>
          <Button onClick={onNewCase} className="gradient-bg border-0 text-white hover:opacity-90 gap-2 w-fit h-10 px-5 text-base">
            <Plus className="w-4 h-4" /> New case
          </Button>
        </motion.div>
      </aside>

      {/* Right panel */}
      <main className="flex-1 bg-white flex items-center justify-center px-5 sm:px-10 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="max-w-xl w-full space-y-8"
        >
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">What's supported</h3>
            <p className="text-base text-slate-500 leading-relaxed">
              This tool is scoped to Pakistani IT export freelancers earning foreign-service income. The following income types are currently supported:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {SUPPORTED.map((ex, i) => (
              <motion.div key={ex}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" strokeWidth={2} />
                <span className="text-base text-slate-700">{ex}</span>
              </motion.div>
            ))}
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 px-5 py-4 text-sm text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Scope: </strong>
            This MVP supports software/IT freelancers with foreign-service export income and three common FBR notice types. It assesses document readiness, not tax liability.
          </div>
        </motion.div>
      </main>
    </motion.div>
  )
}
