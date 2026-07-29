"use client"

import { motion } from "framer-motion"
import { AlertCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FailedPhase({ onNewCase }: { onNewCase: () => void }) {
  return (
    <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }} className="h-[calc(100vh-3.5rem)] flex">

      <aside className="w-72 xl:w-80 shrink-0 bg-slate-950 flex flex-col px-7 py-8">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="flex flex-col gap-5 flex-1">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-400" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Processing failed</h2>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              Something went wrong running the readiness check. Your inputs are safe — start a new case to try again.
            </p>
          </div>
          <Button onClick={onNewCase} className="gradient-bg border-0 text-white hover:opacity-90 gap-2 w-fit h-9 px-4 text-sm">
            <RotateCcw className="w-3.5 h-3.5" /> Try again
          </Button>
        </motion.div>
      </aside>

      <main className="flex-1 bg-white flex items-center justify-center px-6 xl:px-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.3 }}
          className="max-w-md space-y-4 text-center">
          <p className="text-base text-slate-500 leading-relaxed">
            The agent encountered an unexpected error. This is usually a temporary issue — try again and it should work.
          </p>
          <p className="text-sm text-slate-400">
            If it keeps failing, check that your invoice dates and currencies are valid, and that any uploaded PDFs are readable.
          </p>
        </motion.div>
      </main>
    </motion.div>
  )
}
