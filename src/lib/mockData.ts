import type { ReadinessReport, AgentEvent } from "@/types"

export const MOCK_AGENT_EVENTS: AgentEvent[] = [
  {
    id: "e1", case_id: "demo", step: "parse_document",
    status: "completed", started_at: new Date(Date.now() - 5000).toISOString(),
    completed_at: new Date(Date.now() - 4200).toISOString(),
    metadata: { invoiceCount: 12 },
  },
  {
    id: "e2", case_id: "demo", step: "validate_case",
    status: "completed", started_at: new Date(Date.now() - 4100).toISOString(),
    completed_at: new Date(Date.now() - 3600).toISOString(),
    metadata: { incomeType: "IT Export Services — validated" },
  },
  {
    id: "e3", case_id: "demo", step: "rule_lookup",
    status: "completed", started_at: new Date(Date.now() - 3500).toISOString(),
    completed_at: new Date(Date.now() - 2800).toISOString(),
    metadata: { ruleCount: 4 },
  },
  {
    id: "e4", case_id: "demo", step: "check_evidence",
    status: "completed", started_at: new Date(Date.now() - 2700).toISOString(),
    completed_at: new Date(Date.now() - 1900).toISOString(),
    metadata: {},
  },
  {
    id: "e5", case_id: "demo", step: "notice_analyzer",
    status: "completed", started_at: new Date(Date.now() - 1800).toISOString(),
    completed_at: new Date(Date.now() - 1100).toISOString(),
    metadata: { noticeType: "Audit Notice detected" },
  },
  {
    id: "e6", case_id: "demo", step: "readiness_evaluator",
    status: "completed", started_at: new Date(Date.now() - 1000).toISOString(),
    completed_at: new Date(Date.now() - 200).toISOString(),
    metadata: { score: 68 },
  },
]

export const MOCK_REPORT: ReadinessReport = {
  score: 68,
  breakdown: {
    invoicesPresent:      25,
    requiredDocsPresent:  18,
    caseValidated:        10,
    noOpenNoticeIssues:    0,
    noMissingEvidence:    15,
  },
  missingItems: [
    {
      document: "Pakistan Remittance Certificate (PRC)",
      reason:   "Proves foreign remittance received through official banking channel",
      reference: "SRO 586(I)/1991",
    },
    {
      document: "Freelance Platform Export Certificate",
      reason:   "Documents that services were delivered as IT exports on the platform",
      reference: "FBR Circular 2021",
    },
    {
      document: "PSEB Registration Certificate",
      reason:   "Pakistan Software Export Board registration required for IT exporters",
      reference: "PSEB Act",
    },
  ],
  issues: [
    {
      type:           "Audit Notice",
      deadline:       "2024-08-15",
      severity:       "medium",
      daysRemaining:  18,
    },
  ],
  recommendations: [
    "Obtain your Pakistan Remittance Certificate (PRC) from your bank for all foreign remittances received in FY 2023–24.",
    "Download your Freelance Platform Export Certificate from your Upwork or Fiverr account settings.",
    "Register with PSEB at pseb.org.pk — registration is free and typically takes 5–7 business days.",
    "Respond to the Audit Notice within the 30-day window. Prepare your income evidence and bank statements.",
    "Consult a registered tax practitioner before submitting your filing — this report assesses readiness only.",
  ],
  generatedAt: new Date().toISOString(),
}
