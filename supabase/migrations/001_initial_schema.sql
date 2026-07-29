-- TaxReady.pk — Filing Readiness Copilot
-- Schema v1 — no-auth build (demo / MVP)
-- Run in: Supabase SQL editor → paste and run

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN KNOWLEDGE TABLES  (seeded, never written by LLM)
-- ─────────────────────────────────────────────────────────────────────────────

create table supported_income_types (
  id         uuid        primary key default gen_random_uuid(),
  label      text        not null,                   -- "IT Export Services"
  examples   jsonb       not null default '[]',      -- ["Software development", ...]
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

create table tax_rules (
  id                uuid        primary key default gen_random_uuid(),
  income_type       text        not null,            -- matches supported_income_types.label
  required_document text        not null,
  reason            text        not null,
  reference         text,                            -- FBR rule / ordinance reference
  created_at        timestamptz not null default now()
);

create table notice_types (
  id                  uuid        primary key default gen_random_uuid(),
  type_name           text        not null,          -- "Show-Cause Notice"
  deadline_days       int         not null,
  required_documents  jsonb       not null default '[]',
  severity            text        not null check (severity in ('low', 'medium', 'high')),
  reference           text,
  created_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CASE DATA
-- ─────────────────────────────────────────────────────────────────────────────

create table cases (
  id         uuid        primary key default gen_random_uuid(),
  status     text        not null default 'created'
             check (status in ('created', 'processing', 'completed', 'rejected')),
  created_at timestamptz not null default now()
);

create table income_entries (
  id                     uuid        primary key default gen_random_uuid(),
  case_id                uuid        not null references cases(id) on delete cascade,
  source                 text        not null check (source in ('csv', 'manual', 'pdf')),
  invoice_number         text,
  client                 text,
  amount                 numeric,
  currency               text        check (currency in ('USD', 'GBP', 'EUR', 'AUD', 'CAD')),
  -- Foreign-source currencies only. PKR is non-qualifying export income and is rejected at input.
  date                   date,
  raw_file_url           text,       -- Storage path if extracted from a PDF
  extraction_confidence  text        check (extraction_confidence in ('high', 'low', 'unconfirmed')),
  created_at             timestamptz not null default now()
);

create table uploaded_files (
  id           uuid        primary key default gen_random_uuid(),
  case_id      uuid        not null references cases(id) on delete cascade,
  kind         text        not null check (kind in ('invoice_pdf', 'notice')),
  original_name text       not null,
  storage_path text        not null,   -- path in Supabase Storage bucket
  created_at   timestamptz not null default now()
);

create table readiness_reports (
  id              uuid        primary key default gen_random_uuid(),
  case_id         uuid        not null references cases(id) on delete cascade,
  score           int         not null,
  -- Object shape must match ScoreBreakdown TypeScript interface:
  -- { invoicesPresent, requiredDocsPresent, caseValidated, noOpenNoticeIssues, noMissingEvidence }
  score_breakdown jsonb       not null default '{}',
  -- Array of { document, reason, reference }
  missing_items   jsonb       not null default '[]',
  -- Array of { type, deadline, severity, daysRemaining }
  issues          jsonb       not null default '[]',
  -- Array of strings
  recommendations jsonb       not null default '[]',
  created_at      timestamptz not null default now()
);

create table agent_events (
  id           uuid        primary key default gen_random_uuid(),
  case_id      uuid        not null references cases(id) on delete cascade,
  step         text        not null,   -- "parse_document" | "validate_case" | "rule_lookup" | "check_evidence" | "notice_analyzer" | "readiness_evaluator"
  label        text        not null,   -- human-readable detail, e.g. "Parsed 12 invoices"
  status       text        not null default 'pending'
               check (status in ('pending', 'running', 'completed', 'failed')),
  started_at   timestamptz,
  completed_at timestamptz,
  metadata     jsonb       not null default '{}',
  created_at   timestamptz not null default now()
);

create table chat_messages (
  id         uuid        primary key default gen_random_uuid(),
  case_id    uuid        not null references cases(id) on delete cascade,
  role       text        not null check (role in ('user', 'assistant')),
  content    text        not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

create index idx_income_entries_case_id    on income_entries(case_id);
create index idx_uploaded_files_case_id    on uploaded_files(case_id);
create index idx_readiness_reports_case_id on readiness_reports(case_id);
create index idx_agent_events_case_id      on agent_events(case_id);
create index idx_agent_events_step_status  on agent_events(case_id, step, status);
create index idx_chat_messages_case_id     on chat_messages(case_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — open policies for demo build (no user auth)
-- Agent/server writes use the service role key which bypasses RLS entirely.
-- Anon key is used for Realtime subscriptions from the browser.
-- ─────────────────────────────────────────────────────────────────────────────

alter table cases                 enable row level security;
alter table income_entries        enable row level security;
alter table uploaded_files        enable row level security;
alter table readiness_reports     enable row level security;
alter table agent_events          enable row level security;
alter table chat_messages         enable row level security;
alter table supported_income_types enable row level security;
alter table tax_rules             enable row level security;
alter table notice_types          enable row level security;

-- Case tables: open read+write via anon key (demo build)
create policy "anon read/write cases"             on cases              for all using (true) with check (true);
create policy "anon read/write income_entries"    on income_entries     for all using (true) with check (true);
create policy "anon read/write uploaded_files"    on uploaded_files     for all using (true) with check (true);
create policy "anon read/write readiness_reports" on readiness_reports  for all using (true) with check (true);
create policy "anon read/write agent_events"      on agent_events       for all using (true) with check (true);
create policy "anon read/write chat_messages"     on chat_messages      for all using (true) with check (true);

-- Reference tables: read-only via anon key
create policy "anon read supported_income_types"  on supported_income_types for select using (true);
create policy "anon read tax_rules"               on tax_rules              for select using (true);
create policy "anon read notice_types"            on notice_types           for select using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME — enable for the tables the browser subscribes to
-- ─────────────────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table agent_events;
alter publication supabase_realtime add table cases;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

insert into supported_income_types (label, examples) values (
  'IT Export Services',
  '["Software development", "IT consulting", "SaaS", "Web development", "Mobile app development", "UI/UX design", "QA and testing services"]'
);

-- tax_rules — must match the 4 documents in mock data and the readiness_evaluator logic
insert into tax_rules (income_type, required_document, reason, reference) values
  (
    'IT Export Services',
    'Proceeds Realization Certificate (PRC)',
    'Required to prove that foreign exchange was received through official banking channels for export income. Issued by the freelancer''s bank upon conversion of foreign currency to PKR.',
    'SBP Foreign Exchange Regulations'
  ),
  (
    'IT Export Services',
    'Freelance Platform Export Certificate',
    'Documents that the services were delivered as IT exports on the freelance platform (Upwork/Fiverr/etc.).',
    'FBR Circular on IT Export Income'
  ),
  (
    'IT Export Services',
    'PSEB Registration Certificate',
    'Pakistan Software Export Board registration is required for IT service exporters to qualify for the preferential 0.25% tax rate under Section 65F.',
    'PSEB Act / Income Tax Ordinance 2001, Section 65F'
  ),
  (
    'IT Export Services',
    'NTN Registration Certificate',
    'Active NTN (National Tax Number) is mandatory for filing a tax return with FBR.',
    'Income Tax Ordinance 2001, S.114'
  );

-- notice_types — deadline_days and severity match the spec
insert into notice_types (type_name, deadline_days, required_documents, severity, reference) values
  (
    'Show-Cause Notice',
    15,
    '["Response letter addressing the specific allegations", "Supporting invoices", "Bank statements showing foreign remittance"]',
    'high',
    'Income Tax Ordinance 2001, Section 122'
  ),
  (
    'Audit Notice',
    30,
    '["Books of accounts", "Bank statements for the tax year", "All client invoices", "Foreign remittance certificates"]',
    'medium',
    'Income Tax Ordinance 2001, Section 177'
  ),
  (
    'Tax Demand Notice',
    30,
    '["Payment challan (if paying)", "Reconciliation statement", "Grounds of appeal (if contesting)"]',
    'high',
    'Income Tax Ordinance 2001, Section 137'
  );
