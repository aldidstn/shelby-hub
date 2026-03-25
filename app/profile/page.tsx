'use client'

import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { type Report } from '../reports/_lib/types'
import { UploadModal } from '../reports/_components/UploadModal'
import { downloadShelbyBlob } from '../reports/_lib/download'
import { ShelbyBlobClient } from '@shelby-protocol/sdk/browser'

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF', md: 'Markdown', csv: 'CSV', json: 'JSON',
  mp4: 'MP4', webm: 'WebM', mov: 'MOV',
  mp3: 'MP3', wav: 'WAV', ogg: 'OGG', txt: 'Text',
}

export default function ProfilePage() {
  const { connected, account, signAndSubmitTransaction } = useWallet()

  const [uploadedReports, setUploadedReports] = useState<Report[]>([])
  const [copied, setCopied] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Report | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('shelby_uploaded_reports')
      if (raw) setUploadedReports(JSON.parse(raw) as Report[])
    } catch {}
  }, [])

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
    setUploadedReports((prev) => {
      const next = [report, ...prev]
      try { sessionStorage.setItem('shelby_uploaded_reports', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function saveEdit() {
    if (!editTarget) return
    const updated = uploadedReports.map((r) =>
      r.id === editTarget.id ? { ...r, title: editTitle, description: editDesc } : r
    )
    setUploadedReports(updated)
    try { sessionStorage.setItem('shelby_uploaded_reports', JSON.stringify(updated)) } catch {}
    setEditTarget(null)
  }

  async function confirmDelete() {
    if (!deleteTarget?.blobName) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const payload = ShelbyBlobClient.createDeleteBlobPayload({ blobName: deleteTarget.blobName })
      await signAndSubmitTransaction({ data: payload })
      const updated = uploadedReports.filter((r) => r.id !== deleteTarget.id)
      setUploadedReports(updated)
      try { sessionStorage.setItem('shelby_uploaded_reports', JSON.stringify(updated)) } catch {}
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDownload(report: Report) {
    if (!report.blobAccount || !report.blobName) return
    setDownloadingId(report.id)
    await downloadShelbyBlob(report.blobAccount, report.blobName, `${report.title}.${report.fileType}`, report.network ?? 'testnet')
    setDownloadingId(null)
  }

  if (!connected || !account) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-20 flex flex-col items-center gap-4">
        <svg className="w-12 h-12 text-divider" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        <p className="text-sm text-text-secondary">Connect your wallet to view your profile</p>
        <Link href="/reports" className="text-xs text-pink hover:underline">Go to Reports</Link>
      </div>
    )
  }

  const address = account.address.toString()

  return (
    <>
      <div className="max-w-screen-xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Profile header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-pink-light flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-lg font-semibold text-brown">My Profile</h1>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-text-secondary truncate">
                {address.slice(0, 20)}…{address.slice(-8)}
              </span>
              <button
                onClick={copyAddress}
                className="shrink-0 flex items-center gap-1 text-xs text-text-muted hover:text-pink transition-colors"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-positive">Copied</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              <span className="text-xs text-text-muted">Testnet</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Uploads', value: uploadedReports.length },
            { label: 'Free files', value: uploadedReports.filter((r) => r.access === 'free').length },
            { label: 'Premium files', value: uploadedReports.filter((r) => r.access === 'premium').length },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 px-4 py-3 rounded-lg border border-divider bg-surface">
              <span className="text-xl font-semibold text-brown">{stat.value}</span>
              <span className="text-xs text-text-muted">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Uploaded files */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Uploaded Files</h2>
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1 text-xs text-pink hover:underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Upload new
            </button>
          </div>

          {uploadedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-divider rounded-xl">
              <svg className="w-10 h-10 text-divider" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-text-muted">No files uploaded yet</p>
              <button onClick={() => setUploadOpen(true)} className="text-xs text-pink hover:underline">Upload your first file</button>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-divider border border-divider rounded-xl overflow-hidden">
              {uploadedReports.map((report) => (
                <div key={report.id} className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-surface transition-colors">
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-pink-light text-pink uppercase">
                    {FILE_TYPE_LABELS[report.fileType] ?? report.fileType}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{report.title}</p>
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
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(report)}
                    className="shrink-0 flex items-center gap-1 text-xs text-text-muted hover:text-pink transition-colors px-2 py-1 rounded hover:bg-pink-light"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => { setDeleteTarget(report); setDeleteError(null) }}
                    className="shrink-0 flex items-center gap-1 text-xs text-text-muted hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-background border border-divider rounded-xl shadow-sm w-full max-w-sm mx-4 p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold text-text-primary">Delete file?</h2>
                <p className="text-xs text-text-muted">
                  <span className="font-medium text-text-secondary">{deleteTarget.title}</span> will be permanently removed from the Shelby network. This cannot be undone.
                </p>
              </div>
            </div>
            {deleteError && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{deleteError}</p>
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
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="bg-background border border-divider rounded-xl shadow-sm w-full max-w-md mx-4 p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Edit File</h2>
              <button onClick={() => setEditTarget(null)} className="text-text-muted hover:text-text-primary transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
