'use client'

import { useEffect, useState, useCallback } from 'react'

/* ─── Types ─────────────────────────────────────────────── */

interface TradeAttributes {
  block_number: number
  tx_hash: string
  tx_from_address: string
  from_token_amount: string
  to_token_amount: string
  price_from_in_usd: string
  price_to_in_usd: string
  block_timestamp: string
  kind: 'buy' | 'sell'
  volume_in_usd: string
  from_token_address: string
  to_token_address: string
}

interface Trade {
  id: string
  type: 'trade'
  attributes: TradeAttributes
}

type FilterKind = 'all' | 'buy' | 'sell'

/* ─── Constants ──────────────────────────────────────────── */

const POOL_ADDRESS = '0x06da0fd433c1a5d7a4faa01111c044910a184553'

const TOKEN_LABELS: Record<string, string> = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
}

/* ─── Helpers ────────────────────────────────────────────── */

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function truncateHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

function formatAmount(raw: string, decimals = 4) {
  const n = parseFloat(raw)
  if (isNaN(n)) return raw
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K`
  return n.toFixed(decimals)
}

function formatUsd(raw: string) {
  const n = parseFloat(raw)
  if (isNaN(n)) return raw
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`
  return `$${n.toFixed(2)}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)        return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)        return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)        return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/* ─── Sub-components ─────────────────────────────────────── */

function KindBadge({ kind }: { kind: 'buy' | 'sell' }) {
  return kind === 'buy' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-positive/10 text-positive">
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5l7.5-7.5 7.5 7.5M12 3v18" />
      </svg>
      BUY
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-negative/10 text-negative">
      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5l-7.5 7.5-7.5-7.5M12 21V3" />
      </svg>
      SELL
    </span>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-surface border border-divider rounded-xl px-5 py-4 flex flex-col gap-1">
      <span className="text-xs text-text-muted uppercase tracking-wide">{label}</span>
      <span className={`text-xl font-semibold ${accent ?? 'text-text-primary'}`}>{value}</span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────── */

export default function SmartMoneyPage() {
  const [trades, setTrades]       = useState<Trade[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [filter, setFilter]       = useState<FilterKind>('all')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing]   = useState(false)

  const fetchTrades = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res  = await fetch('/api/smart-money')
      const json = await res.json() as { data?: Trade[]; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`)
      setTrades(json.data ?? [])
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchTrades() }, [fetchTrades])

  /* ── Derived stats ── */
  const buys  = trades.filter((t) => t.attributes.kind === 'buy')
  const sells = trades.filter((t) => t.attributes.kind === 'sell')

  const totalVol  = trades.reduce((s, t) => s + parseFloat(t.attributes.volume_in_usd), 0)
  const buyVol    = buys.reduce((s, t)  => s + parseFloat(t.attributes.volume_in_usd), 0)
  const sellVol   = sells.reduce((s, t) => s + parseFloat(t.attributes.volume_in_usd), 0)

  const uniqueWallets = new Set(trades.map((t) => t.attributes.tx_from_address)).size

  const visible = filter === 'all' ? trades
    : filter === 'buy'  ? buys
    : sells

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-brown">Smart Money Tracker</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Live on-chain trade activity · WETH / USDT pool · Ethereum
          </p>
          <p className="text-xs text-text-muted mt-0.5 font-mono">{truncateAddress(POOL_ADDRESS)}</p>
        </div>

        <button
          onClick={() => fetchTrades(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-divider bg-surface text-text-secondary hover:text-text-primary hover:bg-background transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── Stats ── */}
      {!loading && !error && trades.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Volume"    value={formatUsd(totalVol.toString())} sub={`${trades.length} trades`} />
          <StatCard label="Buy Volume"      value={formatUsd(buyVol.toString())}   sub={`${buys.length} buys`}   accent="text-positive" />
          <StatCard label="Sell Volume"     value={formatUsd(sellVol.toString())}  sub={`${sells.length} sells`} accent="text-negative" />
          <StatCard label="Unique Wallets"  value={uniqueWallets.toString()}        sub="active traders" />
        </div>
      )}

      {/* ── Filter tabs ── */}
      {!loading && !error && trades.length > 0 && (
        <div className="flex items-center gap-1 border-b border-divider">
          {(['all', 'buy', 'sell'] as FilterKind[]).map((f) => {
            const count = f === 'all' ? trades.length : f === 'buy' ? buys.length : sells.length
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                  filter === f
                    ? f === 'buy'  ? 'border-positive text-positive'
                    : f === 'sell' ? 'border-negative text-negative'
                    : 'border-pink text-pink'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {f === 'all' ? 'All' : f === 'buy' ? 'Buys' : 'Sells'}
                <span className="ml-1.5 text-xs opacity-60">{count}</span>
              </button>
            )
          })}

          {lastRefresh && (
            <span className="ml-auto text-xs text-text-muted pb-2">
              Updated {timeAgo(lastRefresh.toISOString())}
            </span>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <svg className="w-6 h-6 text-pink animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-text-muted">Loading trades…</span>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <svg className="w-8 h-8 text-negative/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-text-secondary">{error}</p>
          <button onClick={() => fetchTrades()} className="text-xs text-pink hover:underline">Try again</button>
        </div>
      )}

      {/* ── Trade table ── */}
      {!loading && !error && visible.length > 0 && (
        <div className="border border-divider rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_120px_120px_100px_80px] gap-3 px-4 py-2.5 bg-surface border-b border-divider text-xs text-text-muted font-medium uppercase tracking-wide">
            <span>Wallet</span>
            <span>Type</span>
            <span>From</span>
            <span>To</span>
            <span className="text-right">Volume</span>
            <span className="text-right">Time</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-divider">
            {visible.map((trade) => {
              const a = trade.attributes
              const fromSymbol = TOKEN_LABELS[a.from_token_address] ?? truncateAddress(a.from_token_address)
              const toSymbol   = TOKEN_LABELS[a.to_token_address]   ?? truncateAddress(a.to_token_address)
              const etherscanBase = 'https://etherscan.io'

              return (
                <div
                  key={trade.id}
                  className="grid grid-cols-[1fr_80px_120px_120px_100px_80px] gap-3 px-4 py-3 items-center hover:bg-surface/60 transition-colors text-sm"
                >
                  {/* Wallet */}
                  <a
                    href={`${etherscanBase}/address/${a.tx_from_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-text-secondary hover:text-pink transition-colors truncate"
                  >
                    {truncateAddress(a.tx_from_address)}
                  </a>

                  {/* Type */}
                  <KindBadge kind={a.kind} />

                  {/* From */}
                  <span className="text-xs text-text-primary">
                    {formatAmount(a.from_token_amount)}{' '}
                    <span className="text-text-muted">{fromSymbol}</span>
                  </span>

                  {/* To */}
                  <span className="text-xs text-text-primary">
                    {formatAmount(a.to_token_amount)}{' '}
                    <span className="text-text-muted">{toSymbol}</span>
                  </span>

                  {/* Volume */}
                  <span className={`text-xs font-medium text-right ${a.kind === 'buy' ? 'text-positive' : 'text-negative'}`}>
                    {formatUsd(a.volume_in_usd)}
                  </span>

                  {/* Time + tx link */}
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs text-text-muted">{timeAgo(a.block_timestamp)}</span>
                    <a
                      href={`${etherscanBase}/tx/${a.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-text-muted hover:text-pink transition-colors"
                    >
                      {truncateHash(a.tx_hash)}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && visible.length === 0 && trades.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-text-muted">No {filter} trades in this batch.</p>
          <button onClick={() => setFilter('all')} className="text-xs text-pink hover:underline">Show all</button>
        </div>
      )}

      {/* ── Pool info footer ── */}
      {!loading && !error && trades.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-text-muted pt-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span>
            Data from CoinGecko · Pool{' '}
            <a
              href={`https://etherscan.io/address/${POOL_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono hover:text-pink transition-colors"
            >
              {truncateAddress(POOL_ADDRESS)}
            </a>
            {' '}on Ethereum Mainnet
          </span>
        </div>
      )}
    </div>
  )
}
