'use client'

import { useWallet } from '@aptos-labs/wallet-adapter-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

const NAV_LINKS = [
  { href: '/reports', label: 'Reports' },
  { href: '/smart-money', label: 'Smart Money' },
]

const REQUIRED_NETWORK = 'testnet'

export function Navbar() {
  const pathname     = usePathname()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { connected, account, connect, disconnect, wallets, network, changeNetwork } = useWallet()

  const [walletOpen, setWalletOpen]   = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  // Keep input in sync when URL changes (e.g. browser back/forward)
  const urlQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)
  useEffect(() => { setQuery(urlQuery) }, [urlQuery])

  // Debounce: update URL 300ms after typing stops
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim()
      const target  = trimmed
        ? `/reports?q=${encodeURIComponent(trimmed)}`
        : '/reports'

      if (pathname === '/reports') {
        router.replace(target)
      } else if (trimmed) {
        router.push(target)
      }
    }, 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    router.push(trimmed ? `/reports?q=${encodeURIComponent(trimmed)}` : '/reports')
  }

  const walletNetwork = network?.name?.toLowerCase() ?? null
  const wrongNetwork = connected && walletNetwork !== null && walletNetwork !== REQUIRED_NETWORK

  function truncateAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  async function handleSwitchNetwork() {
    try {
      await changeNetwork('testnet' as Parameters<typeof changeNetwork>[0])
    } catch {
      // wallet may not support programmatic switch — user must switch manually
    }
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background border-b border-divider">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center gap-6">

          {/* Left — Logo + Nav */}
          <div className="flex items-center gap-8 shrink-0">
            <Link href="/" className="text-brown font-semibold text-base tracking-tight">
              Shelby Research
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors duration-150 ${
                    pathname === link.href
                      ? 'text-pink font-medium bg-pink-light'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Center — Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-sm mx-auto hidden md:block">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports…"
              className="w-full h-8 px-3 text-sm bg-surface border border-divider rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pink transition-colors duration-150"
            />
          </form>

          {/* Right — Network badge + Wallet */}
          <div className="flex items-center gap-2 ml-auto shrink-0">

            {/* Testnet badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-divider bg-surface text-xs text-text-secondary select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              <span>Testnet</span>
            </div>

            {/* Connect Wallet / Account Dropdown */}
            {connected && account ? (
              <div className="relative">
                <button
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-pink text-white hover:opacity-90 active:opacity-80 transition-opacity"
                >
                  {truncateAddress(account.address.toString())}
                  <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {accountOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-40 bg-background border border-divider rounded-md shadow-sm z-50 py-1">
                      <Link
                        href="/profile"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </Link>
                      <button
                        onClick={() => { disconnect(); setAccountOpen(false) }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface hover:text-text-primary transition-colors text-left"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Disconnect
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setWalletOpen(true)}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-pink text-white hover:opacity-90 active:opacity-80 transition-opacity"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Wrong network banner */}
        {wrongNetwork && (
          <div className="bg-warning/10 border-b border-warning/30 px-6 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-text-primary">
              <svg className="w-4 h-4 text-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>
                Your wallet is connected to <span className="font-medium capitalize">{walletNetwork}</span>.
                Shelby Research runs on <span className="font-medium">Testnet</span>.
              </span>
            </div>
            <button
              onClick={handleSwitchNetwork}
              className="shrink-0 px-3 py-1 rounded-md bg-warning text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Switch to Testnet
            </button>
          </div>
        )}
      </nav>

      {/* Wallet Modal */}
      {walletOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => setWalletOpen(false)}
        >
          <div
            className="bg-background border border-divider rounded-xl shadow-sm w-80 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary">Connect Wallet</h2>
              <button
                onClick={() => setWalletOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {wallets.length === 0 && (
                <p className="text-xs text-text-muted text-center py-4">
                  No Aptos wallets detected. Install Petra or another Aptos wallet.
                </p>
              )}
              {wallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => { connect(wallet.name); setWalletOpen(false) }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-divider hover:bg-surface transition-colors duration-150 text-sm text-text-primary"
                >
                  {wallet.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wallet.icon} alt={wallet.name} className="w-5 h-5 rounded" />
                  )}
                  <span>{wallet.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
