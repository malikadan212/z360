"use client"

import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

const SUPPORTED = [
  "Software development", "IT consulting",
  "SaaS subscriptions", "Web / mobile development",
  "UI/UX design services", "QA and testing services",
]

export function RejectedPhase({ onNewCase }: { onNewCase: () => void }) {
  return (
    <motion.div key="rejected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }} className="h-[calc(100vh-3.5rem)] flex">

      {/* Sidebar */}
      <aside className="w-72 xl:w-80 shrink-0 bg-slate-950 flex flex-col px-7 py-8">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="flex flex-col gap-5 flex-1">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Out of scope</h2>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              Your income doesn't match the supported category for this MVP.
            </p>
          </div>
          <Button onClick={onNewCase} className="gradient-bg border-0 text-white hover:opacity-90 gap-2 w-fit h-9 px-4 text-sm">
            <Plus className="w-3.5 h-3.5" /> New case
          </Button>
        </motion.div>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-white overflow-y-auto min-w-0 px-6 xl:px-10 py-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.3 }} className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">What's supported</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              This tool is scoped to Pakistani IT export freelancers earning foreign-service income.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            {SUPPORTED.map((ex, i) => (
              <motion.div key={ex} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2} />
                <span className="text-sm text-slate-700">{ex}</span>
              </motion.div>
            ))}
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Scope: </strong>
            Software/IT freelancers with foreign-service export income. Three common FBR notice types. Document readiness only — not tax liability.
          </div>
        </motion.div>
      </main>
    </motion.div>
  )
}
