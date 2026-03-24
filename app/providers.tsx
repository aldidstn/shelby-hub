'use client'

import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react'
import { type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AptosWalletAdapterProvider autoConnect={false} disableTelemetry>
      {children}
    </AptosWalletAdapterProvider>
  )
}
