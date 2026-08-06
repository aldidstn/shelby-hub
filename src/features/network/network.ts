import type { ShelbyNetwork } from '@/features/reports/types/report'

export const DEFAULT_SHELBY_NETWORK: ShelbyNetwork = 'testnet'
export const SHELBY_NETWORK_STORAGE_KEY = 'shelby-scribe:storage-network'

const networkListeners = new Set<() => void>()

export const SHELBY_NETWORK_OPTIONS: ReadonlyArray<{
  value: ShelbyNetwork
  label: string
  shortLabel: string
}> = [
  { value: 'testnet', label: 'Shelby Testnet', shortLabel: 'Testnet' },
  { value: 'shelbynet', label: 'ShelbyNet', shortLabel: 'ShelbyNet' },
]

export function toShelbyNetwork(value: string | null | undefined): ShelbyNetwork {
  return value === 'shelbynet' ? 'shelbynet' : DEFAULT_SHELBY_NETWORK
}

export function shelbyNetworkLabel(network: ShelbyNetwork) {
  return SHELBY_NETWORK_OPTIONS.find((option) => option.value === network)?.label ?? 'Shelby Testnet'
}

export function getStoredShelbyNetwork() {
  if (typeof window === 'undefined') return DEFAULT_SHELBY_NETWORK
  return toShelbyNetwork(window.localStorage.getItem(SHELBY_NETWORK_STORAGE_KEY))
}

export function storeShelbyNetwork(network: ShelbyNetwork) {
  window.localStorage.setItem(SHELBY_NETWORK_STORAGE_KEY, network)
  networkListeners.forEach((listener) => listener())
}

export function subscribeToShelbyNetwork(listener: () => void) {
  networkListeners.add(listener)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SHELBY_NETWORK_STORAGE_KEY) listener()
  }
  window.addEventListener('storage', handleStorage)
  return () => {
    networkListeners.delete(listener)
    window.removeEventListener('storage', handleStorage)
  }
}
