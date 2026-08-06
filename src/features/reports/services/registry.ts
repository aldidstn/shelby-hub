import type { Report } from '../types/report'
import { aptosForNetwork, normalizeAddress, registryAddress, registryConfigured } from '@/lib/aptos/client'

const LEGACY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? ''

function functionId(name: string, network: NonNullable<Report['network']>) {
  const address = registryAddress(network)
  return `${address}::registry_v2::${name}` as `${string}::${string}::${string}`
}

export { registryConfigured as isRegistryV2Configured }

export function registerReportPayload(input: {
  id: string; blobName: string; network: NonNullable<Report['network']>; title: string; description: string;
  reportType: Report['type']; access: Report['access']; priceOctas: number; fileType: Report['fileType'];
  tags: string[]; cipherHash?: string; encryptionVersion?: number
}) {
  const address = registryAddress(input.network)
  return { function: functionId('register_report', input.network), typeArguments: [], functionArguments: [
    address, input.id, input.blobName, input.network, input.title, input.description, input.reportType,
    input.access, input.priceOctas, input.fileType, input.tags, input.cipherHash ?? '', input.encryptionVersion ?? 0,
  ] }
}

export async function verifyReportRegistration(input: {
  transactionHash: string
  reportId: string
  ownerAddress: string
  blobName: string
  access: Report['access']
  priceOctas: number
  cipherHash?: string
  encryptionVersion: number
  network: NonNullable<Report['network']>
}) {
  const address = registryAddress(input.network)
  const transaction = await aptosForNetwork(input.network).waitForTransaction({ transactionHash: input.transactionHash })
  if (!('success' in transaction) || !transaction.success || !('events' in transaction)) {
    throw new Error('Report registration transaction failed')
  }
  const eventType = `${address}::registry_v2::ReportRegistered`
  const event = transaction.events.find((item) => item.type === eventType)
  if (!event) throw new Error('Report registration event was not emitted')
  const data = event.data as {
    report_id?: string
    owner?: string
    blob_name?: string
    access?: string
    price?: string | number
    cipher_hash?: string
    encryption_version?: string | number
  }
  const matches =
    data.report_id === input.reportId
    && normalizeAddress(data.owner ?? '0x0') === normalizeAddress(input.ownerAddress)
    && data.blob_name === input.blobName
    && data.access === input.access
    && Number(data.price ?? 0) === input.priceOctas
    && (data.cipher_hash ?? '') === (input.cipherHash ?? '')
    && Number(data.encryption_version ?? 0) === input.encryptionVersion

  if (!matches) throw new Error('Report registration event does not match this upload')
}

export function updateReportPayload(report: Report, title: string, description: string) {
  const network = report.network ?? 'testnet'
  const address = registryAddress(network)
  return { function: functionId('update_report', network), typeArguments: [], functionArguments: [
    address, report.id, title, description, report.type, report.access, Math.round((report.price ?? 0) * 1e8), report.tags,
  ] }
}

export function deactivateReportPayload(report: Pick<Report, 'id' | 'network'>) {
  const network = report.network ?? 'testnet'
  const address = registryAddress(network)
  return { function: functionId('deactivate_report', network), typeArguments: [], functionArguments: [address, report.id] }
}

export function registerLegacyReportPayload(input: {
  blobAccount: string; blobName: string; network: NonNullable<Report['network']>; title: string; description: string;
  reportType: Report['type']; priceOctas: number; fileType: Report['fileType']; tags: string[]; author: string;
}) {
  if (!LEGACY_ADDRESS || input.network !== 'testnet') return null
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
