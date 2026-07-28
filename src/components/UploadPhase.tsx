"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Trash2, Upload, FileText, X, ArrowRight,
  AlertCircle, Download, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { IncomeRow, UploadedFile } from "@/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CURRENCIES = ["USD", "GBP", "EUR", "AUD", "CAD", "PKR"]
const nanoid = () => Math.random().toString(36).slice(2, 9)

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Dropzone ─────────────────────────────────────────────────────────────────
interface DropzoneProps {
  label: string
  sublabel: string
  accept: string
  multiple?: boolean
  files: UploadedFile[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  type: "invoice" | "notice"
}

function Dropzone({ label, sublabel, accept, multiple = false, files, onAdd, onRemove, type }: DropzoneProps) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) onAdd(dropped)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 dot-pattern",
          "flex flex-col items-center justify-center gap-2 py-8 px-4 text-center",
          dragging
            ? "border-indigo-400 bg-indigo-50/60 scale-[1.005]"
            : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? [])
            if (fs.length) onAdd(fs)
            e.target.value = ""
          }}
        />
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
          dragging ? "bg-indigo-100" : "bg-slate-100"
        )}>
          <Upload className={cn("w-4 h-4", dragging ? "text-indigo-500" : "text-slate-400")} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
        </div>
      </div>

      {/* File chips */}
      <AnimatePresence initial={false}>
        {files.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2.5 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="text-xs text-slate-700 font-medium flex-1 truncate">{f.name}</span>
            <span className="text-xs text-slate-400 shrink-0">{formatFileSize(f.size)}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(f.id) }}
              className="ml-1 p-0.5 rounded hover:bg-slate-200 transition-colors"
              aria-label="Remove file"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Income Row ───────────────────────────────────────────────────────────────
interface RowInputsProps {
  row: IncomeRow
  index: number
  onChange: (id: string, field: keyof IncomeRow, value: string) => void
  onRemove: (id: string) => void
  isOnly: boolean
}

function IncomeRowInputs({ row, index, onChange, onRemove, isOnly }: RowInputsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22 }}
      className="grid grid-cols-12 gap-2 items-start"
    >
      {/* Row # */}
      <span className="col-span-1 text-xs text-slate-400 pt-2 text-right">{index + 1}</span>

      {/* Invoice # */}
      <Input
        placeholder="INV-001"
        value={row.invoiceNumber}
        onChange={(e) => onChange(row.id, "invoiceNumber", e.target.value)}
        className="col-span-2 h-8 text-xs"
      />

      {/* Client */}
      <Input
        placeholder="Client name"
        value={row.client}
        onChange={(e) => onChange(row.id, "client", e.target.value)}
        className="col-span-3 h-8 text-xs"
      />

      {/* Amount */}
      <Input
        placeholder="2500.00"
        type="number"
        value={row.amount}
        onChange={(e) => onChange(row.id, "amount", e.target.value)}
        className="col-span-2 h-8 text-xs"
      />

      {/* Currency */}
      <select
        value={row.currency}
        onChange={(e) => onChange(row.id, "currency", e.target.value)}
        className="col-span-2 h-8 text-xs rounded-lg border border-slate-200 bg-transparent px-2 text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
      >
        {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
      </select>

      {/* Date */}
      <Input
        type="date"
        value={row.date}
        onChange={(e) => onChange(row.id, "date", e.target.value)}
        className="col-span-1 h-8 text-xs hidden lg:block"
      />

      {/* Remove */}
      <div className="col-span-1 flex justify-end pt-1">
        <button
          onClick={() => onRemove(row.id)}
          disabled={isOnly}
          className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Remove row"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({
  number, title, badge, children, className
}: {
  number: string
  title: string
  badge?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center w-5 h-5 rounded-full gradient-bg text-white text-[10px] font-bold shrink-0">
          {number}
        </span>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {badge && (
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── CSV sample helper ────────────────────────────────────────────────────────
const CSV_SAMPLE = `invoice_number,client,amount,currency,date
INV-001,Acme Corp,2500.00,USD,2024-03-15
INV-002,Beta Ltd,1800.00,GBP,2024-04-02`

function downloadSampleCSV() {
  const blob = new Blob([CSV_SAMPLE], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "sample_income.csv"
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface UploadPhaseProps {
  rows: IncomeRow[]
  invoiceFiles: UploadedFile[]
  noticeFiles: UploadedFile[]
  onRowChange: (id: string, field: keyof IncomeRow, value: string) => void
  onRowAdd: () => void
  onRowRemove: (id: string) => void
  onInvoiceAdd: (files: File[]) => void
  onInvoiceRemove: (id: string) => void
  onNoticeAdd: (files: File[]) => void
  onNoticeRemove: (id: string) => void
  onCSVUpload: (file: File) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function UploadPhase({
  rows, invoiceFiles, noticeFiles,
  onRowChange, onRowAdd, onRowRemove,
  onInvoiceAdd, onInvoiceRemove,
  onNoticeAdd, onNoticeRemove,
  onCSVUpload, onSubmit, isSubmitting,
}: UploadPhaseProps) {
  const csvRef = React.useRef<HTMLInputElement>(null)

  const hasValidRow = rows.some(
    (r) => r.invoiceNumber.trim() && r.client.trim() && r.amount.trim() && r.date.trim()
  )

  const handleCSVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { onCSVUpload(f); e.target.value = "" }
  }

  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6"
    >
      {/* Hero */}
      <div className="text-center space-y-2 pb-2">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
        >
          Check your{" "}
          <span className="gradient-text">filing readiness</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-sm text-slate-500 max-w-md mx-auto"
        >
          For Pakistani IT export freelancers. Upload your income data and we'll
          tell you exactly what's missing before you file with FBR.
        </motion.p>
        {/* Scope badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="inline-flex items-center gap-1.5 text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full"
        >
          <Info className="w-3 h-3" />
          Supports IT export services only — software dev, consulting, SaaS
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        <div className="divide-y divide-slate-100">

          {/* ── Section 1: Income Data ── */}
          <div className="p-6 space-y-4">
            <Section number="1" title="Income Data" badge="required">
              {/* CSV toolbar */}
              <div className="flex items-center gap-2 mb-3">
                <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSVChange} />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => csvRef.current?.click()}
                >
                  <Upload className="w-3 h-3" /> Import CSV
                </Button>
                <button
                  onClick={downloadSampleCSV}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  <Download className="w-3 h-3" /> sample.csv
                </button>
                <span className="text-xs text-slate-300 ml-auto hidden sm:block">
                  or enter manually below
                </span>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 px-0 mb-1">
                <span className="col-span-1" />
                <span className="col-span-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Invoice #</span>
                <span className="col-span-3 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Client</span>
                <span className="col-span-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Amount</span>
                <span className="col-span-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Currency</span>
                <span className="col-span-1 text-[10px] font-medium text-slate-400 uppercase tracking-wide hidden lg:block">Date</span>
                <span className="col-span-1" />
              </div>

              {/* Rows */}
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {rows.map((row, i) => (
                    <IncomeRowInputs
                      key={row.id}
                      row={row}
                      index={i}
                      onChange={onRowChange}
                      onRemove={onRowRemove}
                      isOnly={rows.length === 1}
                    />
                  ))}
                </AnimatePresence>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 mt-1"
                onClick={onRowAdd}
              >
                <Plus className="w-3.5 h-3.5" /> Add row
              </Button>
            </Section>
          </div>

          {/* ── Section 2: Invoice PDFs ── */}
          <div className="p-6">
            <Section number="2" title="Invoice PDFs" badge="optional · best-effort">
              <Dropzone
                label="Drop invoice PDFs here, or click to browse"
                sublabel="PDF extraction is best-effort — manual entry above is more reliable"
                accept=".pdf,image/*"
                multiple
                files={invoiceFiles}
                onAdd={onInvoiceAdd}
                onRemove={onInvoiceRemove}
                type="invoice"
              />
            </Section>
          </div>

          {/* ── Section 3: FBR Notice ── */}
          <div className="p-6">
            <Section number="3" title="FBR Notice" badge="optional">
              <Dropzone
                label="Drop FBR notice here, or click to browse"
                sublabel="PDF or image — show-cause, audit notice, or tax demand"
                accept=".pdf,image/*"
                multiple={false}
                files={noticeFiles}
                onAdd={onNoticeAdd}
                onRemove={onNoticeRemove}
                type="notice"
              />
            </Section>
          </div>

          {/* ── Submit ── */}
          <div className="px-6 py-4 bg-slate-50/60 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-400 flex items-start gap-1.5 max-w-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
              Advisory readiness check only — not a substitute for a tax consultant or official FBR guidance.
            </p>
            <Button
              onClick={onSubmit}
              disabled={!hasValidRow || isSubmitting}
              className="gap-2 gradient-bg border-0 text-white hover:opacity-90 shrink-0 transition-all"
              size="default"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin-slow" />
                  Starting…
                </>
              ) : (
                <>
                  Check My Filing Readiness
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>

        </div>
      </motion.div>

      {/* Footer disclaimer */}
      <p className="text-center text-[11px] text-slate-300">
        Your files are processed server-side and not stored beyond this session without your consent.
      </p>
    </motion.div>
  )
}
