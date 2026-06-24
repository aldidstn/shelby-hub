'use client'

import { type ReportAccess, type ReportType } from '../types/report'
import styles from './FilterBar.module.css'

export type SortBy = 'latest' | 'most-downloaded' | 'price-asc' | 'price-desc'
export type AccessFilter = ReportAccess | 'All' | 'purchased'

export interface Filters {
  type: ReportType | 'All'
  access: AccessFilter
  sortBy: SortBy
}

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  totalCount: number
  freeCount: number
  premiumCount: number
  purchasedCount: number
}

const TYPES: Array<ReportType | 'All'> = ['All', 'Research', 'Analysis', 'Intel', 'Document', 'Report']

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'most-downloaded', label: 'Most Downloaded' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
]

export function FilterBar({ filters, onChange, totalCount, freeCount, premiumCount, purchasedCount }: FilterBarProps) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className={styles.bar}>

      {/* Left — access tabs */}
      <div className={styles.tabs}>
        {(
          [
            { value: 'All', label: `All (${totalCount})` },
            { value: 'free', label: `Free (${freeCount})` },
            { value: 'premium', label: `Premium (${premiumCount})` },
            { value: 'purchased', label: `Purchased (${purchasedCount})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            onClick={() => set('access', tab.value)}
            aria-pressed={filters.access === tab.value}
            className={`${styles.tab} ${filters.access === tab.value ? styles.selected : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right — type chips + sort */}
      <div className={styles.controls}>
        {/* Type filter — horizontal scroll on mobile */}
        <div className={styles.chips}>
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => set('type', t)}
              aria-pressed={filters.type === t}
              className={`${styles.chip} ${filters.type === t ? styles.selected : ''}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) => set('sortBy', e.target.value as SortBy)}
          className={styles.select}
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
