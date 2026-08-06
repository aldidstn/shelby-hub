import { aptosForNetwork, normalizeAddress, registryAddress, registryConfigured } from '@/lib/aptos/client'
import { hasPurchasedOnChain, registryFunction } from '@/lib/aptos/registry-v2'
import type { Report } from '@/features/reports/types/report'

type RegistryV2ReportEntry = {
  id: string
  owner: string
  blob_name: string
  network: string
  title: string
  description: string
  report_type: string
  access: string
  price: string | number
  file_type: string
  tags?: string[]
  cipher_hash?: string
  encryption_version?: string | number
  active: boolean
  created_at: string | number
}

function toIsoDate(value: string | number) {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return new Date().toISOString()
  return new Date(timestamp / 1000).toISOString()
}

function encryptionVersion(value: string | number | undefined): Report['encryptionVersion'] | undefined {
  const version = Number(value ?? 0)
  if (version === 1) return 'aes-256-gcm-v1'
  if (version === 2) return 'ace-ibe-v1'
  return undefined
}

export async function findRegistryV2Report(
  id: string,
  walletAddress?: string | null,
  network: NonNullable<Report['network']> = 'testnet',
): Promise<Report | null> {
  if (!registryConfigured(network)) return null

  try {
    const result = await aptosForNetwork(network).view({
      payload: {
        function: registryFunction('get_report', network),
        typeArguments: [],
        functionArguments: [registryAddress(network), decodeURIComponent(id)],
      },
    })
    const entry = result[0] as RegistryV2ReportEntry | undefined
    if (!entry) return null

    const owner = normalizeAddress(entry.owner)
    const wallet = walletAddress ? normalizeAddress(walletAddress) : null
    const owned = wallet === owner
    const purchased = Boolean(
      wallet
      && entry.access === 'premium'
      && !owned
      && await hasPurchasedOnChain(wallet, entry.id, network),
    )

    return {
      id: entry.id,
      title: entry.title,
      description: entry.description,
      type: entry.report_type as Report['type'],
      access: entry.access === 'premium' ? 'premium' : 'free',
      price: Number(entry.price) > 0 ? Number(entry.price) / 1e8 : undefined,
      likes: 0,
      downloads: 0,
      author: `${owner.slice(0, 10)}…`,
      authorAddress: owner,
      createdAt: toIsoDate(entry.created_at),
      onChain: true,
      fileType: entry.file_type as Report['fileType'],
      tags: entry.tags ?? [],
      blobAccount: owner,
      blobName: entry.blob_name,
      network,
      encryptionVersion: encryptionVersion(entry.encryption_version),
      cipherHash: entry.cipher_hash || undefined,
      purchased,
      owned,
      active: entry.active,
    }
  } catch {
    return null
  }
}

export async function findRegistryV2ReportAcrossNetworks(id: string, walletAddress?: string | null) {
  return await findRegistryV2Report(id, walletAddress, 'testnet')
    ?? await findRegistryV2Report(id, walletAddress, 'shelbynet')
}
