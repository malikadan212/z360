"use client"

import * as React from "react"
import { AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"

import { Header } from "@/components/Header"
import { UploadPhase } from "@/components/UploadPhase"
import { ProcessingPhase } from "@/components/ProcessingPhase"
import { RejectedPhase } from "@/components/RejectedPhase"
import { ReportPhase } from "@/components/ReportPhase"

import { parseCSV } from "@/lib/csvParser"
import { MOCK_AGENT_EVENTS, MOCK_REPORT } from "@/lib/mockData"

import type {
  Phase, IncomeRow, UploadedFile,
  AgentEvent, ReadinessReport, ChatMessage,
} from "@/types"

// ─── Tiny helpers ──────────────────────────────────────────────────────────────
const nanoid = () => Math.random().toString(36).slice(2, 9)

function emptyRow(): IncomeRow {
  return { id: nanoid(), invoiceNumber: "", client: "", amount: "", currency: "USD", date: "" }
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  // ── Phase state ──
  const [phase, setPhase] = React.useState<Phase>("upload")

  // ── Upload state ──
  const [rows, setRows] = React.useState<IncomeRow[]>([emptyRow()])
  const [invoiceFiles, setInvoiceFiles] = React.useState<UploadedFile[]>([])
  const [noticeFiles, setNoticeFiles]   = React.useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // ── Processing state ──
  const [agentEvents, setAgentEvents] = React.useState<AgentEvent[]>([])
  const [caseId, setCaseId]           = React.useState<string | null>(null)

  // ── Report state ──
  const [report, setReport]           = React.useState<ReadinessReport | null>(null)
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([])
  const [isChatLoading, setIsChatLoading] = React.useState(false)

  // ── URL sync ──
  // Mirror caseId in ?case= param for demo-resilience (refresh won't lose place)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (caseId) {
      url.searchParams.set("case", caseId)
    } else {
      url.searchParams.delete("case")
    }
    window.history.replaceState({}, "", url.toString())
  }, [caseId])

  // ── Row handlers ──
  const handleRowChange = (id: string, field: keyof IncomeRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }
  const handleRowAdd    = () => setRows((prev) => [...prev, emptyRow()])
  const handleRowRemove = (id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))
  }

  // ── File handlers ──
  const addFiles = (
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
    type: UploadedFile["type"],
    multiple: boolean,
    files: File[]
  ) => {
    const mapped: UploadedFile[] = files.map((f) => ({
      id: nanoid(), name: f.name, size: f.size, type, file: f,
    }))
    setter(multiple ? (prev) => [...prev, ...mapped] : mapped.slice(0, 1))
  }

  // ── CSV upload ──
  const handleCSVUpload = async (file: File) => {
    const parsed = await parseCSV(file)
    if (parsed.length > 0) setRows(parsed)
  }

  // ── Submit / run agent ──
  const handleSubmit = async () => {
    setIsSubmitting(true)

    // In the real flow: create the case in Supabase, upload files, call /api/agent
    // For now: simulate processing with mock data, with realistic timing

    const newCaseId = nanoid()
    setCaseId(newCaseId)
    setPhase("processing")
    setAgentEvents([])
    setIsSubmitting(false)

    // Simulate agent events arriving over time
    simulateAgentRun(newCaseId)
  }

  // ── Demo simulation ─────────────────────────────────────────────────────────
  // This will be replaced by a Supabase Realtime subscription when the backend lands.
  // For now it drives the Processing screen authentically.
  const simulateAgentRun = (runCaseId: string) => {
    const steps = [
      "parse_document", "validate_case", "rule_lookup",
      "check_evidence", "notice_analyzer", "readiness_evaluator",
    ]
    const metadata: Record<string, Record<string, unknown>> = {
      parse_document:      { invoiceCount: rows.length },
      validate_case:       { incomeType: "IT Export Services — validated" },
      rule_lookup:         { ruleCount: 4 },
      check_evidence:      {},
      notice_analyzer:     noticeFiles.length > 0 ? { noticeType: "Audit Notice detected" } : {},
      readiness_evaluator: { score: 68 },
    }

    // Seed all steps as pending immediately
    const pending: AgentEvent[] = steps.map((step, i) => ({
      id: `${runCaseId}-${i}`,
      case_id: runCaseId,
      step,
      status: "pending" as const,
      started_at: null,
      completed_at: null,
      metadata: {},
    }))
    setAgentEvents(pending)

    let delay = 600
    steps.forEach((step, i) => {
      // Mark running
      const runDelay = delay
      setTimeout(() => {
        setAgentEvents((prev) =>
          prev.map((e) =>
            e.step === step
              ? { ...e, status: "running", started_at: new Date().toISOString() }
              : e
          )
        )
      }, runDelay)

      // Mark completed
      const doneDelay = delay + 900 + Math.random() * 400
      setTimeout(() => {
        setAgentEvents((prev) =>
          prev.map((e) =>
            e.step === step
              ? {
                  ...e,
                  status: "completed",
                  completed_at: new Date().toISOString(),
                  metadata: metadata[step] ?? {},
                }
              : e
          )
        )

        // After last step: move to report
        if (i === steps.length - 1) {
          setTimeout(() => {
            setReport(MOCK_REPORT)
            setPhase("report")
          }, 600)
        }
      }, doneDelay)

      delay = doneDelay + 200
    })
  }

  // ── New case reset ──
  const handleNewCase = () => {
    setPhase("upload")
    setRows([emptyRow()])
    setInvoiceFiles([])
    setNoticeFiles([])
    setAgentEvents([])
    setCaseId(null)
    setReport(null)
    setChatMessages([])
    setIsSubmitting(false)
  }

  // ── Chat ──
  const handleChatSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: nanoid(), role: "user", content: text,
      timestamp: new Date().toISOString(),
    }
    setChatMessages((prev) => [...prev, userMsg])
    setIsChatLoading(true)

    // Simulate assistant reply — replace with /api/agent?mode=chat
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800))

    const replies: Record<string, string> = {
      "why is my score not 100%": "Your score is 68/100 because three required documents are missing: the PRC, your platform export certificate, and PSEB registration. Together these account for 22 of the 40 points in the required-documents criterion.",
      "what is a prc": "A Pakistan Remittance Certificate (PRC) is issued by your bank and certifies that foreign currency was received through official banking channels. Under SRO 586(I)/1991, it's required to prove your income qualifies as export income for tax purposes.",
      "how urgent is my notice": "Your Audit Notice has 18 days remaining before the response deadline. Medium severity — you have time to prepare, but should not delay. Gather your income evidence and consult a tax practitioner this week.",
    }

    const key = Object.keys(replies).find((k) => text.toLowerCase().includes(k))
    const content = key
      ? replies[key]
      : `Based on your readiness report, your score is ${report?.score ?? "—"}/100. You have ${report?.missingItems.length ?? 0} missing documents. Would you like more detail on any specific item?`

    const assistantMsg: ChatMessage = {
      id: nanoid(), role: "assistant", content,
      timestamp: new Date().toISOString(),
    }
    setChatMessages((prev) => [...prev, assistantMsg])
    setIsChatLoading(false)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <Header phase={phase} onNewCase={handleNewCase} />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {phase === "upload" && (
            <UploadPhase
              key="upload"
              rows={rows}
              invoiceFiles={invoiceFiles}
              noticeFiles={noticeFiles}
              onRowChange={handleRowChange}
              onRowAdd={handleRowAdd}
              onRowRemove={handleRowRemove}
              onInvoiceAdd={(files) => addFiles(setInvoiceFiles, "invoice", true, files)}
              onInvoiceRemove={(id) => setInvoiceFiles((prev) => prev.filter((f) => f.id !== id))}
              onNoticeAdd={(files) => addFiles(setNoticeFiles, "notice", false, files)}
              onNoticeRemove={(id) => setNoticeFiles((prev) => prev.filter((f) => f.id !== id))}
              onCSVUpload={handleCSVUpload}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}

          {phase === "processing" && (
            <ProcessingPhase
              key="processing"
              events={agentEvents}
              rows={rows}
              invoiceFiles={invoiceFiles}
              noticeFiles={noticeFiles}
            />
          )}

          {phase === "rejected" && (
            <RejectedPhase key="rejected" onNewCase={handleNewCase} />
          )}

          {phase === "report" && report && (
            <ReportPhase
              key="report"
              report={report}
              chatMessages={chatMessages}
              onChatSend={handleChatSend}
              isChatLoading={isChatLoading}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
