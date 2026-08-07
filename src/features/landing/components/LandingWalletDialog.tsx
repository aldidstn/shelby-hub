'use client'

import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react'
import { WalletConnectDialog } from '@/components/wallet/WalletConnectDialog'

interface LandingWalletDialogProps {
  open: boolean
  onClose: () => void
  onConnected: () => void
}

export function LandingWalletDialog({ open, onClose, onConnected }: LandingWalletDialogProps) {
  return (
    <AptosWalletAdapterProvider autoConnect={false} disableTelemetry>
      <WalletConnectDialog open={open} onClose={onClose} onConnected={onConnected} />
    </AptosWalletAdapterProvider>
  )
}
