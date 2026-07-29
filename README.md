# TaxReady.pk — FBR Filing Readiness Checker

A Next.js web app for Pakistani IT export freelancers. Upload invoices (manual, CSV, or PDF), and the agent checks your filing readiness against FBR rules — scoring document completeness, flagging missing items, and parsing FBR notices.

## What It Does

1. **Enter income** — manual rows or CSV import (invoice number, client, amount, currency, date)
2. **Upload supporting files** — invoice PDFs (vision extraction) and FBR notices (type + deadline detection)
3. **Get a readiness report** — score out of 100, missing documents with FBR rule references, notice deadlines, and prioritized next steps

## Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Agent**: LangGraph `StateGraph` with 6 nodes (parse → validate → rule lookup → check evidence → notice analyzer → readiness evaluator)
- **LLM**: Google Gemini 2.5 Flash via `@google/generative-ai` (raw SDK) — vision extraction for PDFs/notices, no LangChain wrappers
- **Database**: Supabase (Postgres + Storage for file uploads)
- **Auth**: Supabase anon key (client-side), service role key (server-side only)

## Env Vars

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Purpose |
|---|---|
| `GOOGLE_API_KEY` | Gemini API key for LLM calls |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-side only) |
| `LANGSMITH_API_KEY` | Optional — LangSmith tracing |

## Setup

```bash
npm install
cp .env.local.example .env.local  # fill in your keys
npm run dev
```

Open `http://localhost:3000`.

## Architecture (3 sentences)

The app uses a LangGraph `StateGraph` to orchestrate a 6-step agent pipeline — PDF extraction, income validation, rule lookup, evidence checking, notice analysis, and readiness scoring. Two Gemini calls handle vision extraction (invoice PDFs and FBR notices); everything else is deterministic DB reads and scoring logic. The chat endpoint provides a multi-turn Q&A layer scoped to a single case's report.

## Known Limitations

- **MVP scope**: Only IT export services income type is supported. Other freelancer categories will be rejected at the validation step.
- **PDF extraction**: Gemini vision is best-effort — messy or handwritten invoices may return null fields with low confidence. Manual entry is more reliable.
- **Free-tier Gemini**: Rate-limited; the app includes exponential-backoff retry (2s, 4s, 8s) for 429 responses, but sustained use may hit limits.
- **No tax calculation**: This is a readiness checker, not a tax calculator or legal advisor. Consult a registered tax practitioner before filing.