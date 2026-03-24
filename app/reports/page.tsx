'use client'

import { useState, useMemo, useEffect } from 'react'
import { FilterBar, type Filters } from './_components/FilterBar'
import { ReportCard } from './_components/ReportCard'
import { PurchaseModal } from './_components/PurchaseModal'
import { UploadModal } from './_components/UploadModal'
import { MOCK_REPORTS } from './_lib/mock-data'
import { type Report } from './_lib/types'

export default function ReportsPage() {
  const [filters, setFilters] = useState<Filters>({
    type: 'All',
    access: 'All',
    sortBy: 'latest',
  })
  const [uploadOpen, setUploadOpen]         = useState(false)
  const [buyTarget, setBuyTarget]           = useState<Report | null>(null)
  const [purchasedIds, setPurchasedIds]       = useState<Set<string>>(new Set())
  const [uploadedReports, setUploadedReports] = useState<Report[]>([])

  // Load persisted data after hydration to avoid server/client mismatch
  useEffect(() => {
    try {
      const ids = sessionStorage.getItem('shelby_purchased_ids')
      if (ids) setPurchasedIds(new Set(JSON.parse(ids) as string[]))
    } catch {}
    try {
      const reports = sessionStorage.getItem('shelby_uploaded_reports')
      if (reports) setUploadedReports(JSON.parse(reports) as Report[])
    } catch {}
  }, [])

  // Combine uploaded reports (prepended) with mock data
  const allReports = useMemo(() => [...uploadedReports, ...MOCK_REPORTS], [uploadedReports])

  const filtered = useMemo(() => {
    let result = [...allReports]

    if (filters.access !== 'All') {
      result = result.filter((r) => r.access === filters.access)
    }

    if (filters.type !== 'All') {
      result = result.filter((r) => r.type === filters.type)
    }

    switch (filters.sortBy) {
      case 'latest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'most-liked':
        result.sort((a, b) => b.likes - a.likes)
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
  }, [filters, allReports])

  const freeCount    = allReports.filter((r) => r.access === 'free').length
  const premiumCount = allReports.filter((r) => r.access === 'premium').length

  function handleUploadComplete(report: Report) {
    setUploadedReports((prev) => {
      const next = [report, ...prev]
      try { sessionStorage.setItem('shelby_uploaded_reports', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function handlePurchaseComplete(report: Report) {
    setPurchasedIds((prev) => {
      const next = new Set(prev).add(report.id)
      try { sessionStorage.setItem('shelby_purchased_ids', JSON.stringify([...next])) } catch {}
      return next
    })
    setBuyTarget(null)
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 flex flex-col gap-6">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-brown">Reports Library</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Research, analysis, and documents from the Shelby community
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-pink text-white hover:opacity-90 active:opacity-80 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Upload File
        </button>
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        totalCount={allReports.length}
        freeCount={freeCount}
        premiumCount={premiumCount}
      />

      {/* Results count */}
      <p className="text-xs text-text-muted -mt-2">
        {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
      </p>

      {/* Report grid */}
      {filtered.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              purchased={purchasedIds.has(report.id)}
              onBuy={(r) => setBuyTarget(r)}
            />
          ))}
        </div>
      )}

      {/* Purchase modal */}
      <PurchaseModal
        report={buyTarget}
        onClose={() => setBuyTarget(null)}
        onPurchaseComplete={handlePurchaseComplete}
      />

      {/* Upload modal */}
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  )
}
