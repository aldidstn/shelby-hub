'use client'

import { type ReportAccess, type ReportType } from '../_lib/types'

export type SortBy = 'latest' | 'most-liked' | 'most-downloaded' | 'price-asc' | 'price-desc'

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

const TYPES: Array<ReportType | 'All'> = ['All', 'Research', 'Analysis', 'Smart Money', 'Document', 'Report']

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'most-liked', label: 'Most Liked' },
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
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 ${
              filters.access === tab.value
                ? 'bg-background text-text-primary shadow-sm border border-divider'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right — type chips + sort */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type filter */}
        <div className="flex flex-wrap gap-1">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => set('type', t)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors duration-150 ${
                filters.type === t
                  ? 'bg-pink text-white'
                  : 'bg-surface border border-divider text-text-secondary hover:text-text-primary hover:border-pink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-divider" />

        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) => set('sortBy', e.target.value as SortBy)}
          className="h-7 px-2 text-xs bg-surface border border-divider rounded-md text-text-secondary focus:outline-none focus:border-pink cursor-pointer"
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
