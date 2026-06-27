'use client'

import { useState } from 'react'
import { downloadShelbyBlob, type DownloadStatus } from '../services/shelby-download'
import type { Report } from '../types/report'
import { downloadErrorMessage, downloadReport, type AceWalletSigner } from '@/features/reports/services/download'

interface ReaderActionsProps {
  initialLikes: number
  title: string
  fileType: string
  blobAccount?: string
  blobName?: string
  directUrl?: string   // when set, download button is a direct link to this URL
  report?: Report
  aceSigner?: AceWalletSigner
}

export function ReaderActions({
  initialLikes,
  title,
  fileType,
  blobAccount,
  blobName,
  directUrl,
  report,
  aceSigner,
}: ReaderActionsProps) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(initialLikes)
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleLike() {
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1))
      return !prev
    })
  }

  async function handleDownload() {
    if (!blobAccount || !blobName) {
      setErrorMsg('File is not available for download yet.')
      setDownloadStatus('error')
      setTimeout(() => setDownloadStatus('idle'), 3000)
      return
    }

    setDownloadStatus('loading')
    setErrorMsg(null)

    if (report) {
      try {
        await downloadReport(report, aceSigner)
        setDownloadStatus('success')
        setTimeout(() => setDownloadStatus('idle'), 3000)
      } catch (error) {
        setErrorMsg(downloadErrorMessage(error))
        setDownloadStatus('error')
      }
      return
    }
    const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}.${fileType}`
    const result = await downloadShelbyBlob(blobAccount, blobName, fileName)

    if (result.status === 'success') {
      setDownloadStatus('success')
      setTimeout(() => setDownloadStatus('idle'), 3000)
    } else {
      setErrorMsg(result.message ?? 'Download failed.')
      setDownloadStatus('error')
      setTimeout(() => setDownloadStatus('idle'), 4000)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* Like */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors duration-150 ${
            liked
              ? 'bg-pink text-white border-pink'
              : 'bg-background text-text-secondary border-divider hover:border-pink hover:text-pink'
          }`}
        >
          <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {likeCount.toLocaleString()}
        </button>

        {/* Download — direct link when blobUrl provided, otherwise fetch-based */}
        {directUrl ? (
          <a
            href={directUrl}
            download={`${title.toLowerCase().replace(/\s+/g, '-')}.${fileType}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brown text-white hover:opacity-90 active:opacity-80 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </a>
        ) : (
          <button
            onClick={handleDownload}
            disabled={downloadStatus === 'loading'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              downloadStatus === 'success'
                ? 'bg-positive text-white'
                : downloadStatus === 'error'
                ? 'bg-negative/10 text-negative border border-negative/30'
                : 'bg-brown text-white hover:opacity-90 active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed'
            }`}
          >
            {downloadStatus === 'loading' ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Downloading…
              </>
            ) : downloadStatus === 'success' ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Downloaded
              </>
            ) : downloadStatus === 'error' ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Failed
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </>
            )}
          </button>
        )}
      </div>

      {/* Inline error message */}
      {downloadStatus === 'error' && errorMsg && (
        <p className="text-xs text-negative">{errorMsg}</p>
      )}
    </div>
  )
}
