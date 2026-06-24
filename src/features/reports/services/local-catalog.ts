import type { Report } from '@/features/reports/types/report'

const STORAGE_KEY = 'scribehub:report-catalog:v1'

type StoredReport = Report & {
  purchasedBy?: string[]
}

function walletKey(address?: string | null) {
  return address?.toLowerCase() ?? null
}

function readStoredReports(): StoredReport[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as StoredReport[]
    return Array.isArray(parsed) ? parsed.filter((report) => report?.id) : []
  } catch {
    return []
  }
}

function writeStoredReports(reports: StoredReport[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports))
}

function applyWalletFlags(report: StoredReport, walletAddress?: string | null): Report {
  const wallet = walletKey(walletAddress)
  const owned = Boolean(wallet && report.authorAddress.toLowerCase() === wallet)
  const purchased = Boolean(wallet && report.purchasedBy?.some((buyer) => buyer.toLowerCase() === wallet))
  const cleanReport = { ...report }
  delete cleanReport.purchasedBy
  return { ...cleanReport, owned, purchased }
}

export function listLocalReports(walletAddress?: string | null): Report[] {
  return readStoredReports()
    .filter((report) => report.active !== false)
    .map((report) => applyWalletFlags(report, walletAddress))
}

export function upsertLocalReport(report: Report, walletAddress?: string | null) {
  const wallet = walletKey(walletAddress)
  const reports = readStoredReports()
  const index = reports.findIndex((item) => item.id === report.id)
  const existing = index >= 0 ? reports[index] : undefined
  const purchasedBy = new Set(existing?.purchasedBy ?? [])
  if (wallet && report.purchased) purchasedBy.add(wallet)

  const next: StoredReport = {
    ...existing,
    ...report,
    purchasedBy: Array.from(purchasedBy),
  }

  if (index >= 0) reports[index] = next
  else reports.unshift(next)
  writeStoredReports(reports)
}

export function markLocalReportPurchased(report: Report, walletAddress: string) {
  const wallet = walletKey(walletAddress)
  if (!wallet) return
  const reports = readStoredReports()
  const index = reports.findIndex((item) => item.id === report.id)
  const existing: StoredReport = index >= 0 ? reports[index] : report
  const purchasedBy = new Set(existing.purchasedBy ?? [])
  purchasedBy.add(wallet)
  const next: StoredReport = { ...existing, ...report, purchased: true, purchasedBy: Array.from(purchasedBy) }
  if (index >= 0) reports[index] = next
  else reports.unshift(next)
  writeStoredReports(reports)
}

export function removeLocalReport(reportId: string) {
  writeStoredReports(readStoredReports().filter((report) => report.id !== reportId))
}

export function mergeReportsWithLocal(apiReports: Report[], localReports: Report[]) {
  const merged = new Map<string, Report>()
  for (const report of apiReports) merged.set(report.id, report)
  for (const report of localReports) {
    const existing = merged.get(report.id)
    merged.set(report.id, existing ? { ...existing, ...report } : report)
  }
  return Array.from(merged.values())
}
