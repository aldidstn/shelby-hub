'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { type Report } from '../types/report'
import { downloadErrorMessage, downloadReport } from '@/features/reports/services/download'
import { useWalletSession } from '@/features/auth/useWalletSession'
import styles from './ReportCard.module.css'

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: styles.filePdf,
  md: styles.fileNeutral,
  csv: styles.typeNeutral,
  json: styles.fileJson,
}

const TYPE_COLORS: Record<string, string> = {
  Research: styles.typeResearch,
  Analysis: styles.typeAnalysis,
  Intel: styles.typeIntel,
  Document: styles.fileNeutral,
  Report: styles.typeNeutral,
}

interface ReportCardProps {
  report: Report
  purchased?: boolean
  walletConnected?: boolean
  onBuy: (report: Report) => void
}

export function ReportCard({ report, purchased = false, walletConnected = false, onBuy }: ReportCardProps) {
  const { account, signMessage } = useWallet()
  const { authenticate } = useWalletSession()
  const [copied, setCopied]         = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const hasBlobFile = Boolean(report.blobAccount && report.blobName)
  const isOwned = Boolean(report.owned)
  const isPurchased = Boolean(report.purchased || purchased)
  const isUnlocked = isOwned || isPurchased
  const canDownload = hasBlobFile && (report.access === 'free' || isUnlocked)

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
    setDownloadError(null)
    try {
      if (report.encryptionVersion === 'aes-256-gcm-v1') await authenticate()
      await downloadReport(report, report.encryptionVersion === 'ace-ibe-v1' && account?.publicKey ? {
        accountAddress: account.address.toString(),
        publicKey: account.publicKey,
        signMessage,
      } : undefined)
    } catch (error) {
      setDownloadError(downloadErrorMessage(error))
    } finally { setDownloading(false) }
  }

  return (
    <div className={`report-card ${styles.card}`}>

      {/* Top row — type badge + on-chain status + file type */}
      <div className={styles.topRow}>
        <div className={styles.badgeRow}>
          <span className={`${styles.badge} ${TYPE_COLORS[report.type] ?? styles.fileNeutral}`}>
            {report.type}
          </span>
          {report.onChain && (
            <span className={`${styles.badge} ${styles.onChain}`}>
              On-chain
            </span>
          )}
        </div>
        <span className={`${styles.fileBadge} ${FILE_TYPE_COLORS[report.fileType] ?? styles.fileNeutral}`}>
          {report.fileType}
        </span>
      </div>

      {/* Title + price badge */}
      <div className={styles.headingRow}>
        <h3 className={styles.title}>
          {report.access === 'premium' && !isUnlocked ? (
            <button type="button" onClick={() => onBuy(report)} className={styles.titleButton}>{report.title}</button>
          ) : (
            <Link href={`/reports/${encodeURIComponent(report.id)}`}>{report.title}</Link>
          )}
        </h3>
        {isOwned ? (
          <span className={`${styles.priceBadge} ${styles.purchased}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Owned
          </span>
        ) : isPurchased ? (
          <span className={`${styles.priceBadge} ${styles.purchased}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Purchased
          </span>
        ) : report.access === 'premium' ? (
          <span className={`${styles.priceBadge} ${styles.premium}`}>
            {report.price} APT
          </span>
        ) : (
          <span className={`${styles.priceBadge} ${styles.premium}`}>
            Free
          </span>
        )}
      </div>

      {/* Description */}
      <p className={styles.description}>
        {report.description}
      </p>

      {/* Footer */}
      <div className={styles.footer}>

        {/* Author + date */}
        <div className={styles.author}>
          <span className={styles.authorName}>{report.author}</span>
          <span className={styles.date}>
            {new Date(report.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day:   'numeric',
              year:  'numeric',
            })}
          </span>
        </div>

        {/* Actions: Share + Download/Buy */}
        <div className={styles.actions}>

          {/* Share */}
          <button
            onClick={handleShare}
            className={styles.iconButton}
            title={copied ? 'Link copied!' : 'Share'}
            aria-label={copied ? 'Link copied!' : 'Share report link'}
          >
            {copied ? (
              <svg key="check" className="w-3.5 h-3.5 text-pink animate-bounce-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
              disabled={downloading || (report.access === 'premium' && !walletConnected)}
              title={report.access === 'premium' && !walletConnected ? 'Connect wallet to download' : undefined}
              className={styles.primaryButton}
            >
              {downloading ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 transition-transform duration-150 group-hover/dl:translate-y-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {downloading ? 'Downloading…' : 'Download'}
            </button>
          )}

          {/* Buy (premium, not yet purchased) */}
          {report.access === 'premium' && !isUnlocked && (
            <button
              onClick={() => onBuy(report)}
              disabled={!walletConnected}
              title={!walletConnected ? 'Connect wallet to purchase' : undefined}
              className={styles.primaryButton}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Buy {report.price} APT
            </button>
          )}

        </div>
      </div>
      {downloadError && <p className={styles.errorMessage}>{downloadError}</p>}
    </div>
  )
}
