"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Upload, FileText, X, ArrowRight, Download, Info, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { IncomeRow, UploadedFile } from "@/types"

const CURRENCIES = ["USD", "GBP", "EUR", "AUD", "CAD"]
const fmt = (b: number) => b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`
const CSV_SAMPLE = `invoice_number,client,amount,currency,date\nINV-001,Acme Corp,2500.00,USD,2024-03-15\nINV-002,Beta Ltd,1800.00,GBP,2024-04-02`

function downloadSampleCSV() {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([CSV_SAMPLE], { type: "text/csv" })),
    download: "sample_income.csv",
  })
  a.click()
}

function Dropzone({ label, hint, accept, multiple = false, files, onAdd, onRemove }: {
  label: string; hint: string; accept: string; multiple?: boolean
  files: UploadedFile[]; onAdd: (f: File[]) => void; onRemove: (id: string) => void
}) {
  const [over, setOver] = React.useState(false)
  const ref = React.useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-1.5">
      <div
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); const f = Array.from(e.dataTransfer.files); if (f.length) onAdd(f) }}
        onClick={() => ref.current?.click()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed transition-all duration-150",
          "flex items-center gap-4 px-5 py-4",
          over ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60"
        )}
      >
        <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden"
          onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) onAdd(f); e.target.value = "" }} />
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          over ? "bg-indigo-100" : "bg-slate-100")}>
          <Upload className={cn("w-4.5 h-4.5 transition-colors", over ? "text-indigo-500" : "text-slate-400")} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {files.map(f => (
          <motion.div key={f.id}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"
          >
            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="text-sm text-slate-700 flex-1 truncate">{f.name}</span>
            <span className="text-xs text-slate-400 shrink-0">{fmt(f.size)}</span>
            <button onClick={e => { e.stopPropagation(); onRemove(f.id) }} className="p-0.5 rounded hover:bg-slate-200">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function IncomeRowInputs({ row, index, onChange, onRemove, isOnly }: {
  row: IncomeRow; index: number
  onChange: (id: string, f: keyof IncomeRow, v: string) => void
  onRemove: (id: string) => void; isOnly: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
      className="grid gap-2 items-center"
      style={{ gridTemplateColumns: "1.75rem 1fr 1.6fr 1fr 5.5rem 1fr 1.75rem" }}
    >
      <span className="text-xs text-slate-400 text-right tabular-nums">{index + 1}</span>
      <Input placeholder="INV-001" value={row.invoiceNumber} onChange={e => onChange(row.id, "invoiceNumber", e.target.value)} className="h-9 text-sm" />
      <Input placeholder="Client name" value={row.client} onChange={e => onChange(row.id, "client", e.target.value)} className="h-9 text-sm" />
      <Input placeholder="0.00" type="number" value={row.amount} onChange={e => onChange(row.id, "amount", e.target.value)} className="h-9 text-sm" />
      <select value={row.currency} onChange={e => onChange(row.id, "currency", e.target.value)}
        className="h-9 text-sm rounded-md border border-slate-200 bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 w-full">
        {CURRENCIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <Input type="date" value={row.date} onChange={e => onChange(row.id, "date", e.target.value)} className="h-9 text-sm" />
      <button onClick={() => onRemove(row.id)} disabled={isOnly}
        className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed flex justify-center">
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

interface UploadPhaseProps {
  rows: IncomeRow[]; invoiceFiles: UploadedFile[]; noticeFiles: UploadedFile[]
  onRowChange: (id: string, f: keyof IncomeRow, v: string) => void
  onRowAdd: () => void; onRowRemove: (id: string) => void
  onInvoiceAdd: (f: File[]) => void; onInvoiceRemove: (id: string) => void
  onNoticeAdd: (f: File[]) => void; onNoticeRemove: (id: string) => void
  onCSVUpload: (f: File) => void; onSubmit: () => void; isSubmitting: boolean
  csvError: string | null
}

export function UploadPhase({
  rows, invoiceFiles, noticeFiles, onRowChange, onRowAdd, onRowRemove,
  onInvoiceAdd, onInvoiceRemove, onNoticeAdd, onNoticeRemove,
  onCSVUpload, onSubmit, isSubmitting, csvError,
}: UploadPhaseProps) {
  const csvRef = React.useRef<HTMLInputElement>(null)
  const hasValid = rows.some(r => r.invoiceNumber.trim() && r.client.trim() && r.amount.trim() && r.date.trim())

  return (
    <motion.div
      key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="h-[calc(100vh-3.5rem)] flex"
    >
      {/* ── Sidebar ── */}
      <aside className="w-72 xl:w-80 shrink-0 bg-slate-950 flex flex-col px-7 py-8 overflow-y-auto">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          className="flex flex-col gap-7 flex-1">
          <div>
            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2">For Pakistani freelancers</p>
            <h1 className="text-xl xl:text-2xl font-bold leading-tight text-white">
              Are your invoices ready for FBR?
            </h1>
            <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">
              Upload your foreign income invoices and get a readiness score — with a list of every missing document you need before filing with FBR.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              { icon: Zap,      title: "Know what's missing",  desc: "Before FBR finds out first" },
              { icon: FileText, title: "Rules, not guesses",    desc: "All checks from FBR references" },
              { icon: Shield,   title: "Advisory only",         desc: "Not a tax calculator or legal advice" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white leading-none">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-white/5 border border-white/8 px-4 py-3 text-xs text-slate-400 leading-relaxed">
            <span className="text-indigo-300 font-semibold">Scope: </span>
            IT export services only — software dev, consulting, SaaS, web/mobile development.
          </div>

          <p className="text-xs text-slate-600 mt-auto">TaxReady.pk — not a tax calculator. Advisory use only.</p>
        </motion.div>
      </aside>

      {/* ── Form ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="flex-1 overflow-y-auto px-6 xl:px-10 py-6 space-y-5">

          {/* Income section */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
               <div>
                 <h2 className="text-base font-semibold text-slate-900">Income data <span className="text-red-400">*</span></h2>
                 <p className="text-xs text-slate-500">Enter manually or import from CSV</p>
               </div>
               {csvError && (
                 <p className="text-xs text-red-400 mt-1">{csvError}</p>
               )}
              <div className="flex items-center gap-2.5">
                <input ref={csvRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { onCSVUpload(f); e.target.value = "" } }} />
                <Button variant="outline" size="sm" className="h-8 text-sm gap-1.5 border-slate-200"
                  onClick={() => csvRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Import CSV
                </Button>
                <button onClick={downloadSampleCSV}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-500 transition-colors">
                  <Download className="w-3.5 h-3.5" /> sample
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="grid gap-2 bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wide"
                style={{ gridTemplateColumns: "1.75rem 1fr 1.6fr 1fr 5.5rem 1fr 1.75rem" }}>
                {["#", "Invoice #", "Client", "Amount", "Cur.", "Date", ""].map((h, i) => <span key={i}>{h}</span>)}
              </div>
              <div className="divide-y divide-slate-100">
                <AnimatePresence initial={false}>
                  {rows.map((row, i) => (
                    <div key={row.id} className="px-3 py-1.5">
                      <IncomeRowInputs row={row} index={i} onChange={onRowChange} onRemove={onRowRemove} isOnly={rows.length === 1} />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/60">
                <button onClick={onRowAdd} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Add row
                </button>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* PDFs + Notice side by side */}
          <div className="grid grid-cols-2 gap-5">
            <section className="space-y-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Invoice PDFs</h2>
                <p className="text-xs text-slate-500">Optional · best-effort extraction</p>
              </div>
              <Dropzone label="Drop PDFs or images" hint="Best-effort — manual entry above is more reliable"
                accept=".pdf,image/*" multiple files={invoiceFiles} onAdd={onInvoiceAdd} onRemove={onInvoiceRemove} />
            </section>

            <section className="space-y-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">FBR Notice</h2>
                <p className="text-xs text-slate-500">Optional · show-cause, audit, or demand</p>
              </div>
              <Dropzone label="Drop notice PDF or image" hint="We'll extract type, deadline, and severity"
                accept=".pdf,image/*" multiple={false} files={noticeFiles} onAdd={onNoticeAdd} onRemove={onNoticeRemove} />
            </section>
          </div>
        </motion.div>

        {/* Footer bar */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-6 xl:px-10 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400 flex items-center gap-1.5 hidden sm:flex">
            <Info className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            Advisory only — not a substitute for a tax consultant or FBR guidance
          </p>
          <Button onClick={onSubmit} disabled={!hasValid || isSubmitting}
            className="gradient-bg border-0 text-white hover:opacity-90 gap-2 ml-auto h-9 px-5 text-sm">
            {isSubmitting
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" /> Starting…</>
              : <>Check Filing Readiness <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </div>
      </main>
    </motion.div>
  )
}
