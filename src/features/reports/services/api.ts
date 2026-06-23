import type { Report } from '../types/report'

async function json<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`)
  return body
}

export async function prepareReport(input: {
  title: string; description: string; reportType: Report['type']; access: Report['access'];
  priceOctas: number; fileType: Report['fileType']; tags: string[]; network: NonNullable<Report['network']>
}) {
  return json<{ id: string; dataKey?: string; encryptionVersion?: string }>(await fetch('/api/reports', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }))
}

export async function finalizeReport(id: string, input: { blobName: string; transactionHash: string; cipherHash?: string; encryptionIv?: string }) {
  let error: unknown
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const result = await json<{ data: Report }>(await fetch(`/api/reports/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
      }))
      return result.data
    } catch (caught) {
      error = caught
      await new Promise((resolve) => setTimeout(resolve, 1250))
    }
  }
  throw error
}

export async function fetchReports(mine = false) {
  const result = await json<{ data: Report[] }>(await fetch(`/api/reports${mine ? '?mine=1' : ''}`, { cache: 'no-store' }))
  return result.data
}
