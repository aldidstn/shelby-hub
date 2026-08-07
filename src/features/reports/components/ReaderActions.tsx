'use client'

import { useState } from 'react'
import { downloadShelbyBlob, type DownloadStatus } from '../services/shelby-download'
import type { Report } from '../types/report'
import { downloadErrorMessage, downloadReport, type AceWalletSigner } from '@/features/reports/services/download'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

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
          <MaterialIcon name="favorite" size={18} />
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
            <MaterialIcon name="download" size={18} />
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
                <MaterialIcon name="progress_activity" size={18} className="animate-spin" />
                Downloading…
              </>
            ) : downloadStatus === 'success' ? (
              <>
                <MaterialIcon name="check" size={18} />
                Downloaded
              </>
            ) : downloadStatus === 'error' ? (
              <>
                <MaterialIcon name="close" size={18} />
                Failed
              </>
            ) : (
              <>
                <MaterialIcon name="download" size={18} />
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
