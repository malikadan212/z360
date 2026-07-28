"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Trash2, Upload, FileText, X, ArrowRight,
  Download, Info, Shield, Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { IncomeRow, UploadedFile } from "@/types"

const CURRENCIES = ["USD", "GBP", "EUR", "AUD", "CAD", "PKR"]
const fmt = (b: number) => b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`

const CSV_SAMPLE = `invoice_number,client,amount,currency,date\nINV-001,Acme Corp,2500.00,USD,2024-03-15\nINV-002,Beta Ltd,1800.00,GBP,2024-04-02`
function downloadSampleCSV() {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([CSV_SAMPLE], { type: "text/csv" })),
    download: "sample_income.csv",
  })
  a.click()
}

// ─── Dropzone ─────────────────────────────────────────────────────────────────
function Dropzone({ label, hint, accept, multiple = false, files, onAdd, onRemove }: {
  label: string; hint: string; accept: string; multiple?: boolean
  files: UploadedFile[]; onAdd: (f: File[]) => void; onRemove: (id: string) => void
}) {
  const [over, setOver] = React.useState(false)
  const ref = React.useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); const f = Array.from(e.dataTransfer.files); if (f.length) onAdd(f) }}
        onClick={() => ref.current?.click()}
        className={cn(
          "group cursor-pointer rounded-xl border-2 border-dashed transition-all duration-150 dot-pattern",
          "flex flex-col items-center justify-center gap-3 py-9 px-4 text-center",
          over ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/40"
        )}
      >
        <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden"
          onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) onAdd(f); e.target.value = "" }} />
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
          over ? "bg-indigo-100" : "bg-slate-100 group-hover:bg-slate-200")}>
          <Upload className={cn("w-5 h-5 transition-colors", over ? "text-indigo-500" : "text-slate-400")} />
        </div>
        <div>
          <p className="text-base font-medium text-slate-700">{label}</p>
          <p className="text-sm text-slate-400 mt-1">{hint}</p>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {files.map(f => (
          <motion.div key={f.id}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5"
          >
            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="text-sm text-slate-700 flex-1 truncate font-medium">{f.name}</span>
            <span className="text-sm text-slate-400 shrink-0">{fmt(f.size)}</span>
            <button onClick={e => { e.stopPropagation(); onRemove(f.id) }}
              className="p-1 rounded hover:bg-slate-200 transition-colors">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Income row ───────────────────────────────────────────────────────────────
function IncomeRowInputs({ row, index, onChange, onRemove, isOnly }: {
  row: IncomeRow; index: number
  onChange: (id: string, f: keyof IncomeRow, v: string) => void
  onRemove: (id: string) => void; isOnly: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
      className="grid gap-2 items-center"
      style={{ gridTemplateColumns: "2rem 1fr 1.5fr 1fr 5rem 1fr 2rem" }}
    >
      <span className="text-sm text-slate-400 text-right tabular-nums">{index + 1}</span>
      <Input placeholder="INV-001" value={row.invoiceNumber}
        onChange={e => onChange(row.id, "invoiceNumber", e.target.value)} className="h-9 text-sm" />
      <Input placeholder="Client" value={row.client}
        onChange={e => onChange(row.id, "client", e.target.value)} className="h-9 text-sm" />
      <Input placeholder="0.00" type="number" value={row.amount}
        onChange={e => onChange(row.id, "amount", e.target.value)} className="h-9 text-sm" />
      <select value={row.currency} onChange={e => onChange(row.id, "currency", e.target.value)}
        className="h-9 text-sm rounded-md border border-slate-200 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 w-full">
        {CURRENCIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <Input type="date" value={row.date}
        onChange={e => onChange(row.id, "date", e.target.value)} className="h-9 text-sm" />
      <button onClick={() => onRemove(row.id)} disabled={isOnly}
        className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed flex justify-center">
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface UploadPhaseProps {
  rows: IncomeRow[]; invoiceFiles: UploadedFile[]; noticeFiles: UploadedFile[]
  onRowChange: (id: string, f: keyof IncomeRow, v: string) => void
  onRowAdd: () => void; onRowRemove: (id: string) => void
  onInvoiceAdd: (f: File[]) => void; onInvoiceRemove: (id: string) => void
  onNoticeAdd: (f: File[]) => void; onNoticeRemove: (id: string) => void
  onCSVUpload: (f: File) => void; onSubmit: () => void; isSubmitting: boolean
}

export function UploadPhase({
  rows, invoiceFiles, noticeFiles,
  onRowChange, onRowAdd, onRowRemove,
  onInvoiceAdd, onInvoiceRemove,
  onNoticeAdd, onNoticeRemove,
  onCSVUpload, onSubmit, isSubmitting,
}: UploadPhaseProps) {
  const csvRef = React.useRef<HTMLInputElement>(null)
  const hasValid = rows.some(r => r.invoiceNumber.trim() && r.client.trim() && r.amount.trim() && r.date.trim())

  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="min-h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row"
    >
      {/* ── Left sidebar ── */}
      <aside className="lg:w-80 xl:w-[22rem] lg:min-h-full bg-slate-950 text-white flex flex-col px-8 py-10 lg:py-16 shrink-0">
        <motion.div
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col justify-between gap-10"
        >
          <div className="space-y-8">
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">For IT export freelancers</p>
              <h1 className="text-2xl xl:text-3xl font-bold leading-snug text-white">
                Is your paperwork<br />ready for FBR?
              </h1>
              <p className="text-base text-slate-400 mt-4 leading-relaxed">
                Upload your invoices and we'll check them against FBR rules — telling you exactly what's missing before you file.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Zap,     title: "Instant analysis",  desc: "6-step agent workflow in seconds" },
                { icon: FileText, title: "Rules, not guesses", desc: "All checks sourced from FBR references" },
                { icon: Shield,  title: "Advisory only",     desc: "Not a tax calculator or legal advice" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-white">{title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-slate-400 leading-relaxed">
              <span className="text-indigo-300 font-medium">Scope: </span>
              IT export services only — software dev, consulting, SaaS, web/mobile development.
            </div>
          </div>

          <p className="text-sm text-slate-600">Files processed server-side. Advisory use only.</p>
        </motion.div>
      </aside>

      {/* ── Right form panel ── */}
      <main className="flex-1 overflow-y-auto bg-white">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto px-5 sm:px-10 py-10 lg:py-14 space-y-10"
        >

          {/* Section 1: Income */}
          <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Income data <span className="text-red-400">*</span></h2>
                <p className="text-sm text-slate-500 mt-0.5">Enter manually or import from CSV</p>
              </div>
              <div className="flex items-center gap-3">
                <input ref={csvRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { onCSVUpload(f); e.target.value = "" } }} />
                <Button variant="outline" size="sm" className="h-8 text-sm gap-2 border-slate-200"
                  onClick={() => csvRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Import CSV
                </Button>
                <button onClick={downloadSampleCSV}
                  className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-500 transition-colors">
                  <Download className="w-3.5 h-3.5" /> sample
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid gap-2 bg-slate-50 px-4 py-2.5 border-b border-slate-200"
                style={{ gridTemplateColumns: "2rem 1fr 1.5fr 1fr 5rem 1fr 2rem" }}>
                {["#", "Invoice #", "Client", "Amount", "Cur.", "Date", ""].map((h, i) => (
                  <span key={i} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                  {rows.map((row, i) => (
                    <div key={row.id} className="px-4 py-2.5">
                      <IncomeRowInputs row={row} index={i} onChange={onRowChange} onRemove={onRowRemove} isOnly={rows.length === 1} />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
                <button onClick={onRowAdd}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Add row
                </button>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Sections 2 & 3 */}
          <div className="grid sm:grid-cols-2 gap-8">
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Invoice PDFs</h2>
                <p className="text-sm text-slate-500 mt-0.5">Optional · best-effort extraction</p>
              </div>
              <Dropzone
                label="Drop PDFs or images"
                hint="Extraction is best-effort — manual entry above is more reliable"
                accept=".pdf,image/*" multiple
                files={invoiceFiles} onAdd={onInvoiceAdd} onRemove={onInvoiceRemove}
              />
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">FBR Notice</h2>
                <p className="text-sm text-slate-500 mt-0.5">Optional · show-cause, audit, or demand</p>
              </div>
              <Dropzone
                label="Drop notice PDF or image"
                hint="We'll extract type, deadline, and severity"
                accept=".pdf,image/*" multiple={false}
                files={noticeFiles} onAdd={onNoticeAdd} onRemove={onNoticeRemove}
              />
            </section>
          </div>

          {/* Submit bar */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 -mx-5 sm:-mx-10 px-5 sm:px-10 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-400 items-center gap-2 hidden sm:flex">
              <Info className="w-4 h-4 text-slate-300 shrink-0" />
              Advisory only — not a substitute for a tax consultant or FBR guidance
            </p>
            <Button
              onClick={onSubmit}
              disabled={!hasValid || isSubmitting}
              className="gradient-bg border-0 text-white hover:opacity-90 transition-opacity gap-2 ml-auto h-10 px-6 text-base"
            >
              {isSubmitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" /> Starting…</>
              ) : (
                <>Check Filing Readiness <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>

        </motion.div>
      </main>
    </motion.div>
  )
}
