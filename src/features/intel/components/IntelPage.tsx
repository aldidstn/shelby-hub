'use client'

import { useEffect, useState, useCallback } from 'react'
import { truncateAddress, truncateHash } from '@/lib/format'
import { INTEL_PAGE_SIZE as PAGE_SIZE, POOL_ADDRESS, TOKEN_LABELS } from '../constants'
import { formatAmount, formatUsd, timeAgo } from '../lib/format'
import type { FilterKind, Trade } from '../types/trade'
import layout from '@/styles/layout.module.css'
import styles from './IntelPage.module.css'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

const ETHERSCAN_BASE = 'https://etherscan.io'

/* ─── Types ─────────────────────────────────────────────── */

/* ─── Sub-components ─────────────────────────────────────── */

function KindBadge({ kind }: { kind: 'buy' | 'sell' }) {
  return kind === 'buy' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-positive/10 text-positive hover:bg-positive/15 transition-colors cursor-default select-none">
      <MaterialIcon name="arrow_upward" size={12} />
      BUY
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-negative/10 text-negative hover:bg-negative/15 transition-colors cursor-default select-none">
      <MaterialIcon name="arrow_downward" size={12} />
      SELL
    </span>
  )
}

function StatCard({ label, value, sub, accent, delay = 0 }: { label: string; value: string; sub?: string; accent?: string; delay?: number }) {
  return (
    <div
      className="bg-surface border border-divider rounded-xl px-5 py-4 flex flex-col gap-1 animate-fade-up shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-[11px] font-medium text-text-muted uppercase tracking-widest">{label}</span>
      <span className={`text-2xl font-bold tracking-tight tabular ${accent ?? 'text-text-primary'}`}>{value}</span>
      {sub && <span className="text-xs text-text-muted mt-0.5">{sub}</span>}
    </div>
  )
}

function MobileTradeCard({ trade }: { trade: Trade }) {
  const a = trade.attributes
  const fromSymbol = TOKEN_LABELS[a.from_token_address] ?? truncateAddress(a.from_token_address)
  const toSymbol = TOKEN_LABELS[a.to_token_address] ?? truncateAddress(a.to_token_address)

  return (
    <article className={styles.mobileTrade} role="listitem">
      <div className={styles.mobileTradeHeader}>
        <a
          href={`${ETHERSCAN_BASE}/address/${a.tx_from_address}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.mobileWallet}
        >
          {truncateAddress(a.tx_from_address)}
        </a>
        <KindBadge kind={a.kind} />
      </div>

      <dl className={styles.mobileTradeDetails}>
        <div>
          <dt>From</dt>
          <dd>{formatAmount(a.from_token_amount)} <span>{fromSymbol}</span></dd>
        </div>
        <div>
          <dt>To</dt>
          <dd>{formatAmount(a.to_token_amount)} <span>{toSymbol}</span></dd>
        </div>
        <div>
          <dt>Volume</dt>
          <dd className={a.kind === 'buy' ? 'text-positive' : 'text-negative'}>{formatUsd(a.volume_in_usd)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{timeAgo(a.block_timestamp)}</dd>
        </div>
      </dl>

      <a
        href={`${ETHERSCAN_BASE}/tx/${a.tx_hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.mobileTransaction}
      >
        View transaction <MaterialIcon name="open_in_new" size={16} />
      </a>
    </article>
  )
}

/* ─── Page ───────────────────────────────────────────────── */

export default function IntelPage() {
  const [trades, setTrades]           = useState<Trade[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [filter, setFilter]           = useState<FilterKind>('all')
  const [page, setPage]               = useState(1)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing]   = useState(false)
  // Only animate rows on the initial data load, not on every page/filter change
  const [initialLoad, setInitialLoad] = useState(true)

  const fetchTrades = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res  = await fetch('/api/intel')
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

  // Clear initial-load flag after first batch of rows animate (~600ms)
  useEffect(() => {
    if (!loading && trades.length > 0 && initialLoad) {
      const t = setTimeout(() => setInitialLoad(false), 600)
      return () => clearTimeout(t)
    }
  }, [loading, trades.length, initialLoad])

  /* ── Derived stats ── */
  const buys  = trades.filter((t) => t.attributes.kind === 'buy')
  const sells = trades.filter((t) => t.attributes.kind === 'sell')

  const totalVol  = trades.reduce((s, t) => s + parseFloat(t.attributes.volume_in_usd), 0)
  const buyVol    = buys.reduce((s, t)  => s + parseFloat(t.attributes.volume_in_usd), 0)
  const sellVol   = sells.reduce((s, t) => s + parseFloat(t.attributes.volume_in_usd), 0)

  const uniqueWallets = new Set(trades.map((t) => t.attributes.tx_from_address)).size

  const visible   = filter === 'all' ? trades : filter === 'buy' ? buys : sells
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleFilterChange(f: FilterKind) {
    setFilter(f)
    setPage(1)
  }

  return (
    <div className={layout.page}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brown tracking-tight font-display">Intel</h1>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            Live on-chain trade activity · WETH / USDT pool · Ethereum
          </p>
          <p className="text-xs text-text-muted mt-0.5 font-mono tracking-wide">{truncateAddress(POOL_ADDRESS)}</p>
        </div>

        <button
          onClick={() => fetchTrades(true)}
          disabled={loading || refreshing}
          className="flex h-11 items-center gap-2 px-4 rounded-lg text-sm font-medium border border-divider bg-surface text-text-secondary hover:text-text-primary hover:bg-background active:scale-95 transition-all duration-150 disabled:opacity-50"
        >
          <MaterialIcon name="refresh" size={17} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── Stats ── */}
      {!loading && !error && trades.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Volume"   value={formatUsd(totalVol.toString())} sub={`${trades.length} trades`}  delay={0} />
          <StatCard label="Buy Volume"     value={formatUsd(buyVol.toString())}   sub={`${buys.length} buys`}    delay={60}  accent="text-positive" />
          <StatCard label="Sell Volume"    value={formatUsd(sellVol.toString())}  sub={`${sells.length} sells`}  delay={120} accent="text-negative" />
          <StatCard label="Unique Wallets" value={uniqueWallets.toString()}        sub="active traders"           delay={180} />
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
                onClick={() => handleFilterChange(f)}
                aria-pressed={filter === f}
                className={`h-11 px-4 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
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
          <MaterialIcon name="progress_activity" size={24} className="text-pink animate-spin" />
          <span className="text-sm text-text-muted">Loading trades…</span>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <MaterialIcon name="warning" size={32} className="text-negative/50" />
          <p className="text-sm text-text-secondary">{error}</p>
          <button onClick={() => fetchTrades()} className="inline-flex h-11 items-center px-3 text-sm font-medium text-pink hover:underline">Try again</button>
        </div>
      )}

      {/* ── Trade table ── */}
      {!loading && !error && visible.length > 0 && (
        <div className="border border-divider rounded-xl overflow-hidden bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
          <div role="table" aria-label="Trade history" className={styles.desktopTable}>
            {/* Table header */}
            <div role="rowgroup">
              <div role="row" className="grid grid-cols-[1fr_80px_120px_120px_100px_80px] gap-3 px-4 py-2.5 bg-surface border-b border-divider text-[11px] text-text-muted font-semibold uppercase tracking-widest min-w-[640px]">
                <span role="columnheader">Wallet</span>
                <span role="columnheader">Type</span>
                <span role="columnheader">From</span>
                <span role="columnheader">To</span>
                <span role="columnheader" className="text-right">Volume</span>
                <span role="columnheader" className="text-right">Time</span>
              </div>
            </div>

            {/* Rows */}
            <div role="rowgroup" className="divide-y divide-divider">
              {paginated.map((trade, i) => {
                const a = trade.attributes
                const fromSymbol    = TOKEN_LABELS[a.from_token_address] ?? truncateAddress(a.from_token_address)
                const toSymbol      = TOKEN_LABELS[a.to_token_address]   ?? truncateAddress(a.to_token_address)
                return (
                  <div
                    key={trade.id}
                    role="row"
                    className={`grid grid-cols-[1fr_80px_120px_120px_100px_80px] gap-3 px-4 py-3 items-center hover:bg-pink/5 transition-colors text-sm min-w-[640px] ${initialLoad ? 'animate-fade-up' : ''}`}
                    style={initialLoad ? { animationDelay: `${i * 25}ms` } : undefined}
                  >
                    {/* Wallet */}
                    <a
                      role="cell"
                      href={`${ETHERSCAN_BASE}/address/${a.tx_from_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-text-secondary hover:text-pink transition-colors truncate"
                    >
                      {truncateAddress(a.tx_from_address)}
                    </a>

                    {/* Type */}
                    <div role="cell"><KindBadge kind={a.kind} /></div>

                    {/* From */}
                    <span role="cell" className="text-xs text-text-primary">
                      {formatAmount(a.from_token_amount)}{' '}
                      <span className="text-text-muted">{fromSymbol}</span>
                    </span>

                    {/* To */}
                    <span role="cell" className="text-xs text-text-primary">
                      {formatAmount(a.to_token_amount)}{' '}
                      <span className="text-text-muted">{toSymbol}</span>
                    </span>

                    {/* Volume */}
                    <span role="cell" className={`text-xs font-medium text-right ${a.kind === 'buy' ? 'text-positive' : 'text-negative'}`}>
                      {formatUsd(a.volume_in_usd)}
                    </span>

                    {/* Time + tx link */}
                    <div role="cell" className="flex flex-col items-end gap-0.5">
                      <span className="text-xs text-text-muted">{timeAgo(a.block_timestamp)}</span>
                      <a
                        href={`${ETHERSCAN_BASE}/tx/${a.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-text-muted hover:text-pink transition-colors"
                      >
                        {truncateHash(a.tx_hash)}
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className={styles.mobileTrades} role="list" aria-label="Trade history">
            {paginated.map((trade) => <MobileTradeCard key={trade.id} trade={trade} />)}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className={`${styles.pagination} flex items-center justify-between px-4 py-3 border-t border-divider bg-surface`}>
              <span className="text-xs text-text-muted">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visible.length)} of {visible.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex items-center justify-center w-12 h-12 rounded-md border border-divider text-text-secondary hover:text-text-primary hover:bg-background active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <MaterialIcon name="chevron_left" size={18} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={p === safePage ? 'page' : undefined}
                    className={`${styles.pageNumber} flex items-center justify-center w-12 h-12 rounded-md text-xs font-medium transition-all duration-150 active:scale-95 ${
                      p === safePage
                        ? 'bg-pink/10 text-pink border border-pink/20'
                        : 'border border-divider text-text-secondary hover:text-text-primary hover:bg-background'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex items-center justify-center w-12 h-12 rounded-md border border-divider text-text-secondary hover:text-text-primary hover:bg-background active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <MaterialIcon name="chevron_right" size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty (no trades from API) ── */}
      {!loading && !error && trades.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <MaterialIcon name="monitoring" size={40} className="text-divider" />
          <p className="text-sm text-text-muted">No recent trades found for this pool</p>
          <button onClick={() => fetchTrades()} className="inline-flex h-11 items-center px-3 text-sm font-medium text-pink hover:underline">Refresh</button>
        </div>
      )}

      {/* ── Empty (filtered) ── */}
      {!loading && !error && visible.length === 0 && trades.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-text-muted">No {filter} trades in this batch.</p>
          <button onClick={() => handleFilterChange('all')} className="inline-flex h-11 items-center px-3 text-sm font-medium text-pink hover:underline">Show all</button>
        </div>
      )}

      {/* ── Pool info footer ── */}
      {!loading && !error && trades.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-text-muted pt-2">
          <MaterialIcon name="info" size={16} />
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
