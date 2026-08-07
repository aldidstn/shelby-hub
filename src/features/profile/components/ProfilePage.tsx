'use client'

import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { type Report } from '@/features/reports/types/report'
import { UploadModal } from '@/features/reports/components/UploadModal'
import { useWalletSession } from '@/features/auth/useWalletSession'
import { fetchReports } from '@/features/reports/services/api'
import { downloadErrorMessage, downloadReport } from '@/features/reports/services/download'
import { listLocalReports, mergeReportsWithLocal, removeLocalReport, upsertLocalReport } from '@/features/reports/services/local-catalog'
import { deactivateReportPayload, updateReportPayload } from '@/features/reports/services/registry'
import { useShelbyNetwork } from '@/features/network/NetworkProvider'
import { shelbyNetworkLabel } from '@/features/network/network'
import { ensureWalletNetwork } from '@/features/network/wallet-network'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import layout from '@/styles/layout.module.css'

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF', md: 'Markdown', csv: 'CSV', json: 'JSON',
  mp4: 'MP4', webm: 'WebM', mov: 'MOV',
  mp3: 'MP3', wav: 'WAV', ogg: 'OGG', txt: 'Text',
}

type ProfileFilter = 'uploaded' | 'purchased'

export default function ProfilePage() {
  const {
    connected,
    account,
    wallet,
    network: walletNetwork,
    changeNetwork,
    signAndSubmitTransaction,
    signMessage,
  } = useWallet()
  const { authenticate } = useWalletSession()
  const { network } = useShelbyNetwork()
  const walletAddress = account?.address?.toString()

  const [uploadedReports, setUploadedReports] = useState<Report[]>([])
  const [purchasedReports, setPurchasedReports] = useState<Report[]>([])
  const [activeFilter, setActiveFilter] = useState<ProfileFilter>('uploaded')
  const [copied, setCopied] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Report | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!connected || !walletAddress) { setUploadedReports([]); setPurchasedReports([]); return }
    let cancelled = false
    const normalizedWalletAddress = walletAddress.toLowerCase()

    async function loadProfileReports() {
      setLoadError(null)
      try {
        let items: Report[]
        try {
          await authenticate()
          items = await fetchReports(false)
        } catch {
          // Production can run in legacy V1 mode without PostgreSQL-backed SIWA.
          // Profile reads are public catalog reads; write/delete actions still require wallet transactions.
          items = await fetchReports(false)
        }
        const merged = mergeReportsWithLocal(items, listLocalReports(normalizedWalletAddress))
        if (!cancelled) {
          setUploadedReports(merged.filter((report) => report.authorAddress.toLowerCase() === normalizedWalletAddress))
          setPurchasedReports(merged.filter((report) => Boolean(report.purchased) && report.authorAddress.toLowerCase() !== normalizedWalletAddress))
        }
      } catch (error) {
        if (!cancelled) {
          setUploadedReports([])
          setPurchasedReports([])
          setLoadError(error instanceof Error ? error.message : 'Unable to load your reports')
        }
      }
    }

    loadProfileReports()
    return () => { cancelled = true }
  }, [connected, walletAddress, authenticate])

  function copyAddress() {
    if (!account) return
    navigator.clipboard.writeText(account.address.toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openEdit(report: Report) {
    setEditTarget(report)
    setEditTitle(report.title)
    setEditDesc(report.description)
  }

  function handleUploadComplete(report: Report) {
    setUploadedReports((prev) => [{ ...report, owned: true }, ...prev])
    setActiveFilter('uploaded')
  }

  async function saveEdit() {
    if (!editTarget) return
    await ensureWalletNetwork({ target: editTarget.network ?? 'testnet', currentNetwork: walletNetwork, wallet, changeNetwork })
    await signAndSubmitTransaction({ data: updateReportPayload(editTarget, editTitle.trim(), editDesc.trim()) })
    const updated = uploadedReports.map((r) =>
      r.id === editTarget.id ? { ...r, title: editTitle, description: editDesc } : r
    )
    upsertLocalReport({ ...editTarget, title: editTitle, description: editDesc, owned: true }, account?.address.toString())
    setUploadedReports(updated)
    setEditTarget(null)
  }

  async function confirmDelete() {
    if (!deleteTarget?.blobName) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await ensureWalletNetwork({ target: deleteTarget.network ?? 'testnet', currentNetwork: walletNetwork, wallet, changeNetwork })
      await signAndSubmitTransaction({ data: deactivateReportPayload(deleteTarget) })
      const updated = uploadedReports.filter((r) => r.id !== deleteTarget.id)
      removeLocalReport(deleteTarget.id)
      setUploadedReports(updated)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Deactivation failed')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDownload(report: Report) {
    setDownloadingId(report.id)
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
    } finally { setDownloadingId(null) }
  }

  if (!connected || !account) {
    return (
      <div className={layout.centered}>
        <MaterialIcon name="person" size={48} className="text-divider" />
        <h1 className="text-lg font-semibold text-brown">Your profile</h1>
        <p className="text-sm text-text-secondary">Connect your wallet to view uploads and purchases.</p>
        <Link href="/reports" className="inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold text-pink hover:bg-pink-light">Browse reports</Link>
      </div>
    )
  }

  const address = account.address.toString()
  const networkUploads = uploadedReports.filter((report) => (report.network ?? 'testnet') === network)
  const networkPurchases = purchasedReports.filter((report) => (report.network ?? 'testnet') === network)
  const visibleReports = activeFilter === 'uploaded' ? networkUploads : networkPurchases
  const premiumUploads = networkUploads.filter((r) => r.access === 'premium').length
  const profileTabs = [
    { value: 'uploaded' as const, label: `Uploaded files (${networkUploads.length})` },
    { value: 'purchased' as const, label: `Purchased (${networkPurchases.length})` },
  ]

  return (
    <>
      <div className={layout.pageLoose}>

        {/* Profile header */}
        <div className="flex items-start">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-lg font-semibold text-brown">My Profile</h1>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-text-secondary truncate">
                {address.slice(0, 20)}…{address.slice(-8)}
              </span>
              <button
                onClick={copyAddress}
                className="shrink-0 flex items-center gap-1 text-xs text-text-muted hover:text-pink active:scale-95 transition-all duration-150"
              >
                {copied ? (
                  <>
                    <MaterialIcon key="check" name="check" size={14} className="text-positive animate-bounce-in" />
                    <span className="text-positive animate-fade-up">Copied!</span>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="content_copy" size={14} />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              <span className="text-xs text-text-muted">Storage: {shelbyNetworkLabel(network)}</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        {loadError && <div role="alert" className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-xs text-text-secondary">{loadError}</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Uploads', value: networkUploads.length },
            { label: 'Purchased', value: networkPurchases.length },
            { label: 'Premium uploads', value: premiumUploads },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 px-4 py-3 rounded-lg border border-divider bg-surface animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="text-xl font-semibold text-brown">{stat.value}</span>
              <span className="text-xs text-text-muted">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Files */}
        <div className="flex flex-col gap-3">
          {downloadError && (
            <div role="alert" className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-xs text-text-secondary">
              Download failed: {downloadError}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-divider bg-surface p-1">
              {profileTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveFilter(tab.value)}
                  aria-pressed={activeFilter === tab.value}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeFilter === tab.value
                      ? 'bg-pink-light text-pink border border-pink/20'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-pink px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink/20 transition-all duration-150 hover:opacity-90 active:scale-95"
            >
              <MaterialIcon name="add" size={16} />
              Upload File
            </button>
          </div>

          {visibleReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-divider rounded-xl">
              <MaterialIcon name="upload_file" size={40} className="text-divider" />
              <p className="text-sm text-text-muted">
                {activeFilter === 'uploaded' ? 'No files uploaded yet' : 'No purchased files yet'}
              </p>
              {activeFilter === 'uploaded' ? (
                <button onClick={() => setUploadOpen(true)} className="text-xs text-pink hover:underline">Upload your first file</button>
              ) : (
                <Link href="/reports" className="text-xs text-pink hover:underline">Browse paid reports</Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-divider border border-divider rounded-xl overflow-hidden">
              {visibleReports.map((report) => (
                <div key={report.id} className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-surface transition-colors">
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-pink-light text-pink uppercase">
                    {FILE_TYPE_LABELS[report.fileType] ?? report.fileType}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/reports/${encodeURIComponent(report.id)}`} className="text-sm font-medium text-text-primary truncate hover:text-pink">
                      {report.title}
                    </Link>
                    <p className="text-xs text-text-muted truncate">{report.description}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                    report.access === 'free'
                      ? 'bg-positive/10 text-positive'
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {report.access === 'free' ? 'Free' : `${report.price} APT`}
                  </span>
                  <span className="shrink-0 text-xs text-text-muted hidden sm:block">
                    {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>

                  {/* Download */}
                  <button
                    onClick={() => handleDownload(report)}
                    disabled={downloadingId === report.id || !report.blobAccount}
                    className="shrink-0 flex items-center gap-1 text-xs text-text-muted hover:text-pink transition-colors px-2 py-1 rounded hover:bg-pink-light disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Download"
                  >
                    {downloadingId === report.id ? (
                      <MaterialIcon name="progress_activity" size={14} className="animate-spin" />
                    ) : (
                      <MaterialIcon name="download" size={14} />
                    )}
                  </button>

                  {/* Edit */}
                  {activeFilter === 'uploaded' && (
                    <button
                      onClick={() => openEdit(report)}
                      className="shrink-0 flex items-center gap-1 text-xs text-text-muted hover:text-pink transition-colors px-2 py-1 rounded hover:bg-pink-light"
                      title="Edit"
                    >
                      <MaterialIcon name="mode_edit" size={14} />
                    </button>
                  )}

                  {/* Delete */}
                  {activeFilter === 'uploaded' && (
                    <button
                      onClick={() => { setDeleteTarget(report); setDeleteError(null) }}
                      className="shrink-0 flex items-center gap-1 text-xs text-text-muted hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                      title="Deactivate"
                    >
                      <MaterialIcon name="delete" size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload modal */}
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className={layout.modalBackdrop}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-background border border-divider rounded-xl shadow-2xl shadow-black/60 w-full max-w-sm mx-4 p-5 flex flex-col gap-4 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                <MaterialIcon name="delete" size={20} className="text-red-400" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold text-text-primary">Deactivate report?</h2>
                <p className="text-xs text-text-muted">
                  <span className="font-medium text-text-secondary">{deleteTarget.title}</span> will be removed from the marketplace. Its Shelby blob is retained so existing purchase records remain auditable.
                </p>
              </div>
            </div>
            {deleteError && (
              <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-md">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-1.5 rounded-md text-sm font-medium bg-red-500 text-white hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
              >
                {deleting && (
                  <MaterialIcon name="progress_activity" size={14} className="animate-spin" />
                )}
                {deleting ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div
          className={layout.modalBackdrop}
          onClick={() => setEditTarget(null)}
        >
          <div
            className="bg-background border border-divider rounded-xl shadow-2xl shadow-black/60 w-full max-w-md mx-4 p-5 flex flex-col gap-4 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Edit File</h2>
              <button onClick={() => setEditTarget(null)} className="text-text-muted hover:text-text-primary transition-colors">
                <MaterialIcon name="close" size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-9 px-3 text-sm bg-surface border border-divider rounded-md text-text-primary focus:outline-none focus:border-pink transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="px-3 py-2 text-sm bg-surface border border-divider rounded-md text-text-primary focus:outline-none focus:border-pink transition-colors resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEditTarget(null)}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!editTitle.trim()}
                className="px-4 py-1.5 rounded-md text-sm font-medium bg-pink text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
