'use client'

import { useWallet } from '@aptos-labs/wallet-adapter-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

type Network = 'shelbynet' | 'testnet'

const NETWORKS: { id: Network; label: string; dotColor: string }[] = [
  { id: 'shelbynet', label: 'ShelbyNet', dotColor: 'bg-positive' },
  { id: 'testnet', label: 'Testnet', dotColor: 'bg-warning' },
]

const NAV_LINKS = [
  { href: '/', label: 'Main Dashboard' },
  { href: '/reports', label: 'Reports' },
  { href: '/smart-money', label: 'Smart Money' },
]

// RPC latency is mocked until a live Alchemy/RPC endpoint is wired up
const RPC_LABEL = 'Alchemy'
const RPC_LATENCY_MS = 42

export function Navbar() {
  const pathname = usePathname()
  const { connected, account, connect, disconnect, wallets } = useWallet()

  const [network, setNetwork] = useState<Network>('shelbynet')
  const [networkOpen, setNetworkOpen] = useState(false)
  const [showRpcLatency, setShowRpcLatency] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)

  const activeNetwork = NETWORKS.find((n) => n.id === network)!

  function truncateAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  function handleConnectWallet() {
    if (connected) {
      disconnect()
    } else {
      setWalletOpen(true)
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
          <div className="flex-1 max-w-sm mx-auto hidden md:block">
            <input
              type="text"
              placeholder="Search..."
              className="w-full h-8 px-3 text-sm bg-surface border border-divider rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pink transition-colors duration-150"
            />
          </div>

          {/* Right — RPC + Network + Wallet */}
          <div className="flex items-center gap-2 ml-auto shrink-0">

            {/* RPC Status */}
            <div
              className="relative hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-divider bg-surface cursor-default select-none text-xs text-text-secondary"
              onMouseEnter={() => setShowRpcLatency(true)}
              onMouseLeave={() => setShowRpcLatency(false)}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-positive" />
              <span>RPC: {RPC_LABEL}</span>
              {showRpcLatency && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 bg-brown text-white text-xs rounded whitespace-nowrap z-50">
                  {RPC_LATENCY_MS}ms
                </div>
              )}
            </div>

            {/* Network Selector */}
            <div className="relative">
              <button
                onClick={() => setNetworkOpen((o) => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-divider bg-surface text-xs text-text-secondary hover:text-text-primary transition-colors duration-150"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeNetwork.dotColor}`} />
                <span>{activeNetwork.label}</span>
                <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {networkOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-36 bg-background border border-divider rounded-md shadow-sm z-50 py-1">
                  {NETWORKS.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { setNetwork(n.id); setNetworkOpen(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors duration-150 ${
                        network === n.id
                          ? 'text-pink bg-pink-light'
                          : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${n.dotColor}`} />
                      {n.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Connect Wallet */}
            <button
              onClick={handleConnectWallet}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 bg-pink text-white hover:opacity-90 active:opacity-80"
            >
              {connected && account
                ? truncateAddress(account.address.toString())
                : 'Connect Wallet'}
            </button>
          </div>
        </div>
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
