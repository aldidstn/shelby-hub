import type { ShelbyNetwork } from '@/features/reports/types/report'
import { aptosForNetwork, normalizeAddress, registryAddress } from './client'

export interface RegistryEventData {
  report_id: string
  owner?: string
  buyer?: string
  seller?: string
  amount?: string
  blob_name?: string
  network?: string
  title?: string
  description?: string
  report_type?: string
  access?: string
  price?: string
  file_type?: string
  tags?: string[]
  cipher_hash?: string
  encryption_version?: number
  created_at?: string
  updated_at?: string
  deactivated_at?: string
  purchased_at?: string
}

export interface VerifiedRegistryEvent {
  data: RegistryEventData
  eventIndex: number
  transactionHash: string
  transactionVersion: number
  sender: string
  timestamp: Date
}

export function registryFunction(name: string, network: ShelbyNetwork = 'testnet') {
  return `${registryAddress(network)}::registry_v2::${name}` as `${string}::${string}::${string}`
}

export async function verifyRegistryEvent(
  transactionHash: string,
  eventName: string,
  network: ShelbyNetwork = 'testnet',
): Promise<VerifiedRegistryEvent> {
  const transaction = await aptosForNetwork(network).getTransactionByHash({ transactionHash })
  if (!('sender' in transaction) || !('events' in transaction) || !transaction.success) throw new Error('Transaction is not a successful user transaction')
  const type = `${registryAddress(network)}::registry_v2::${eventName}`
  const eventIndex = transaction.events.findIndex((event) => event.type === type)
  if (eventIndex < 0) throw new Error(`Transaction does not contain ${eventName}`)
  return {
    data: transaction.events[eventIndex].data as unknown as RegistryEventData,
    eventIndex,
    transactionHash: transaction.hash,
    transactionVersion: Number(transaction.version),
    sender: normalizeAddress(transaction.sender),
    timestamp: new Date(Number(transaction.timestamp) / 1000),
  }
}

export async function hasPurchasedOnChain(buyer: string, reportId: string, network: ShelbyNetwork = 'testnet') {
  const result = await aptosForNetwork(network).view({ payload: {
    function: registryFunction('has_purchased', network), typeArguments: [],
    functionArguments: [registryAddress(network), normalizeAddress(buyer), reportId],
  } })
  return result[0] === true
}
