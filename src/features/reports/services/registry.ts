import type { Report } from '../types/report'

const ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_V2_ADDRESS ?? ''
const LEGACY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? ''

function functionId(name: string) {
  if (!ADDRESS) throw new Error('Registry V2 is not configured')
  return `${ADDRESS}::registry_v2::${name}` as `${string}::${string}::${string}`
}

export function registerReportPayload(input: {
  id: string; blobName: string; network: NonNullable<Report['network']>; title: string; description: string;
  reportType: Report['type']; access: Report['access']; priceOctas: number; fileType: Report['fileType'];
  tags: string[]; cipherHash?: string; encryptionVersion?: number
}) {
  return { function: functionId('register_report'), typeArguments: [], functionArguments: [
    ADDRESS, input.id, input.blobName, input.network, input.title, input.description, input.reportType,
    input.access, input.priceOctas, input.fileType, input.tags, input.cipherHash ?? '', input.encryptionVersion ?? 0,
  ] }
}

export function updateReportPayload(report: Report, title: string, description: string) {
  return { function: functionId('update_report'), typeArguments: [], functionArguments: [
    ADDRESS, report.id, title, description, report.type, report.access, Math.round((report.price ?? 0) * 1e8), report.tags,
  ] }
}

export function deactivateReportPayload(reportId: string) {
  return { function: functionId('deactivate_report'), typeArguments: [], functionArguments: [ADDRESS, reportId] }
}

export function registerLegacyReportPayload(input: {
  blobAccount: string; blobName: string; network: NonNullable<Report['network']>; title: string; description: string;
  reportType: Report['type']; priceOctas: number; fileType: Report['fileType']; tags: string[]; author: string;
}) {
  if (!LEGACY_ADDRESS) return null
  return {
    function: `${LEGACY_ADDRESS}::registry::register_report` as `${string}::${string}::${string}`,
    typeArguments: [],
    functionArguments: [
      LEGACY_ADDRESS,
      input.blobAccount,
      input.blobName,
      input.network,
      input.title,
      input.description,
      input.reportType,
      'free',
      input.priceOctas,
      input.fileType,
      input.tags,
      input.author,
    ],
  }
}
