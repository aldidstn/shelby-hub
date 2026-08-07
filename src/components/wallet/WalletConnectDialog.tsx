'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import styles from './WalletConnectDialog.module.css'

interface WalletConnectDialogProps {
  open: boolean
  onClose: () => void
  onConnected?: () => void
}

export function WalletConnectDialog({ open, onClose, onConnected }: WalletConnectDialogProps) {
  const { connect, wallets } = useWallet()
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  if (!open) return null

  async function chooseWallet(walletName: string) {
    setConnecting(walletName)
    setError(null)
    try {
      await connect(walletName)
      onClose()
      onConnected?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Wallet connection failed')
    } finally {
      setConnecting(null)
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <small>APTOS WALLET</small>
            <h2 id="wallet-dialog-title">Choose your wallet</h2>
            <p>Connect once. Purchase and publish directly on-chain.</p>
          </div>
          <button onClick={onClose} aria-label="Close wallet selection"><MaterialIcon name="close" size={22} /></button>
        </header>

        <div className={styles.walletList}>
          {wallets.length === 0 && (
            <div className={styles.emptyState}>
              <strong>No Aptos wallets detected</strong>
              <p>Install Petra or another compatible Aptos wallet, then refresh this page.</p>
              <a href="https://aptos.dev/build/sdks/wallet-adapter/wallets" target="_blank" rel="noreferrer">View compatible wallets</a>
            </div>
          )}
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => chooseWallet(wallet.name)}
              disabled={connecting !== null}
            >
              {wallet.icon && <Image src={wallet.icon} alt="" width={28} height={28} unoptimized />}
              <span>{wallet.name}</span>
              <b>{connecting === wallet.name ? 'Connecting…' : 'Connect'}</b>
            </button>
          ))}
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.notice}>Shelby never takes custody of your wallet or private keys.</p>
      </section>
    </div>
  )
}
