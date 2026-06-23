import { AccountAddress, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

export const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }))

export function normalizeAddress(value: string) {
  return AccountAddress.from(value).toString()
}

export function registryAddress() {
  const value = process.env.NEXT_PUBLIC_REGISTRY_V2_ADDRESS
  if (!value) throw new Error('NEXT_PUBLIC_REGISTRY_V2_ADDRESS is not configured')
  return normalizeAddress(value)
}
