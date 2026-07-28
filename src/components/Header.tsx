"use client"

import { motion } from "framer-motion"
import { FileCheck2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Phase } from "@/types"

interface HeaderProps {
  phase: Phase
  onNewCase: () => void
}

export function Header({ phase, onNewCase }: HeaderProps) {
  const hasCase = phase !== "upload"

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo + wordmark */}
        <motion.div
          className="flex items-center gap-2.5"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-bg shadow-sm">
            <FileCheck2 className="w-4 h-4 text-white" strokeWidth={2.2} />
          </div>
          <div className="leading-none">
            <span className="font-semibold text-slate-900 text-sm tracking-tight">Zikra</span>
            <span className="hidden sm:inline text-slate-400 text-xs ml-2">
              Filing Readiness Copilot
            </span>
          </div>
        </motion.div>

        {/* Right side */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Phase pill */}
          {phase !== "upload" && (
            <motion.span
              key={phase}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                phase === "processing"
                  ? "bg-indigo-50 text-indigo-600"
                  : phase === "report"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  phase === "processing"
                    ? "bg-indigo-500 animate-pulse-dot"
                    : phase === "report"
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />
              {phase === "processing"
                ? "Analysing"
                : phase === "report"
                ? "Report ready"
                : "Out of scope"}
            </motion.span>
          )}

          {hasCase && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-slate-500 hover:text-slate-800 text-xs h-7"
              onClick={onNewCase}
            >
              <RotateCcw className="w-3 h-3" />
              New case
            </Button>
          )}
        </motion.div>
      </div>
    </header>
  )
}
