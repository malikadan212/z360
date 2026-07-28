"use client"

import * as React from "react"
import { AnimatePresence } from "framer-motion"

import { Header } from "@/components/Header"
import { UploadPhase } from "@/components/UploadPhase"
import { ProcessingPhase } from "@/components/ProcessingPhase"
import { RejectedPhase } from "@/components/RejectedPhase"
import { ReportPhase } from "@/components/ReportPhase"
import { OnboardingModal } from "@/components/OnboardingModal"

import { parseCSV } from "@/lib/csvParser"
import { MOCK_REPORT } from "@/lib/mockData"

import type {
  Phase, IncomeRow, UploadedFile,
  AgentEvent, ReadinessReport, ChatMessage,
} from "@/types"

const nanoid = () => Math.random().toString(36).slice(2, 9)
function emptyRow(): IncomeRow {
  return { id: nanoid(), invoiceNumber: "", client: "", amount: "", currency: "USD", date: "" }
}

export default function Home() {
  const [phase, setPhase]                   = React.useState<Phase>("upload")
  const [showOnboarding, setShowOnboarding] = React.useState(true)

  const [rows, setRows]               = React.useState<IncomeRow[]>([emptyRow()])
  const [invoiceFiles, setInvoiceFiles] = React.useState<UploadedFile[]>([])
  const [noticeFiles, setNoticeFiles]   = React.useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [agentEvents, setAgentEvents] = React.useState<AgentEvent[]>([])
  const [caseId, setCaseId]           = React.useState<string | null>(null)

  const [report, setReport]               = React.useState<ReadinessReport | null>(null)
  const [chatMessages, setChatMessages]   = React.useState<ChatMessage[]>([])
  const [isChatLoading, setIsChatLoading] = React.useState(false)

  // URL sync
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (caseId) url.searchParams.set("case", caseId)
    else url.searchParams.delete("case")
    window.history.replaceState({}, "", url.toString())
  }, [caseId])

  const handleRowChange = (id: string, field: keyof IncomeRow, value: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  const handleRowAdd    = () => setRows(prev => [...prev, emptyRow()])
  const handleRowRemove = (id: string) =>
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev)

  const addFiles = (
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
    type: UploadedFile["type"], multiple: boolean, files: File[]
  ) => {
    const mapped = files.map(f => ({ id: nanoid(), name: f.name, size: f.size, type, file: f }))
    setter(multiple ? prev => [...prev, ...mapped] : mapped.slice(0, 1))
  }

  const handleCSVUpload = async (file: File) => {
    const parsed = await parseCSV(file)
    if (parsed.length > 0) setRows(parsed)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const newCaseId = nanoid()
    setCaseId(newCaseId)
    setPhase("processing")
    setAgentEvents([])
    setIsSubmitting(false)
    simulateAgentRun(newCaseId)
  }

  const simulateAgentRun = (runCaseId: string) => {
    const steps = ["parse_document", "validate_case", "rule_lookup", "check_evidence", "notice_analyzer", "readiness_evaluator"]
    const metadata: Record<string, Record<string, unknown>> = {
      parse_document:      { invoiceCount: rows.length },
      validate_case:       { incomeType: "IT Export Services — validated" },
      rule_lookup:         { ruleCount: 4 },
      check_evidence:      {},
      notice_analyzer:     noticeFiles.length > 0 ? { noticeType: "Audit Notice detected" } : {},
      readiness_evaluator: { score: 68 },
    }

    setAgentEvents(steps.map((step, i) => ({
      id: `${runCaseId}-${i}`, case_id: runCaseId, step,
      status: "pending" as const, started_at: null, completed_at: null, metadata: {},
    })))

    let delay = 600
    steps.forEach((step, i) => {
      const runDelay = delay
      setTimeout(() => {
        setAgentEvents(prev => prev.map(e => e.step === step
          ? { ...e, status: "running", started_at: new Date().toISOString() } : e))
      }, runDelay)

      const doneDelay = delay + 900 + Math.random() * 400
      setTimeout(() => {
        setAgentEvents(prev => prev.map(e => e.step === step
          ? { ...e, status: "completed", completed_at: new Date().toISOString(), metadata: metadata[step] ?? {} } : e))
        if (i === steps.length - 1) {
          setTimeout(() => { setReport(MOCK_REPORT); setPhase("report") }, 600)
        }
      }, doneDelay)

      delay = doneDelay + 200
    })
  }

  const handleNewCase = () => {
    setPhase("upload"); setRows([emptyRow()])
    setInvoiceFiles([]); setNoticeFiles([])
    setAgentEvents([]); setCaseId(null)
    setReport(null); setChatMessages([])
    setIsSubmitting(false)
  }

  const handleChatSend = async (text: string) => {
    setChatMessages(prev => [...prev, { id: nanoid(), role: "user", content: text, timestamp: new Date().toISOString() }])
    setIsChatLoading(true)
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))
    const replies: Record<string, string> = {
      "why is my score not 100%": "Your score is 68/100 because three required documents are missing: the PRC, your platform export certificate, and PSEB registration. Together these account for 22 of the 40 points in the required-documents criterion.",
      "what is a prc": "A Pakistan Remittance Certificate (PRC) is issued by your bank and certifies that foreign currency was received through official banking channels. Under SRO 586(I)/1991, it's required to prove your income qualifies as export income.",
      "how urgent is my notice": "Your Audit Notice has 18 days remaining. Medium severity — you have time to prepare, but should not delay. Gather income evidence and consult a tax practitioner this week.",
    }
    const key = Object.keys(replies).find(k => text.toLowerCase().includes(k))
    const content = key ? replies[key]
      : `Your score is ${report?.score ?? "—"}/100 with ${report?.missingItems.length ?? 0} missing documents. Ask me about any specific item.`
    setChatMessages(prev => [...prev, { id: nanoid(), role: "assistant", content, timestamp: new Date().toISOString() }])
    setIsChatLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header phase={phase} onNewCase={handleNewCase} />

      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {phase === "upload" && (
            <UploadPhase key="upload" rows={rows} invoiceFiles={invoiceFiles} noticeFiles={noticeFiles}
              onRowChange={handleRowChange} onRowAdd={handleRowAdd} onRowRemove={handleRowRemove}
              onInvoiceAdd={f => addFiles(setInvoiceFiles, "invoice", true, f)}
              onInvoiceRemove={id => setInvoiceFiles(prev => prev.filter(f => f.id !== id))}
              onNoticeAdd={f => addFiles(setNoticeFiles, "notice", false, f)}
              onNoticeRemove={id => setNoticeFiles(prev => prev.filter(f => f.id !== id))}
              onCSVUpload={handleCSVUpload} onSubmit={handleSubmit} isSubmitting={isSubmitting}
            />
          )}
          {phase === "processing" && (
            <ProcessingPhase key="processing" events={agentEvents} rows={rows}
              invoiceFiles={invoiceFiles} noticeFiles={noticeFiles} />
          )}
          {phase === "rejected" && <RejectedPhase key="rejected" onNewCase={handleNewCase} />}
          {phase === "report" && report && (
            <ReportPhase key="report" report={report} chatMessages={chatMessages}
              onChatSend={handleChatSend} isChatLoading={isChatLoading} />
          )}
        </AnimatePresence>
      </main>

      {/* Onboarding modal — shown on first load */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal onDismiss={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
