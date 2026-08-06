'use client'

import { useShelbyNetwork } from '@/features/network/NetworkProvider'
import { SHELBY_NETWORK_OPTIONS } from '@/features/network/network'
import type { ShelbyNetwork } from '@/features/reports/types/report'
import styles from './NetworkSelector.module.css'

export function NetworkSelector() {
  const { network, setNetwork } = useShelbyNetwork()

  return (
    <label className={styles.selector}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>Shelby storage</span>
      <select
        className={styles.select}
        value={network}
        onChange={(event) => setNetwork(event.target.value as ShelbyNetwork)}
        aria-label="Shelby storage network"
      >
        {SHELBY_NETWORK_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.shortLabel}</option>
        ))}
      </select>
      <svg className={styles.chevron} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="m6 8 4 4 4-4" />
      </svg>
    </label>
  )
}
