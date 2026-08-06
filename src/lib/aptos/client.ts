import { AccountAddress, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import type { ShelbyNetwork } from '@/features/reports/types/report'

const aptosClients: Record<ShelbyNetwork, Aptos> = {
  testnet: new Aptos(new AptosConfig({ network: Network.TESTNET })),
  shelbynet: new Aptos(new AptosConfig({ network: Network.SHELBYNET })),
}

export const aptos = aptosClients.testnet

export function aptosForNetwork(network: ShelbyNetwork = 'testnet') {
  return aptosClients[network]
}

export function normalizeAddress(value: string) {
  return AccountAddress.from(value).toString()
}

export function registryAddress(network: ShelbyNetwork = 'testnet') {
  const value = network === 'shelbynet'
    ? process.env.NEXT_PUBLIC_REGISTRY_V2_SHELBYNET_ADDRESS ?? process.env.NEXT_PUBLIC_REGISTRY_V2_ADDRESS
    : process.env.NEXT_PUBLIC_REGISTRY_V2_ADDRESS
  if (!value) throw new Error(`Registry V2 is not configured for ${network}`)
  return normalizeAddress(value)
}

export function registryConfigured(network: ShelbyNetwork = 'testnet') {
  try {
    registryAddress(network)
    return true
  } catch {
    return false
  }
}
