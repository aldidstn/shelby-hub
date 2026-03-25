'use client'

import { type ReportAccess, type ReportType } from '../_lib/types'

export type SortBy = 'latest' | 'most-downloaded' | 'price-asc' | 'price-desc'

export interface Filters {
  type: ReportType | 'All'
  access: ReportAccess | 'All'
  sortBy: SortBy
}

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  totalCount: number
  freeCount: number
  premiumCount: number
}

const TYPES: Array<ReportType | 'All'> = ['All', 'Research', 'Analysis', 'Intel', 'Document', 'Report']

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'most-downloaded', label: 'Most Downloaded' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
]

export function FilterBar({ filters, onChange, totalCount, freeCount, premiumCount }: FilterBarProps) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-divider">

      {/* Left — access tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-divider w-fit">
        {(
          [
            { value: 'All', label: `All (${totalCount})` },
            { value: 'free', label: `Free (${freeCount})` },
            { value: 'premium', label: `Premium (${premiumCount})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            onClick={() => set('access', tab.value)}
            aria-pressed={filters.access === tab.value}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
              filters.access === tab.value
                ? 'bg-pink/10 text-pink border border-pink/20'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right — type chips + sort */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Type filter — horizontal scroll on mobile */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5 -mb-0.5 min-w-0 flex-1 sm:flex-none sm:flex-wrap">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => set('type', t)}
              aria-pressed={filters.type === t}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors duration-150 ${
                filters.type === t
                  ? 'bg-pink/10 text-pink border border-pink/20'
                  : 'bg-surface border border-divider text-text-secondary hover:text-text-primary hover:border-pink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block shrink-0 w-px h-5 bg-divider" />

        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) => set('sortBy', e.target.value as SortBy)}
          className="shrink-0 h-8 px-2 text-xs bg-surface border border-divider rounded-md text-text-secondary focus:outline-none focus:border-pink cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
