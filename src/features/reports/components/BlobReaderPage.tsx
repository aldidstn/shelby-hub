'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { ReaderActions } from './ReaderActions'
import { getBlobReadUrl } from '../services/shelby-download'
import type { Report } from '../types/report'
import { fetchReportBlob, type AceWalletSigner } from '@/features/reports/services/download'
import layout from '@/styles/layout.module.css'



const TEXT_TYPES   = new Set<Report['fileType']>(['md', 'txt', 'json', 'csv'])
const VIDEO_TYPES  = new Set<Report['fileType']>(['mp4', 'webm', 'mov'])
const AUDIO_TYPES  = new Set<Report['fileType']>(['mp3', 'wav', 'ogg'])

interface BlobReaderPageProps {
  report: Report
}

// ─── Minimal markdown renderer ────────────────────────────────────────────────
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      nodes.push(<h3 key={i} className="text-base font-semibold text-text-primary mt-3">{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      nodes.push(<h2 key={i} className="text-lg font-bold text-brown mt-5">{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      nodes.push(<h1 key={i} className="text-2xl font-bold text-brown mt-6">{line.slice(2)}</h1>)
    } else if (line.startsWith('> ')) {
      nodes.push(
        <blockquote key={i} className="border-l-2 border-pink pl-4 py-1 my-1">
          <p className="text-sm italic text-text-secondary leading-7">{line.slice(2)}</p>
        </blockquote>
      )
    } else if (line.match(/^-{3,}$/) || line.match(/^\*{3,}$/)) {
      nodes.push(<hr key={i} className="border-divider my-4" />)
    } else if (line.trim() === '') {
      nodes.push(<div key={i} className="h-2" />)
    } else {
      nodes.push(<p key={i} className="text-sm text-text-primary leading-7">{line}</p>)
    }

    i++
  }
  return nodes
}

export function BlobReaderPage({ report }: BlobReaderPageProps) {
  const { connected, account, signMessage } = useWallet()
  const { blobAccount = '', blobName = '', fileType, title, network = 'testnet' } = report
  const blobUrl = getBlobReadUrl(blobAccount, blobName, network)

  const [textContent, setTextContent]   = useState<string | null>(null)
  const [objectUrl, setObjectUrl]       = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [fetchError, setFetchError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let revoke: string | null = null
    const aceSigner: AceWalletSigner | undefined = report.encryptionVersion === 'ace-ibe-v1' && connected && account?.publicKey
      ? {
          accountAddress: account.address.toString(),
          publicKey: account.publicKey,
          signMessage,
      }
      : undefined

    async function loadReportBlob() {
      setLoading(true)
      setFetchError(null)
      setTextContent(null)
      setObjectUrl(null)

      try {
        const blob = await fetchReportBlob(report, aceSigner)
        if (cancelled) return
        if (TEXT_TYPES.has(fileType)) {
          setTextContent(await blob.text())
        } else {
          const url = URL.createObjectURL(blob)
          revoke = url
          setObjectUrl(url)
        }
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setFetchError(e instanceof Error ? e.message : 'Unable to load content')
        setLoading(false)
      }
    }

    void loadReportBlob()

    return () => {
      cancelled = true
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [account, blobUrl, connected, fileType, report, signMessage])

  return (
    <div className={layout.reader}>

      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col gap-1 w-56 shrink-0">
        <Link
          href="/reports"
          className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg bg-pink text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </Link>
      </aside>

      {/* Content area */}
      <article className="flex-1 min-w-0 max-w-2xl">

        {/* Back — mobile */}
        <Link
          href="/reports"
          className="lg:hidden inline-flex items-center gap-2 px-3 py-2 mb-6 rounded-lg bg-pink text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </Link>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-positive/10 text-positive border border-positive/20">
              {report.access === 'premium' ? 'Premium · Unlocked' : 'Free'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-positive/10 text-positive">
              On-chain
            </span>
          </div>
          <h1 className="text-3xl font-bold text-brown leading-tight mb-6">{title}</h1>

          {/* CTAs */}
          <div className="pb-6 border-b border-divider">
            <ReaderActions
              initialLikes={0}
              title={title}
              fileType={fileType}
              blobAccount={blobAccount}
              blobName={blobName}
              directUrl={report.encryptionVersion ? undefined : blobUrl}
              report={report}
              aceSigner={report.encryptionVersion === 'ace-ibe-v1' && connected && account?.publicKey ? {
                accountAddress: account.address.toString(),
                publicKey: account.publicKey,
                signMessage,
              } : undefined}
            />
          </div>
        </header>

        {/* Content */}
        <div className="flex flex-col gap-3">

          {loading && (
            <div className="flex items-center gap-2 text-sm text-text-muted py-8">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              Loading content from Shelby…
            </div>
          )}

          {fetchError && (
            <div className="flex flex-col gap-3 p-5 rounded-xl bg-surface border border-divider">
              <div className="flex items-center gap-2 text-text-secondary">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-sm font-medium">Content unavailable</p>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                This file could not be fetched from the Shelby network. It may still be propagating across nodes — try again in a moment, or download it directly.
              </p>
            </div>
          )}

          {/* Text / Markdown */}
          {TEXT_TYPES.has(fileType) && textContent !== null && (
            fileType === 'json' || fileType === 'csv' ? (
              <pre className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap font-mono bg-surface p-6 rounded-xl border border-divider overflow-x-auto">
                {textContent}
              </pre>
            ) : (
              <div className="flex flex-col gap-1">
                {renderMarkdown(textContent)}
              </div>
            )
          )}

          {/* Video */}
          {VIDEO_TYPES.has(fileType) && !fetchError && objectUrl && (
            <video
              src={objectUrl}
              controls
              className="w-full rounded-xl border border-divider max-h-[70vh]"
            />
          )}

          {/* Audio */}
          {AUDIO_TYPES.has(fileType) && !fetchError && objectUrl && (
            <div className="p-8 bg-surface rounded-xl border border-divider flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-pink-light flex items-center justify-center">
                <svg className="w-8 h-8 text-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-text-primary">{title}</p>
              <audio
                src={objectUrl}
                controls
                className="w-full"
              />
            </div>
          )}

          {/* PDF */}
          {fileType === 'pdf' && !fetchError && objectUrl && (
            <PdfViewer objectUrl={objectUrl} title={title} />
          )}

        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-divider">
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Library
          </Link>
        </footer>
      </article>
    </div>
  )
}

function PdfViewer({ objectUrl, title }: { objectUrl: string; title: string }) {
  return (
    <iframe
      src={objectUrl}
      className="w-full rounded-xl border border-divider"
      style={{ height: '80vh' }}
      title={title}
    />
  )
}
