'use client'

import { FormEvent, ReactNode, Suspense, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { NetworkSelector } from '@/features/network/components/NetworkSelector'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { ShelbyNetworkProvider } from '@/features/network/NetworkProvider'
import styles from './WorkspaceShell.module.css'

const PAGE_LABELS: Record<string, string> = {
  '/reports': 'Research library',
  '/intel': 'Market intelligence',
  '/profile': 'Your workspace',
}

function WorkspaceToolbar({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.get('q') ?? ''

  const pageRoot = Object.keys(PAGE_LABELS).find((root) => pathname === root || pathname.startsWith(`${root}/`))

  return (
    <header className={styles.toolbar}>
      <button className={styles.menuButton} onClick={onOpenNavigation} aria-label="Open navigation">
        <MaterialIcon name="menu" size={22} />
      </button>

      <SearchForm key={currentQuery} initialQuery={currentQuery} onSearch={(query) => router.push(query ? `/reports?q=${encodeURIComponent(query)}` : '/reports')} />

      <div className={styles.toolbarMeta}>
        <NetworkSelector />
        <div className={styles.context}>
          <span>{pageRoot ? PAGE_LABELS[pageRoot] : 'Shelby Scribe'}</span>
          <i />
          <strong>Live</strong>
        </div>
      </div>
    </header>
  )
}

function SearchForm({ initialQuery, onSearch }: { initialQuery: string; onSearch: (query: string) => void }) {
  const [query, setQuery] = useState(initialQuery)

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(query.trim())
  }

  return (
    <form className={styles.search} onSubmit={submitSearch} role="search">
        <MaterialIcon name="search" size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search reports, authors, or tags…"
          aria-label="Search reports"
        />
        {query && (
          <button type="button" className={styles.clearSearch} onClick={() => setQuery('')} aria-label="Clear search">
            <MaterialIcon name="close" size={18} />
          </button>
        )}
        <span className={styles.searchHint}>Enter</span>
    </form>
  )
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <ShelbyNetworkProvider>
      <WorkspaceShellInner>{children}</WorkspaceShellInner>
    </ShelbyNetworkProvider>
  )
}

function WorkspaceShellInner({ children }: { children: ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false)

  return (
    <div className={styles.frame}>
      <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <main className={styles.workspace}>
        <Suspense fallback={<div className={styles.toolbarPlaceholder} />}>
          <WorkspaceToolbar onOpenNavigation={() => setNavigationOpen(true)} />
        </Suspense>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  )
}
