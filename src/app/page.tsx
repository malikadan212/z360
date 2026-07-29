"use client"

import * as React from "react"
import { AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/client"

import { Header }          from "@/components/Header"
import { UploadPhase }     from "@/components/UploadPhase"
import { ProcessingPhase } from "@/components/ProcessingPhase"
import { RejectedPhase }   from "@/components/RejectedPhase"
import { FailedPhase }     from "@/components/FailedPhase"
import { ReportPhase }     from "@/components/ReportPhase"
import { OnboardingModal } from "@/components/OnboardingModal"

import { parseCSV } from "@/lib/csvParser"

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

  // ── URL sync ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (caseId) url.searchParams.set("case", caseId)
    else url.searchParams.delete("case")
    window.history.replaceState({}, "", url.toString())
  }, [caseId])

  // ── Realtime subscription ─────────────────────────────────────────────────
  // Ref holds active channels so handleNewCase can tear them down instantly,
  // even if the user resets mid-run before the effect cleanup fires.
  const channelsRef = React.useRef<ReturnType<ReturnType<typeof createClient>["channel"]>[]>([])

  const teardownSubscriptions = React.useCallback(() => {
    const supabase = createClient()
    channelsRef.current.forEach(ch => supabase.removeChannel(ch))
    channelsRef.current = []
  }, [])

  React.useEffect(() => {
    if (!caseId || phase !== "processing") return

    const supabase = createClient()

    const eventsChannel = supabase
      .channel(`agent_events:${caseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_events", filter: `case_id=eq.${caseId}` },
        (payload) => {
          const updated = payload.new as AgentEvent
          setAgentEvents(prev => {
            const exists = prev.some(e => e.id === updated.id)
            if (exists) return prev.map(e => e.id === updated.id ? updated : e)
            return [...prev, updated]
          })
        }
      )
      .subscribe()

    const casesChannel = supabase
      .channel(`cases:${caseId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "cases", filter: `id=eq.${caseId}` },
        async (payload) => {
          const status = (payload.new as { status: string }).status

          if (status === "completed") {
            const { data } = await supabase
              .from("readiness_reports")
              .select("*")
              .eq("case_id", caseId)
              .single()

            if (data) {
              setReport({
                score:           data.score,
                breakdown:       data.score_breakdown,
                missingItems:    data.missing_items,
                issues:          data.issues,
                recommendations: data.recommendations,
                generatedAt:     data.created_at,
              })
              setPhase("report")
            }
          } else if (status === "rejected") {
            setPhase("rejected")
          } else if (status === "failed") {
            setPhase("failed")
          }
        }
      )
      .subscribe()

    channelsRef.current = [eventsChannel, casesChannel]

    // Initial fetch — covers events written before the subscription connected
    supabase
      .from("agent_events")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data && data.length > 0) setAgentEvents(data as AgentEvent[]) })

    return () => {
      teardownSubscriptions()
    }
  }, [caseId, phase, teardownSubscriptions])

  // ── Row handlers ──────────────────────────────────────────────────────────
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

  // ── Submit — real API calls ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // Build FormData — /api/cases expects multipart
      const fd = new FormData()
      fd.append("rows", JSON.stringify(rows.map(r => ({
        invoiceNumber: r.invoiceNumber,
        client:        r.client,
        amount:        r.amount,
        currency:      r.currency,
        date:          r.date,
      }))))

      invoiceFiles.forEach(f => fd.append("invoices", f.file))
      noticeFiles.forEach(f  => fd.append("notice",   f.file))

      // Step 1 — fast sync: create case, upload files, seed events
      const casesRes = await fetch("/api/cases", { method: "POST", body: fd })
      if (!casesRes.ok) {
        const err = await casesRes.json()
        console.error("POST /api/cases failed", err)
        setIsSubmitting(false)
        return
      }

      const { caseId: newCaseId } = await casesRes.json() as { caseId: string }
      setCaseId(newCaseId)
      setPhase("processing")
      setAgentEvents([])
      setIsSubmitting(false)

      // Step 2 — fire graph run without awaiting (browser doesn't wait for graph)
      fetch("/api/agent/run", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ caseId: newCaseId }),
      }).catch(err => console.error("POST /api/agent/run fire error", err))

    } catch (err) {
      console.error("handleSubmit error", err)
      setIsSubmitting(false)
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleNewCase = () => {
    teardownSubscriptions()   // kill any live subscription immediately
    setPhase("upload"); setRows([emptyRow()])
    setInvoiceFiles([]); setNoticeFiles([])
    setAgentEvents([]); setCaseId(null)
    setReport(null); setChatMessages([])
    setIsSubmitting(false)
  }

  // ── Chat — real API call, scoped to existing report ───────────────────────
  const handleChatSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: nanoid(), role: "user", content: text,
      timestamp: new Date().toISOString(),
    }
    setChatMessages(prev => [...prev, userMsg])
    setIsChatLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          caseId,
          message: text,
          history: chatMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const { reply, error } = await res.json() as { reply?: string; error?: string }

      setChatMessages(prev => [...prev, {
        id:        nanoid(),
        role:      "assistant",
        content:   reply ?? error ?? "Sorry, something went wrong.",
        timestamp: new Date().toISOString(),
      }])
    } catch (err) {
      console.error("chat error", err)
      setChatMessages(prev => [...prev, {
        id:        nanoid(),
        role:      "assistant",
        content:   "Sorry, there was an error. Please try again.",
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setIsChatLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
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
          {phase === "failed"   && <FailedPhase   key="failed"   onNewCase={handleNewCase} />}
          {phase === "report"   && report && (
            <ReportPhase key="report" report={report} chatMessages={chatMessages}
              onChatSend={handleChatSend} isChatLoading={isChatLoading} />
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal onDismiss={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
