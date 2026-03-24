'use client'

import { useState } from 'react'
import { type Report } from '../_lib/types'
import { downloadShelbyBlob } from '../_lib/download'

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf:  'text-negative bg-red-50',
  md:   'text-text-secondary bg-surface',
  csv:  'text-positive bg-green-50',
  json: 'text-warning bg-yellow-50',
}

const TYPE_COLORS: Record<string, string> = {
  Research:     'bg-blue-50 text-blue-600',
  Analysis:     'bg-purple-50 text-purple-600',
  'Smart Money':'bg-pink-light text-pink',
  Document:     'bg-surface text-text-secondary',
  Report:       'bg-brown/10 text-brown',
}

interface ReportCardProps {
  report: Report
  purchased?: boolean
  onBuy: (report: Report) => void
}

export function ReportCard({ report, purchased = false, onBuy }: ReportCardProps) {
  const [copied, setCopied]         = useState(false)
  const [downloading, setDownloading] = useState(false)

  const hasBlobFile = Boolean(report.blobAccount && report.blobName)
  const canDownload = hasBlobFile && (report.access === 'free' || purchased)

  function handleShare() {
    const url = `${window.location.origin}/reports/${report.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleDownload() {
    if (!report.blobAccount || !report.blobName) return
    setDownloading(true)
    const fileName = `${report.title.toLowerCase().replace(/\s+/g, '-')}.${report.fileType}`
    await downloadShelbyBlob(report.blobAccount, report.blobName, fileName, report.network ?? 'testnet')
    setDownloading(false)
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-background border border-divider rounded-xl hover:border-pink/20 transition-colors duration-150">

      {/* Top row — type badge + on-chain status + file type */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[report.type] ?? 'bg-surface text-text-secondary'}`}>
            {report.type}
          </span>
          {report.onChain && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-positive/10 text-positive">
              On-chain
            </span>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium uppercase ${FILE_TYPE_COLORS[report.fileType] ?? 'bg-surface text-text-secondary'}`}>
          {report.fileType}
        </span>
      </div>

      {/* Title + price badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">
          {report.title}
        </h3>
        {purchased ? (
          <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-positive/10 text-positive border border-positive/20 whitespace-nowrap">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Purchased
          </span>
        ) : report.access === 'premium' ? (
          <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-light text-pink border border-pink/20 whitespace-nowrap">
            {report.price} APT
          </span>
        ) : (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-positive/10 text-positive border border-positive/20 whitespace-nowrap">
            Free
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
        {report.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-divider mt-auto">

        {/* Author + date */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-text-primary">{report.author}</span>
          <span className="text-xs text-text-muted">
            {new Date(report.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day:   'numeric',
              year:  'numeric',
            })}
          </span>
        </div>

        {/* Actions: Share + Download/Buy */}
        <div className="flex items-center gap-1">

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-text-muted hover:text-text-primary hover:bg-surface transition-colors duration-150"
            title={copied ? 'Link copied!' : 'Share'}
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            )}
          </button>

          {/* Download (free or purchased) */}
          {canDownload && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-pink text-white hover:opacity-90 active:opacity-80 transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {downloading ? 'Downloading…' : 'Download'}
            </button>
          )}

          {/* Buy (premium, not yet purchased) */}
          {report.access === 'premium' && !purchased && (
            <button
              onClick={() => onBuy(report)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-pink text-white hover:opacity-90 active:opacity-80 transition-opacity duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Buy {report.price} APT
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
