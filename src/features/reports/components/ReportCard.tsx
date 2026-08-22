'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { type Report } from '../types/report'
import { downloadErrorMessage, downloadReport } from '@/features/reports/services/download'
import { useWalletSession } from '@/features/auth/useWalletSession'
import styles from './ReportCard.module.css'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { trackReportDownloaded, trackReportShared } from '@/lib/analytics'

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
    const url = `${window.location.origin}/reports/${encodeURIComponent(report.id)}`
    navigator.clipboard.writeText(url).then(() => {
      trackReportShared(report)
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
      trackReportDownloaded(report, isOwned ? 'owner' : isPurchased ? 'purchaser' : 'free')
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
            <MaterialIcon name="check" size={13} />
            Owned
          </span>
        ) : isPurchased ? (
          <span className={`${styles.priceBadge} ${styles.purchased}`}>
            <MaterialIcon name="check" size={13} />
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
              <MaterialIcon key="check" name="check" size={16} className="text-pink animate-bounce-in" />
            ) : (
              <MaterialIcon name="share" size={16} />
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
                <MaterialIcon name="progress_activity" size={16} className="animate-spin" />
              ) : (
                <MaterialIcon name="download" size={16} />
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
              <MaterialIcon name="lock" size={16} />
              Buy {report.price} APT
            </button>
          )}

        </div>
      </div>
      {downloadError && <p className={styles.errorMessage}>{downloadError}</p>}
    </div>
  )
}
