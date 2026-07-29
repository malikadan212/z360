"use client"

import { motion, AnimatePresence } from "framer-motion"
import { FileCheck2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Phase } from "@/types"

interface HeaderProps {
  phase: Phase
  onNewCase: () => void
}

const PHASE_LABELS: Record<Phase, { label: string; color: string; dot: string }> = {
  upload:     { label: "New case",     color: "text-slate-500 bg-slate-100",    dot: "bg-slate-400" },
  processing: { label: "Analysing",    color: "text-indigo-600 bg-indigo-50",   dot: "bg-indigo-500 animate-pulse-dot" },
  rejected:   { label: "Out of scope", color: "text-amber-600 bg-amber-50",     dot: "bg-amber-500" },
  report:     { label: "Report ready", color: "text-emerald-700 bg-emerald-50", dot: "bg-emerald-500" },
}

export function Header({ phase, onNewCase }: HeaderProps) {
  const pill = PHASE_LABELS[phase]

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">

        {/* Logo + wordmark */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shrink-0">
            <FileCheck2 className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <span className="font-bold text-slate-900 text-base tracking-tight">TaxReady</span>
            <span className="font-bold text-indigo-500 text-base">.pk</span>
          </div>
          <span className="hidden lg:block text-slate-200 mx-1 select-none">|</span>
          <span className="hidden lg:block text-slate-400 text-sm">FBR filing readiness for Pakistani freelancers</span>
        </div>

        {/* Phase pill */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className={`hidden sm:inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${pill.color}`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${pill.dot}`} />
            {pill.label}
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {phase !== "upload" && (
            <Button variant="outline" size="sm" onClick={onNewCase}
              className="h-8 text-sm gap-1.5 text-slate-600 border-slate-200 px-3">
              <Plus className="w-3.5 h-3.5" />
              New case
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
