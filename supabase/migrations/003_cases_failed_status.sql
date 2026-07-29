-- Add 'failed' to cases.status so a crashed graph run can be surfaced to the UI
-- Run in: Supabase SQL editor

alter table cases drop constraint cases_status_check;

alter table cases add constraint cases_status_check
  check (status in ('created', 'processing', 'completed', 'rejected', 'failed'));
