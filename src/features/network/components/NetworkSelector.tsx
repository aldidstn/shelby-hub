'use client'

import { useEffect, useRef, useState } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { useShelbyNetwork } from '@/features/network/NetworkProvider'
import { SHELBY_NETWORK_OPTIONS } from '@/features/network/network'
import { ensureWalletNetwork } from '@/features/network/wallet-network'
import type { ShelbyNetwork } from '@/features/reports/types/report'
import styles from './NetworkSelector.module.css'

export function NetworkSelector() {
  const { network, setNetwork } = useShelbyNetwork()
  const { connected, account, network: walletNetwork, wallet, changeNetwork } = useWallet()
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)
  const walletStateRef = useRef({ network, walletNetwork, wallet, changeNetwork })
  walletStateRef.current = { network, walletNetwork, wallet, changeNetwork }

  const connectionKey = connected && account && wallet
    ? `${account.address.toString()}:${wallet.name}`
    : null

  useEffect(() => {
    if (!connectionKey) return
    const current = walletStateRef.current
    setSwitchError(null)
    setSwitching(true)
    void ensureWalletNetwork({
      target: current.network,
      currentNetwork: current.walletNetwork,
      wallet: current.wallet,
      changeNetwork: current.changeNetwork,
    }).catch((error: unknown) => {
      setSwitchError(error instanceof Error ? error.message : 'Could not switch wallet network')
    }).finally(() => setSwitching(false))
  }, [connectionKey])

  async function handleNetworkChange(nextNetwork: ShelbyNetwork) {
    setSwitchError(null)
    if (!connected) {
      setNetwork(nextNetwork)
      return
    }

    setSwitching(true)
    try {
      await ensureWalletNetwork({ target: nextNetwork, currentNetwork: walletNetwork, wallet, changeNetwork })
      setNetwork(nextNetwork)
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : 'Could not switch wallet network')
    } finally {
      setSwitching(false)
    }
  }

  return (
    <label className={`${styles.selector} ${switchError ? styles.error : ''}`} title={switchError ?? undefined}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>Shelby storage</span>
      <select
        className={styles.select}
        value={network}
        onChange={(event) => void handleNetworkChange(event.target.value as ShelbyNetwork)}
        disabled={switching}
        aria-busy={switching}
        aria-describedby={switchError ? 'network-switch-error' : undefined}
        aria-label="Shelby storage network"
      >
        {SHELBY_NETWORK_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.shortLabel}</option>
        ))}
      </select>
      <svg className={styles.chevron} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="m6 8 4 4 4-4" />
      </svg>
      {switchError && <span id="network-switch-error" className={styles.srOnly} role="alert">{switchError}</span>}
    </label>
  )
}
