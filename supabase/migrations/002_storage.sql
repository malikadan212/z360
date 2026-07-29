-- Storage bucket for case files (invoices, notices)
-- Private — no public URL access. Reads only happen server-side via service role.
-- Uploads from the browser use a signed upload URL issued by /api/cases.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-files',
  'case-files',
  false,
  10485760,  -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/csv']
)
on conflict (id) do nothing;

-- No storage RLS policies needed:
--   server-side reads → service role key bypasses RLS
--   browser uploads   → signed upload URL issued by /api/cases (token-scoped, no RLS needed)
