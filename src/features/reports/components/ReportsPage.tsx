'use client'

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { FilterBar, type Filters } from '@/features/reports/components/FilterBar'
import { ReportCard } from '@/features/reports/components/ReportCard'
import { PurchaseModal } from '@/features/purchases/components/PurchaseModal'
import { type Report } from '@/features/reports/types/report'
import { fetchReports } from '@/features/reports/services/api'
import { useWalletSession } from '@/features/auth/useWalletSession'
import layout from '@/styles/layout.module.css'

export default function ReportsPage() {
  return <Suspense><ReportsPageInner /></Suspense>
}

function ReportsPageInner() {
  const searchParams = useSearchParams()
  const urlQuery     = searchParams.get('q') ?? ''
  const { connected } = useWallet()
  const { authenticate } = useWalletSession()

  const PAGE_SIZE = 12

  const [filters, setFilters] = useState<Filters>({
    type: 'All',
    access: 'All',
    sortBy: 'latest',
  })
  const [page, setPage]         = useState(1)
  const [buyTarget, setBuyTarget]   = useState<Report | null>(null)
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set())

  // Reports from the on-chain registry
  const [registryReports, setRegistryReports] = useState<Report[]>([])
  const [registryLoading, setRegistryLoading] = useState(true)
  const [apiAvailable, setApiAvailable] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const loadRegistry = useCallback(async (mine = false) => {
    setRegistryLoading(true)
    setCatalogError(null)
    try {
      const reports = await fetchReports(mine)
      setRegistryReports(reports)
      setPurchasedIds(new Set(reports.filter((report) => report.purchased).map((report) => report.id)))
      setApiAvailable(true)
    } catch (error) {
      setApiAvailable(false)
      setCatalogError(error instanceof Error ? error.message : 'Live catalog unavailable')
    } finally {
      setRegistryLoading(false)
    }
  }, [])

  useEffect(() => { loadRegistry(false) }, [loadRegistry])

  useEffect(() => {
    if (!connected) return
    authenticate().then(() => loadRegistry(false)).catch(() => undefined)
  }, [connected, authenticate, loadRegistry])

  // Reset page on search/filter change
  useEffect(() => { setPage(1) }, [urlQuery])

  // All reports come from the live API/registry projection. Uploading belongs in Profile.
  const allReports = useMemo(() => apiAvailable ? registryReports : [], [registryReports, apiAvailable])

  const filtered = useMemo(() => {
    let result = [...allReports]

    if (urlQuery.trim()) {
      const q = urlQuery.trim().toLowerCase()
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.author.toLowerCase().includes(q) ||
          r.authorAddress.toLowerCase().includes(q) ||
          r.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    }

    if (filters.access === 'purchased') {
      result = result.filter((r) => r.purchased || purchasedIds.has(r.id))
    } else if (filters.access !== 'All') {
      result = result.filter((r) => r.access === filters.access)
    }

    if (filters.type !== 'All') {
      result = result.filter((r) => r.type === filters.type)
    }

    switch (filters.sortBy) {
      case 'latest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'most-downloaded':
        result.sort((a, b) => b.downloads - a.downloads)
        break
      case 'price-asc':
        result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
        break
      case 'price-desc':
        result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
        break
    }

    return result
  }, [filters, allReports, purchasedIds, urlQuery])

  const freeCount    = allReports.filter((r) => r.access === 'free').length
  const premiumCount = allReports.filter((r) => r.access === 'premium').length
  const purchasedCount = allReports.filter((r) => r.purchased || purchasedIds.has(r.id)).length

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleFiltersChange(next: Filters) {
    setFilters(next)
    setPage(1)
  }

  function handlePurchaseComplete(report: Report) {
    setPurchasedIds((prev) => {
      const next = new Set(prev).add(report.id)
      return next
    })
    setBuyTarget(null)
  }

  return (
    <div className={layout.page}>

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brown tracking-tight font-display">Reports Library</h1>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            Research, analysis, and documents from the Shelby community
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={handleFiltersChange}
        totalCount={allReports.length}
        freeCount={freeCount}
        premiumCount={premiumCount}
        purchasedCount={purchasedCount}
      />

      {catalogError && (
        <div role="status" className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-text-secondary">
          Live catalog unavailable: {catalogError}. Showing the reports that can be fetched from the current registry/API source.
        </div>
      )}

      {/* Registry loading skeleton */}
      {registryLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-surface border border-divider animate-pulse" />
          ))}
        </div>
      )}

      {/* Results count */}
      {!registryLoading && (
        <p className="text-xs text-text-muted -mt-2 flex items-center gap-2">
          {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
          {urlQuery.trim() && (
            <>
              <span>for <span className="text-text-primary font-medium">&ldquo;{urlQuery}&rdquo;</span></span>
              <Link href="/reports" className="text-pink hover:underline">Clear</Link>
            </>
          )}
        </p>
      )}

      {/* Report grid */}
      {!registryLoading && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-10 h-10 text-divider" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-text-muted">No reports match your filters</p>
            <button
              onClick={() => setFilters({ type: 'All', access: 'All', sortBy: 'latest' })}
              className="text-xs text-pink hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="report-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  purchased={purchasedIds.has(report.id) || report.purchased || report.owned}
                  walletConnected={connected}
                  onBuy={(r) => setBuyTarget(r)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-text-muted">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="flex items-center justify-center w-10 h-10 rounded-md border border-divider text-text-secondary hover:text-text-primary hover:bg-surface active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`flex items-center justify-center w-10 h-10 rounded-md text-xs font-medium transition-all duration-150 active:scale-95 ${
                        p === safePage
                          ? 'bg-pink/10 text-pink border border-pink/20'
                          : 'border border-divider text-text-secondary hover:text-text-primary hover:bg-surface'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="flex items-center justify-center w-10 h-10 rounded-md border border-divider text-text-secondary hover:text-text-primary hover:bg-surface active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )
      )}

      {/* Purchase modal */}
      {buyTarget && <PurchaseModal
        key={buyTarget.id}
        report={buyTarget}
        onClose={() => setBuyTarget(null)}
        onPurchaseComplete={handlePurchaseComplete}
      />}

    </div>
  )
}
