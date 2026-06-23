import { createHash } from 'node:crypto'
import { aptos, normalizeAddress } from '@/lib/aptos/client'
import type { Report } from '@/features/reports/types/report'

interface LegacyRegistryEntry {
  blob_account: string
  blob_name: string
  network: string
  title: string
  description: string
  report_type: string
  access: string
  price: string
  file_type: string
  tags: string[]
  author: string
  registrant: string
  registered_at: string
}

function legacyRegistryAddress() {
  const address = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS
  return address ? normalizeAddress(address) : null
}

function legacyId(entry: LegacyRegistryEntry) {
  return `${normalizeAddress(entry.registrant)}/${entry.blob_name}`
}

function legacyHashId(entry: LegacyRegistryEntry) {
  return `legacy:${createHash('sha256').update(`${normalizeAddress(entry.registrant)}/${entry.blob_name}`).digest('hex').slice(0, 32)}`
}

function toIsoDate(value: string) {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return new Date().toISOString()
  // Registry V1 stores microseconds; JavaScript Date expects milliseconds.
  return new Date(timestamp / 1000).toISOString()
}

export async function fetchLegacyRegistryEntries(): Promise<LegacyRegistryEntry[]> {
  const address = legacyRegistryAddress()
  if (!address) return []
  const result = await aptos.view({
    payload: {
      function: `${address}::registry::get_entries` as `${string}::${string}::${string}`,
      typeArguments: [],
      functionArguments: [address],
    },
  })
  return (result[0] as LegacyRegistryEntry[] | undefined) ?? []
}

export async function listLegacyReports(input: { query?: string; owner?: string | null } = {}): Promise<Report[]> {
  const entries = await fetchLegacyRegistryEntries()
  const owner = input.owner ? normalizeAddress(input.owner) : null
  const query = input.query?.trim().toLowerCase()

  return entries
    .map((entry): Report => {
      const registrant = normalizeAddress(entry.registrant)
      return {
        id: legacyId(entry),
        title: entry.title,
        description: entry.description,
        type: entry.report_type as Report['type'],
        access: entry.access === 'premium' ? 'premium' : 'free',
        price: Number(entry.price) > 0 ? Number(entry.price) / 1e8 : undefined,
        likes: 0,
        downloads: 0,
        author: entry.author,
        authorAddress: registrant,
        createdAt: toIsoDate(entry.registered_at),
        onChain: true,
        fileType: entry.file_type as Report['fileType'],
        tags: entry.tags ?? [],
        blobAccount: entry.blob_account,
        blobName: entry.blob_name,
        network: entry.network as Report['network'],
        active: true,
      }
    })
    .filter((report) => !owner || normalizeAddress(report.authorAddress) === owner)
    .filter((report) => {
      if (!query) return true
      return report.title.toLowerCase().includes(query)
        || report.description.toLowerCase().includes(query)
        || report.author.toLowerCase().includes(query)
        || report.authorAddress.toLowerCase().includes(query)
        || report.tags.some((tag) => tag.toLowerCase().includes(query))
    })
    .reverse()
}

export async function findLegacyReport(id: string): Promise<Report | null> {
  const decodedId = decodeURIComponent(id)
  const entries = await fetchLegacyRegistryEntries()
  const entry = entries.find((item) => {
    return legacyId(item) === decodedId || legacyHashId(item) === decodedId
  })
  if (!entry) return null
  return (await listLegacyReports()).find((report) => report.id === legacyId(entry)) ?? null
}
