'use client'

import { createContext, type ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import type { ShelbyNetwork } from '@/features/reports/types/report'
import {
  DEFAULT_SHELBY_NETWORK,
  getStoredShelbyNetwork,
  storeShelbyNetwork,
  subscribeToShelbyNetwork,
} from './network'

type ShelbyNetworkContextValue = {
  network: ShelbyNetwork
  setNetwork: (network: ShelbyNetwork) => void
}

const ShelbyNetworkContext = createContext<ShelbyNetworkContextValue | null>(null)

export function ShelbyNetworkProvider({ children }: { children: ReactNode }) {
  const network = useSyncExternalStore(
    subscribeToShelbyNetwork,
    getStoredShelbyNetwork,
    () => DEFAULT_SHELBY_NETWORK,
  )

  const setNetwork = useCallback((nextNetwork: ShelbyNetwork) => {
    storeShelbyNetwork(nextNetwork)
  }, [])

  const value = useMemo(() => ({ network, setNetwork }), [network, setNetwork])

  return <ShelbyNetworkContext.Provider value={value}>{children}</ShelbyNetworkContext.Provider>
}

export function useShelbyNetwork() {
  const context = useContext(ShelbyNetworkContext)
  if (!context) throw new Error('useShelbyNetwork must be used inside ShelbyNetworkProvider')
  return context
}
