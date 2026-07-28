# Freelancer Tax Readiness Copilot — Build Spec

## One-line goal
Help Pakistani software/IT freelancers (foreign-service export income) determine whether they're ready to file taxes with FBR — by parsing their invoices, checking required documents against rules, decoding any FBR notice they've received, and producing a Readiness Report with a score, missing items, deadlines, and next actions.

This is **NOT** a tax calculator. It does not estimate tax liability or interpret the Finance Act. It only assesses **readiness** — what's present, what's missing, what's urgent.

---

## User Persona
A single persona: a Pakistani freelancer/small IT exporter earning foreign income (Upwork, Fiverr, direct clients), who needs to know if their paperwork is in order before filing, and — if they've received an FBR notice — what it means and how urgent it is.

---

## Stack
- **Frontend**: Next.js (App Router) + Tailwind + shadcn/ui, deployed on Vercel
- **Backend/persistence**: Supabase (Postgres + Storage for uploaded files)
- **Agent**: deepagents (JS/TS package, built on LangGraph), running server-side inside Next.js API route handlers — no separate Python service
- **Model**: Claude (Anthropic API) via @langchain/anthropic

---

## Inputs (strictly limited)
1. Income data — CSV upload or manual entry (invoice number, client, amount, currency, date)
2. Invoice PDFs — uploaded as files
3. FBR notice — optional, PDF or image upload

**Out of scope**: bank statement parsing, Wise/Payoneer API integration, email integration, OAuth to any external account.

---

## Agent Workflow (LangGraph graph)

```
User uploads files
        │
        ▼
Parse Documents
  (extract invoice #, amount, client, date — CSV/manual entry
   primary, PDF invoices best-effort via Claude vision)
        │
        ▼
Validate Supported Case
  [plain deterministic code — checks against supported_income_types table]
        │
   ┌────┴────┐
  Yes        No
   │          │
   ▼          ▼
Lookup     Gracefully explain:
Rules      "This MVP currently supports
   │        IT export services only" — stop
   ▼
Check Required Evidence
  (compare what's uploaded vs what's required)
        │
        ▼
   ┌────────────────┐
   │ Notice uploaded?│
   └───┬─────────┬───┘
      Yes        No
       │          │
       ▼          │
  Decode Notice   │
       │          │
       ▼          │
  Extract Deadline│
       │          │
       └─────┬────┘
             ▼
  Generate Readiness Report
```

**Two real conditional edges:**
1. Supported-case validation → continue vs. graceful rejection
2. Notice-present branching → decode notice or skip

The validation branch is a concrete demo beat: correctly refuse out-of-scope uploads (e.g. restaurant invoices).

---

## Tools (exactly four)

> Note: `validate_supported_case` is deliberately NOT a tool. It's plain deterministic code (a lookup against `supported_income_types`) that runs as a graph node before any tool calls happen.

### 1. `parse_document`
- **Input**: CSV or manual entry (primary, reliable path). PDF/image invoices supported as best-effort via Claude native vision.
- **Output**: structured fields — invoice number, amount, currency, client, date.
- UI should explicitly note PDF extraction is best-effort.

### 2. `rule_lookup`
- **Input**: income type.
- **Output**: required documents (each with a reason and rule reference), notes — pulled from seeded `tax_rules` Supabase table, never invented by the LLM.

### 3. `notice_analyzer`
- Only called if a notice was uploaded.
- **Input**: parsed notice text.
- **Output**: notice type, deadline, required documents, severity — matched against seeded `notice_types` table covering ~3 real FBR notice types (show-cause, audit notice, tax demand notice).

### 4. `readiness_evaluator`
- **Input**: parsed documents + rule lookup results + (optional) notice analysis.
- **Output**: deterministic Filing Readiness Score (calculated in plain code, NOT freeform LLM), list of missing items (each with reason + reference), issues/urgencies, recommended next actions.

---

## Filing Readiness Score — Fixed Point Rubric

| Criterion | Points |
|---|---|
| Invoices present | 25 pts |
| Required docs present | 40 pts |
| Case validated as in-scope | 10 pts |
| No open notice issues | 10 pts |
| No missing evidence | 15 pts |
| **Total** | **100 pts** |

This breakdown must be shown in the UI alongside the score — reviewers should see it's a real rubric, not "AI magic."

---

## LLM vs. Deterministic Code — The Key Sentence

> "The LLM is only used where language understanding is required — extracting fields from documents and generating the natural-language explanation. Validation, scoring, branching, and rule evaluation are deterministic code."

```
Claude  →  extract invoice/notice fields (language understanding)
   ↓
Business logic  →  validate_supported_case, rule_lookup, readiness scoring
   ↓
Claude  →  natural-language explanation of the report (language understanding)
```

---

## Data Model (Supabase)

### `supported_income_types`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| label | text | e.g. "IT Export Services" |
| examples | jsonb | e.g. ["Software development", "IT consulting", "SaaS"] |
| active | boolean | |

### `cases`
| Column | Type |
|---|---|
| id | uuid PK |
| user_id | uuid |
| status | text |
| created_at | timestamptz |

### `income_entries`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK |
| case_id | uuid FK |
| source | text | |
| invoice_number | text | |
| client | text | |
| amount | numeric | |
| currency | text | |
| date | date | |
| raw_file_url | text | |
| extraction_confidence | text | e.g. "high" / "low" — flag user-confirmed vs auto-extracted |

### `tax_rules`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK |
| income_type | text | |
| required_document | text | |
| reason | text | Why this doc is required |
| reference | text | Rule/law reference |

One row per required document — enables "missing item" explanations.

### `notice_types`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK |
| type_name | text | e.g. "Audit Notice" |
| deadline_days | integer | |
| required_documents | jsonb | |
| severity | text | |
| reference | text | |

### `readiness_reports`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK |
| case_id | uuid FK |
| score | integer | |
| missing_items | jsonb | Each with reason + reference |
| issues | jsonb | |
| recommendations | jsonb | |
| created_at | timestamptz | |

### `agent_events`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK |
| case_id | uuid FK |
| step | text | e.g. "parse_document", "rule_lookup" |
| status | text | pending / running / completed / failed |
| started_at | timestamptz | |
| completed_at | timestamptz | |
| metadata | jsonb | Step-specific detail (e.g. "Parsed 12 invoices") |

Replaces generic "plan_json" — persists actual step lifecycle, maps to Processing screen UI.

---

## UI Flow: Upload → Processing → Report → Ask

**Task-first, not chat-first.** Chat affordance appears only after the report.

### Screen 1: Case Creation + Upload
- Income CSV upload or manual entry form
- Invoice PDF uploads (best-effort, clearly labeled)
- Optional FBR notice upload (PDF or image)

### Screen 2: Processing (Demo Centerpiece)
Each `agent_events` row becomes a checklist line. Show specific detail, not generic status:
```
✓ Parsed 12 invoices
✓ Identified Export Service Income
✓ Loaded 4 required document rules
✓ Compared uploaded evidence
✓ Detected Audit Notice
✓ Calculated Filing Readiness
```
This screen is the architecture explanation in visual form — a reviewer should understand the whole workflow by watching it run.

### Screen 3: Filing Readiness Report
- Score with full point breakdown rubric
- Missing items — each with reason and rule reference (e.g. "PRC — required for export service income — Rule XYZ")
- Issues with deadlines
- Recommendations

### Screen 4: Ask Questions
- Post-report chat affordance
- User can ask: "why is my score 78%?" / "what does this notice deadline mean?"
- Keeps conversational UX without making the whole product chat-first

---

## Failure / Confidence Handling

- If invoice field extraction confidence is low, **pause and ask user to confirm** rather than silently guess:
  > "I couldn't confidently extract the invoice amount. Please confirm: Amount: ___"
- Store as `extraction_confidence` on `income_entries`
- Same principle for notice type classification — if not confident about notice type, say so rather than guessing a deadline

---

## Guardrails (build in and be ready to explain)

1. All rules (document requirements, notice types, deadlines) come from **seeded Supabase tables** — never from LLM's own knowledge
2. The Filing Readiness Score is a **deterministic calculation in code**, not LLM-generated text
3. **No tax liability estimation** anywhere in the product
4. Clear UI disclaimer: "This is an advisory readiness tool, not a substitute for a tax consultant or official FBR guidance"

---

## Scope Statement
> "This MVP supports software/IT freelancers with foreign-service export income and three common FBR notice types. It assesses document readiness, not tax liability."

---

## Seed Data Plan

### `supported_income_types` seed
```json
{
  "label": "IT Export Services",
  "examples": ["Software development", "IT consulting", "SaaS", "Web development", "Mobile app development", "UI/UX design", "QA/testing services"],
  "active": true
}
```

### `tax_rules` seed (IT Export Services)
| required_document | reason | reference |
|---|---|---|
| Pakistan Remittance Certificate (PRC) | Proves foreign remittance received through banking channel | SRO 586(I)/1991 |
| Freelance Platform Export Certificate | Documents export services on platform | FBR Circular 2021 |
| PSEB Registration Certificate | Pakistan Software Export Board registration for IT exporters | PSEB Act |
| NTN Registration Certificate | Mandatory for filing — NTN required | ITO 2001 S.114 |

### `notice_types` seed
| type_name | deadline_days | severity |
|---|---|---|
| Show-Cause Notice | 15 | high |
| Audit Notice | 30 | medium |
| Tax Demand Notice | 30 | high |
