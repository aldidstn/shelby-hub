'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { truncateAddress } from '@/lib/format'
import { ThemeToggle } from './ThemeToggle'
import { WalletConnectDialog } from '@/components/wallet/WalletConnectDialog'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { href: '/reports', label: 'Reports', icon: 'document' },
  { href: '/intel', label: 'Intel', icon: 'pulse' },
  { href: '/profile', label: 'Profile', icon: 'user' },
] as const

function NavIcon({ name }: { name: typeof NAV_ITEMS[number]['icon'] }) {
  if (name === 'pulse') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12h4l2.3-6 4.2 12 2.2-6H21"/></svg>
  if (name === 'user') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"/></svg>
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3.5h9l3 3V20.5H6z"/><path d="M15 3.5v4h4M9 12h6m-6 3h6"/></svg>
}

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
        <Link href="/reports" className={styles.brand} onClick={onClose} aria-label="Shelby Hub reports">
          <Image src="/images/shelby-logo-pink.svg" alt="Shelby Hub" width={172} height={40} className={styles.brandLogo} priority />
        </Link>
        <button className={styles.mobileClose} onClick={onClose} aria-label="Close menu">×</button>
      </div>

      <div className={styles.sectionLabel}>Workspace</div>
      <nav className={styles.navigation} aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return <Link key={item.href} href={item.href} onClick={onClose} className={`${styles.navItem} ${active ? styles.active : ''}`}>
            <NavIcon name={item.icon}/><span>{item.label}</span>{active && <i/>}
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
          <button onClick={handleDisconnect} className={styles.disconnect} title="Disconnect wallet" aria-label="Disconnect wallet">↗</button>
        </div>
      ) : (
        <button className={styles.connectButton} onClick={() => setWalletOpen(true)}>Connect wallet</button>
      )}

      <div className={styles.sidebarLinks}><a href="https://docs.shelby.xyz/" target="_blank" rel="noreferrer">Docs</a><a href="https://github.com/shelby" target="_blank" rel="noreferrer">GitHub</a></div>
    </aside>

    <WalletConnectDialog open={walletOpen} onClose={() => setWalletOpen(false)} />
  </>
}
