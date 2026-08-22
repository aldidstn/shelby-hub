'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { WalletConnectDialog } from '@/components/wallet/WalletConnectDialog'
import { PurchaseModal } from '@/features/purchases/components/PurchaseModal'
import { useWalletSession } from '@/features/auth/useWalletSession'
import { downloadErrorMessage, downloadReport } from '@/features/reports/services/download'
import type { Report } from '@/features/reports/types/report'
import styles from './SharedReportPreview.module.css'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { trackReportDownloaded } from '@/lib/analytics'

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
  const [walletOpen, setWalletOpen] = useState(false)
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
      if (event.key === 'Escape' && !purchaseOpen && !walletOpen) router.push('/reports')
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [purchaseOpen, router, walletOpen])

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
      trackReportDownloaded(report, isOwner ? 'owner' : purchased ? 'purchaser' : 'free')
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
      {!purchaseOpen && !walletOpen && (
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
              {report.access === 'premium' && (
                <p className={styles.priceSubtitle}>Price <strong>{priceLabel}</strong></p>
              )}
            </div>
            <Link href="/reports" className={styles.closeButton} aria-label="Close preview">
              <MaterialIcon name="close" size={22} />
            </Link>
          </header>

          <div className={styles.badges} aria-label="File summary">
            <span className={styles.categoryBadge}>{report.type}</span>
            <span className={styles.fileBadge}>{report.fileType.toUpperCase()}</span>
            {report.access === 'free' && <span className={styles.freeBadge}>Free</span>}
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
                  <MaterialIcon name={downloading ? 'progress_activity' : 'download'} size={19} className={downloading ? 'animate-spin' : ''} />
                  {downloading ? 'Downloading…' : 'Download file'}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => connected ? setPurchaseOpen(true) : setWalletOpen(true)}
                >
                  <MaterialIcon name="lock" size={19} />
                  {connected ? `Buy ${report.price ?? 0} APT` : 'Connect wallet first'}
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

      <WalletConnectDialog
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        onConnected={() => setWalletOpen(false)}
      />
    </>
  )
}
