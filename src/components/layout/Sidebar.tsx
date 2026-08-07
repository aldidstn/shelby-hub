'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { truncateAddress } from '@/lib/format'
import { ThemeToggle } from './ThemeToggle'
import { WalletConnectDialog } from '@/components/wallet/WalletConnectDialog'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { href: '/reports', label: 'Reports', icon: 'description' },
  { href: '/intel', label: 'Intel', icon: 'monitoring' },
  { href: '/profile', label: 'Profile', icon: 'person' },
] as const

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { connected, account, disconnect } = useWallet()
  const [walletOpen, setWalletOpen] = useState(false)

  async function handleDisconnect() {
    await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => undefined)
    disconnect()
  }

  return <>
    {open && <button className={styles.overlay} onClick={onClose} aria-label="Close navigation" />}
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
      <div className={styles.brandRow}>
        <Link href="/reports" className={styles.brand} onClick={onClose} aria-label="Shelby Scribe reports">
          <Image src="/images/shelby-logo-pink.svg" alt="Shelby Scribe" width={172} height={40} className={styles.brandLogo} priority />
        </Link>
        <button className={styles.mobileClose} onClick={onClose} aria-label="Close menu"><MaterialIcon name="close" size={24} /></button>
      </div>

      <div className={styles.sectionLabel}>Workspace</div>
      <nav className={styles.navigation} aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return <Link key={item.href} href={item.href} onClick={onClose} className={`${styles.navItem} ${active ? styles.active : ''}`}>
            <MaterialIcon name={item.icon} size={20} /><span>{item.label}</span>{active && <i/>}
          </Link>
        })}
      </nav>

      <div className={styles.spacer}/>

      <div className={styles.utilityRow}>
        <span>Appearance</span><ThemeToggle/>
      </div>

      {connected && account ? (
        <div className={styles.accountCard}>
          <div className={styles.accountText}><strong>{truncateAddress(account.address.toString())}</strong><small>Connected wallet</small></div>
          <button onClick={handleDisconnect} className={styles.disconnect} title="Disconnect wallet" aria-label="Disconnect wallet"><MaterialIcon name="arrow_outward" size={20} /></button>
        </div>
      ) : (
        <button className={styles.connectButton} onClick={() => setWalletOpen(true)}>Connect wallet</button>
      )}

      <div className={styles.sidebarLinks}><a href="https://docs.shelby.xyz/" target="_blank" rel="noreferrer">Docs</a><a href="https://github.com/aldidstn/shelby-hub" target="_blank" rel="noreferrer">GitHub</a></div>
    </aside>

    <WalletConnectDialog open={walletOpen} onClose={() => setWalletOpen(false)} />
  </>
}
