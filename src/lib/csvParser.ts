import type { IncomeRow } from "@/types"

export const VALID_CURRENCIES = ["USD", "GBP", "EUR", "AUD", "CAD"]

const nanoid = () => Math.random().toString(36).slice(2, 9)

/**
 * Parse a CSV file into IncomeRow objects.
 * Accepts headers (case-insensitive, flexible):
 *   invoice_number | invoice | inv
 *   client | client_name
 *   amount
 *   currency | cur
 *   date
 */
export async function parseCSV(file: File): Promise<IncomeRow[]> {
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].toLowerCase().split(",").map((h) => h.trim())

  const idx = (candidates: string[]) =>
    candidates.reduce<number>((found, c) => (found !== -1 ? found : headers.indexOf(c)), -1)

  const invoiceIdx  = idx(["invoice_number", "invoice", "inv", "invoice #", "invoice_no"])
  const clientIdx   = idx(["client", "client_name", "customer"])
  const amountIdx   = idx(["amount", "value", "total"])
  const currencyIdx = idx(["currency", "cur", "ccy"])
  const dateIdx     = idx(["date", "invoice_date", "issue_date"])

  const rows: IncomeRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""))
    if (cols.every((c) => !c)) continue

    rows.push({
      id:            nanoid(),
      invoiceNumber: invoiceIdx  !== -1 ? cols[invoiceIdx]  ?? "" : "",
      client:        clientIdx   !== -1 ? cols[clientIdx]   ?? "" : "",
      amount:        amountIdx   !== -1 ? cols[amountIdx]   ?? "" : "",
      currency:      currencyIdx !== -1 ? cols[currencyIdx] ?? "USD" : "USD",
      date:          dateIdx     !== -1 ? cols[dateIdx]     ?? "" : "",
    })
  }

  return rows
}
