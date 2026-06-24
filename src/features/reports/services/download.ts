import { getBlobReadUrl } from './shelby-download'
import type { Report } from '../types/report'
import { decryptReportBlob, sha256Base64, toArrayBuffer } from './encryption'
import { decryptReportWithAce } from '@/lib/ace/reports'
import type { PublicKey, Signature } from '@aptos-labs/ts-sdk'

const MIME_TYPES: Partial<Record<Report['fileType'], string>> = {
  pdf: 'application/pdf', md: 'text/markdown', txt: 'text/plain', csv: 'text/csv', json: 'application/json',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
}

export type AceWalletSigner = {
  accountAddress: string
  publicKey: PublicKey
  signMessage: (message: { address?: boolean; application?: boolean; chainId?: boolean; message: string; nonce: string }) => Promise<{
    fullMessage: string
    signature: Signature
  }>
}

export async function fetchReportBlob(report: Report, aceSigner?: AceWalletSigner) {
  if (!report.blobAccount || !report.blobName) throw new Error('Report blob is unavailable')
  const response = await fetch(getBlobReadUrl(report.blobAccount, report.blobName, report.network ?? 'testnet'))
  if (!response.ok) throw new Error(`Shelby returned HTTP ${response.status}`)
  const blob = await response.blob()
  if (!report.encryptionVersion) return blob
  if (!report.cipherHash) throw new Error('Encrypted report is missing its integrity hash')
  const actualHash = await sha256Base64(await blob.arrayBuffer())
  if (actualHash !== report.cipherHash) throw new Error('Encrypted report failed its integrity check')

  if (report.encryptionVersion === 'ace-ibe-v1') {
    if (!aceSigner) throw new Error('Connect the wallet that owns or purchased this report to unlock it.')
    const plaintext = await decryptReportWithAce({
      reportId: report.id,
      ciphertext: new Uint8Array(await blob.arrayBuffer()),
      ...aceSigner,
    })
    return new Blob([toArrayBuffer(plaintext)], { type: MIME_TYPES[report.fileType] ?? 'application/octet-stream' })
  }

  const keyResponse = await fetch(`/api/reports/${encodeURIComponent(report.id)}/key`, { cache: 'no-store' })
  const key = await keyResponse.json() as { dataKey?: string; iv?: string; error?: string }
  if (!keyResponse.ok || !key.dataKey || !key.iv) throw new Error(key.error ?? 'Unable to unlock this report')
  const plaintext = await decryptReportBlob(blob, key.dataKey, key.iv)
  return new Blob([plaintext], { type: MIME_TYPES[report.fileType] ?? 'application/octet-stream' })
}

export async function downloadReport(report: Report, aceSigner?: AceWalletSigner) {
  const blob = await fetchReportBlob(report, aceSigner)
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `${report.title.toLowerCase().replace(/\s+/g, '-')}.${report.fileType}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
