/**
 * On-chain report registry — Shelby Research
 *
 * Reads/writes to the `shelby_registry::registry` Move module deployed on
 * Aptos testnet. Set NEXT_PUBLIC_REGISTRY_ADDRESS to the deployer's address.
 *
 * If the env var is missing the app works in "local-only" mode (no on-chain
 * persistence, STATIC_REPORTS shown as fallback).
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import type { Report } from '@/app/reports/_lib/types'

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? ''

// ── Aptos client (read-only, testnet) ─────────────────────────────────────────
const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }))

// ── Types returned by the view function ──────────────────────────────────────

export interface RegistryEntry {
  blob_account:  string
  blob_name:     string
  network:       string
  title:         string
  description:   string
  report_type:   string
  access:        string
  price:         string   // u64 serialised as string by the SDK
  file_type:     string
  tags:          string[]
  author:        string
  registrant:    string
  registered_at: string   // u64 microseconds, serialised as string
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function fetchRegistryEntries(): Promise<RegistryEntry[]> {
  if (!REGISTRY_ADDRESS) return []
  try {
    const result = await aptos.view({
      payload: {
        function:          `${REGISTRY_ADDRESS}::registry::get_entries` as `${string}::${string}::${string}`,
        typeArguments:     [],
        functionArguments: [REGISTRY_ADDRESS],
      },
    })
    return (result[0] as RegistryEntry[]) ?? []
  } catch {
    return []
  }
}

/** Convert all registry entries into Report objects ready for the UI. */
export async function fetchAllReports(): Promise<Report[]> {
  const entries = await fetchRegistryEntries()
  return entries
    .map((entry): Report => ({
      id:            `${entry.registrant}/${entry.blob_name}`,
      title:         entry.title,
      description:   entry.description,
      type:          entry.report_type as Report['type'],
      access:        entry.access as 'free' | 'premium',
      price:         Number(entry.price) > 0 ? Number(entry.price) / 1e8 : undefined,
      likes:         0,
      downloads:     0,
      author:        entry.author,
      authorAddress: entry.registrant,
      createdAt:     new Date(Number(entry.registered_at) / 1000).toISOString(),
      onChain:       true,
      fileType:      entry.file_type as Report['fileType'],
      tags:          entry.tags,
      blobAccount:   entry.blob_account,
      blobName:      entry.blob_name,
      network:       entry.network as 'testnet' | 'shelbynet',
    }))
    .reverse() // registry is append-only → newest first
}

// ── Write ─────────────────────────────────────────────────────────────────────

export interface RegisterParams {
  blobAccount:   string
  blobName:      string
  network:       'testnet' | 'shelbynet'
  title:         string
  description:   string
  reportType:    string
  access:        'free' | 'premium'
  price:         number   // APT in octas (0 for free)
  fileType:      string
  tags:          string[]
  author:        string
  signAndSubmit: (payload: { data: unknown }) => Promise<{ hash: string }>
}

export async function registerReportOnChain(params: RegisterParams): Promise<string> {
  if (!REGISTRY_ADDRESS) {
    // No contract deployed yet — skip silently so upload still works locally
    return ''
  }
  const result = await params.signAndSubmit({
    data: {
      function:          `${REGISTRY_ADDRESS}::registry::register_report` as `${string}::${string}::${string}`,
      typeArguments:     [],
      functionArguments: [
        REGISTRY_ADDRESS,
        params.blobAccount,
        params.blobName,
        params.network,
        params.title,
        params.description,
        params.reportType,
        params.access,
        params.price,
        params.fileType,
        params.tags,
        params.author,
      ],
    },
  })
  return result.hash
}
