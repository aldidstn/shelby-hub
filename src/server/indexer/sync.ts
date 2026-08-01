import { eq, sql } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { aptos, normalizeAddress, registryAddress } from '@/lib/aptos/client'
import type { RegistryEventData } from '@/lib/aptos/registry-v2'
import { getDb } from '@/server/db/client'
import { indexerState, purchases, reports } from '@/server/db/schema'

interface IndexedEvent {
  account_address: string
  creation_number: string
  event_index: number
  sequence_number: string
  transaction_block_height: string
  transaction_version: string
  type: string
  data: RegistryEventData
}

interface IndexedTransaction { version: string }

const INDEXER_KEY = 'registry_v2_event_version'
const LEGACY_KEY = 'registry_v1_imported'

function indexedEncryptionVersion(value: number | string | undefined) {
  const version = Number(value ?? 0)
  if (version === 1) return 'aes-256-gcm-v1' as const
  if (version === 2) return 'ace-ibe-v1' as const
  return null
}

async function cursor(key: string, fallback = '0') {
  const [row] = await getDb().select().from(indexerState).where(eq(indexerState.key, key)).limit(1)
  return row?.cursor ?? fallback
}

async function saveCursor(key: string, value: string) {
  await getDb().insert(indexerState).values({ key, cursor: value }).onConflictDoUpdate({
    target: indexerState.key, set: { cursor: value, updatedAt: new Date() },
  })
}

async function fetchTransactions(afterVersion: string): Promise<IndexedTransaction[]> {
  const endpoint = process.env.APTOS_INDEXER_URL ?? 'https://api.testnet.aptoslabs.com/v1/graphql'
  const query = `query RegistryTransactions($version: bigint!, $address: String!) {
    user_transactions(where: {version: {_gt: $version}, entry_function_contract_address: {_eq: $address}, entry_function_module_name: {_eq: "registry_v2"}}, order_by: {version: asc}, limit: 100) {
      version
    }
  }`
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { version: afterVersion, address: registryAddress() } }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Aptos indexer returned HTTP ${response.status}`)
  const result = await response.json() as { data?: { user_transactions: IndexedTransaction[] }; errors?: Array<{ message: string }> }
  if (result.errors?.length) throw new Error(result.errors.map((item) => item.message).join('; '))
  return result.data?.user_transactions ?? []
}

async function eventsForTransaction(version: string): Promise<IndexedEvent[]> {
  const transaction = await aptos.getTransactionByVersion({ ledgerVersion: BigInt(version) })
  if (!('events' in transaction)) return []
  const prefix = `${registryAddress()}::registry_v2::`
  return transaction.events.flatMap((event, eventIndex) => event.type.startsWith(prefix) ? [{
    account_address: registryAddress(), creation_number: '0', event_index: eventIndex,
    sequence_number: '0', transaction_block_height: '0', transaction_version: version,
    type: event.type, data: event.data as unknown as RegistryEventData,
  }] : [])
}

async function applyEvent(event: IndexedEvent) {
  const name = event.type.split('::').at(-1)
  const data = event.data
  if (name === 'ReportRegistered') {
    await getDb().insert(reports).values({
      id: data.report_id,
      ownerAddress: normalizeAddress(data.owner!),
      blobAccount: normalizeAddress(data.owner!),
      blobName: data.blob_name,
      network: data.network!,
      title: data.title!,
      description: data.description ?? '',
      reportType: data.report_type!,
      access: data.access!,
      priceOctas: Number(data.price ?? 0),
      fileType: data.file_type!,
      tags: data.tags ?? [],
      cipherHash: data.cipher_hash || null,
      encryptionVersion: indexedEncryptionVersion(data.encryption_version),
      source: 'v2', status: 'active', active: true,
      chainVersion: Number(event.transaction_version),
      createdAt: new Date(Number(data.created_at) / 1000), updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: reports.id,
      set: {
        ownerAddress: normalizeAddress(data.owner!), blobAccount: normalizeAddress(data.owner!), blobName: data.blob_name, network: data.network!,
        title: data.title!, description: data.description ?? '', reportType: data.report_type!, access: data.access!,
        priceOctas: Number(data.price ?? 0), fileType: data.file_type!, tags: data.tags ?? [],
        cipherHash: data.cipher_hash || null, encryptionVersion: indexedEncryptionVersion(data.encryption_version),
        status: 'active', source: 'v2', active: true,
        chainVersion: Number(event.transaction_version), updatedAt: new Date(),
      },
    })
  }
  if (name === 'ReportUpdated') {
    await getDb().update(reports).set({
      title: data.title!, description: data.description ?? '', reportType: data.report_type!,
      access: data.access!, priceOctas: Number(data.price ?? 0), tags: data.tags ?? [], updatedAt: new Date(),
    }).where(eq(reports.id, data.report_id))
  }
  if (name === 'ReportDeactivated') {
    await getDb().update(reports).set({ active: false, status: 'inactive', updatedAt: new Date() }).where(eq(reports.id, data.report_id))
  }
  if (name === 'ReportPurchased') {
    await getDb().insert(purchases).values({
      reportId: data.report_id,
      buyerAddress: normalizeAddress(data.buyer!),
      sellerAddress: normalizeAddress(data.seller!),
      amountOctas: Number(data.amount),
      transactionHash: `version:${event.transaction_version}`,
      transactionVersion: Number(event.transaction_version),
      eventIndex: event.event_index,
      purchasedAt: new Date(Number(data.purchased_at) / 1000),
    }).onConflictDoNothing()
  }
}

export async function syncRegistryV2() {
  let current = await cursor(INDEXER_KEY)
  let processed = 0
  while (true) {
    const transactions = await fetchTransactions(current)
    if (transactions.length === 0) break
    for (const transaction of transactions) {
      for (const event of await eventsForTransaction(transaction.version)) {
        // Event handlers are idempotent, so replaying after a crash is safe.
        await applyEvent(event)
        processed += 1
      }
      await saveCursor(INDEXER_KEY, transaction.version)
      current = transaction.version
    }
    if (transactions.length < 100) break
  }
  return processed
}

export async function importLegacyRegistry() {
  if (await cursor(LEGACY_KEY, '') === 'done') return 0
  const address = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS
  if (!address) return 0
  const result = await aptos.view({ payload: {
    function: `${normalizeAddress(address)}::registry::get_entries` as `${string}::${string}::${string}`,
    typeArguments: [], functionArguments: [normalizeAddress(address)],
  } })
  const entries = (result[0] ?? []) as Array<Record<string, string | string[]>>
  for (const item of entries) {
    const owner = normalizeAddress(String(item.registrant))
    const legacyKey = `${owner}/${String(item.blob_name)}`
    const id = `legacy:${createHash('sha256').update(legacyKey).digest('hex').slice(0, 32)}`
    await getDb().insert(reports).values({
      id, ownerAddress: owner, blobAccount: String(item.blob_account), blobName: String(item.blob_name), network: String(item.network),
      title: String(item.title), description: String(item.description), reportType: String(item.report_type),
      access: 'free', priceOctas: 0, fileType: String(item.file_type), tags: item.tags as string[],
      source: 'v1', status: 'active', active: true,
      createdAt: new Date(Number(item.registered_at) / 1000), updatedAt: new Date(),
    }).onConflictDoNothing()
  }
  await saveCursor(LEGACY_KEY, 'done')
  return entries.length
}

export async function cleanupExpiredState() {
  await getDb().execute(sql`delete from auth_nonces where expires_at < now() - interval '1 day'`)
  await getDb().execute(sql`delete from sessions where expires_at < now()`)
  await getDb().execute(sql`delete from reports where status = 'pending' and created_at < now() - interval '1 day'`)
}
