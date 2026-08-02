'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { PurchaseModal } from '@/features/purchases/components/PurchaseModal'
import { useWalletSession } from '@/features/auth/useWalletSession'
import { downloadErrorMessage, downloadReport } from '@/features/reports/services/download'
import type { Report } from '@/features/reports/types/report'
import styles from './SharedReportPreview.module.css'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function shortAddress(value: string) {
  if (value.length <= 18) return value
  return `${value.slice(0, 10)}…${value.slice(-6)}`
}

export function SharedReportPreview({ report }: { report: Report }) {
  const router = useRouter()
  const { account, connected, signMessage } = useWallet()
  const { authenticate } = useWalletSession()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [purchased, setPurchased] = useState(Boolean(report.purchased))
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const walletAddress = account?.address?.toString()
  const isOwner = Boolean(report.owned || (walletAddress && walletAddress.toLowerCase() === report.authorAddress.toLowerCase()))
  const canDownload = report.access === 'free' || isOwner || purchased
  const priceLabel = report.access === 'free' ? 'Free' : `${report.price ?? 0} APT`
  const uploaderAddress = useMemo(() => shortAddress(report.authorAddress), [report.authorAddress])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !purchaseOpen) router.push('/reports')
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [purchaseOpen, router])

  async function handleDownload() {
    if (!report.blobAccount || !report.blobName) {
      setError('This file is not available on Shelby storage.')
      return
    }

    setDownloading(true)
    setError(null)
    try {
      if (report.encryptionVersion === 'aes-256-gcm-v1') await authenticate()
      await downloadReport(report, report.encryptionVersion === 'ace-ibe-v1' && account?.publicKey ? {
        accountAddress: account.address.toString(),
        publicKey: account.publicKey,
        signMessage,
      } : undefined)
    } catch (caught) {
      setError(downloadErrorMessage(caught))
    } finally {
      setDownloading(false)
    }
  }

  async function verifyExistingAccess() {
    setVerifying(true)
    setError(null)
    try {
      await authenticate()
      router.refresh()
    } catch (caught) {
      setError(downloadErrorMessage(caught))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <>
      {!purchaseOpen && (
        <div className={styles.overlay} onMouseDown={(event) => {
          if (event.currentTarget === event.target) router.push('/reports')
        }}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shared-report-title"
          aria-describedby="shared-report-description"
          tabIndex={-1}
          className={styles.dialog}
        >
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Shared file</p>
              <h1 id="shared-report-title" className={styles.title}>{report.title}</h1>
            </div>
            <Link href="/reports" className={styles.closeButton} aria-label="Close preview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
              </svg>
            </Link>
          </header>

          <div className={styles.badges} aria-label="File summary">
            <span className={styles.categoryBadge}>{report.type}</span>
            <span className={styles.fileBadge}>{report.fileType.toUpperCase()}</span>
            <span className={report.access === 'free' ? styles.freeBadge : styles.paidBadge}>{priceLabel}</span>
          </div>

          <p id="shared-report-description" className={styles.description}>
            {report.description || 'Open this file from Shelby storage.'}
          </p>

          <dl className={styles.metadata}>
            <div className={styles.metaItem}>
              <dt>File name</dt>
              <dd>{report.title}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>File type</dt>
              <dd>{report.fileType.toUpperCase()}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>Category</dt>
              <dd>{report.type}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>Price</dt>
              <dd>{priceLabel}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>Uploaded</dt>
              <dd><time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time></dd>
            </div>
            <div className={styles.metaItem}>
              <dt>Uploader</dt>
              <dd className={styles.uploader} title={report.authorAddress}>
                <span>{report.author}</span>
                <code>{uploaderAddress}</code>
              </dd>
            </div>
          </dl>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <footer className={styles.footer}>
            <Link href="/reports" className={styles.secondaryButton}>Back to library</Link>
            <div className={styles.actions}>
              {report.access === 'premium' && !canDownload && connected && (
                <button type="button" className={styles.verifyButton} onClick={verifyExistingAccess} disabled={verifying}>
                  {verifying ? 'Verifying…' : 'Already purchased? Verify'}
                </button>
              )}
              {canDownload ? (
                <button type="button" className={styles.primaryButton} onClick={handleDownload} disabled={downloading}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />
                  </svg>
                  {downloading ? 'Downloading…' : 'Download file'}
                </button>
              ) : (
                <button type="button" className={styles.primaryButton} onClick={() => setPurchaseOpen(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V8a5 5 0 0 1 10 0v3m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z" />
                  </svg>
                  Purchase for {report.price ?? 0} APT
                </button>
              )}
            </div>
          </footer>
        </div>
        </div>
      )}

      {purchaseOpen && (
        <PurchaseModal
          report={report}
          onClose={() => setPurchaseOpen(false)}
          onPurchaseComplete={() => {
            setPurchased(true)
            setPurchaseOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
