'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { uploadToShelby, type UploadStep, type UploadProgress } from '../services/upload'
import type { Report } from '../types/report'
import { useWalletSession } from '@/features/auth/useWalletSession'
import { sha256Base64, toArrayBuffer } from '@/features/reports/services/encryption'
import { finalizeReport, prepareReport } from '@/features/reports/services/api'
import { registerLegacyReportPayload, registerReportPayload, verifyReportRegistration } from '@/features/reports/services/registry'
import { encryptReportWithAce } from '@/lib/ace/reports'
import layout from '@/styles/layout.module.css'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES: Record<string, { label: string }> = {
  'application/pdf':  { label: 'PDF'      },
  'text/markdown':    { label: 'Markdown' },
  'text/plain':       { label: 'Text'     },
  'application/json': { label: 'JSON'     },
  'text/csv':         { label: 'CSV'      },
  'video/mp4':        { label: 'MP4'      },
  'video/webm':       { label: 'WebM'     },
  'video/quicktime':  { label: 'MOV'      },
  'audio/mpeg':       { label: 'MP3'      },
  'audio/wav':        { label: 'WAV'      },
  'audio/ogg':        { label: 'OGG'      },
}

const ACCEPT_ATTR = Object.keys(ACCEPTED_TYPES).join(',')

const EXPIRY_PRESETS = [
  { label: '7 days',  ms: 7   * 24 * 60 * 60 * 1000 },
  { label: '30 days', ms: 30  * 24 * 60 * 60 * 1000 },
  { label: '90 days', ms: 90  * 24 * 60 * 60 * 1000 },
  { label: '1 year',  ms: 365 * 24 * 60 * 60 * 1000 },
]

const REPORT_TYPES: Report['type'][] = ['Research', 'Analysis', 'Intel', 'Document', 'Report']

const STEP_LABELS: Record<UploadStep, string> = {
  idle:        'Waiting',
  reading:     'Reading file…',
  generating:  'Generating commitments…',
  registering: 'Registering on-chain…',
  uploading:   'Uploading to Shelby…',
  publishing:  'Publishing to registry…',
  done:        'Upload complete',
  error:       'Upload failed',
}

const UPLOAD_STEPS: UploadStep[] = [
  'reading', 'generating', 'registering', 'uploading', 'publishing', 'done',
]

const MIME_TO_FILE_TYPE: Record<string, Report['fileType']> = {
  'application/pdf':  'pdf',
  'text/markdown':    'md',
  'text/plain':       'txt',
  'application/json': 'json',
  'text/csv':         'csv',
  'video/mp4':        'mp4',
  'video/webm':       'webm',
  'video/quicktime':  'mov',
  'audio/mpeg':       'mp3',
  'audio/wav':        'wav',
  'audio/ogg':        'ogg',
}

const HAS_REGISTRY_V2 = Boolean(process.env.NEXT_PUBLIC_REGISTRY_V2_ADDRESS)

type UploadCapabilities = {
  uploads?: {
    free?: boolean
    premium?: boolean
  }
  ace?: {
    configured?: boolean
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9.\-/]/g, '')
}

// ─── File type icon ───────────────────────────────────────────────────────────
function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('video/')) {
    return (
      <svg className="w-10 h-10 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    )
  }
  if (mimeType.startsWith('audio/')) {
    return (
      <svg className="w-10 h-10 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
      </svg>
    )
  }
  if (mimeType === 'text/csv') {
    return (
      <svg className="w-10 h-10 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 9.375v1.5m1.5-3.75C19.496 8.25 20 8.754 20 9.375v1.5m0 0v5.25m0-5.25C20 8.754 19.496 8.25 18.875 8.25h-1.5m1.625 8.25-1.5-.75m0 0v-3m0 3c0 .621-.504 1.125-1.125 1.125h-7.5A1.125 1.125 0 018.25 18v-3m9.375 0H8.25m9.375 0v3M8.25 15v3" />
      </svg>
    )
  }
  if (mimeType === 'application/json') {
    return (
      <svg className="w-10 h-10 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    )
  }
  return (
    <svg className="w-10 h-10 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void
  onUploadComplete: (report: Report) => void
}

export function UploadModal({ onClose, onUploadComplete }: UploadModalProps) {
  const { connected, account, wallets, connect, signAndSubmitTransaction } = useWallet()
  const { authenticate } = useWalletSession()

  // File
  const [file, setFile]         = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)

  // Metadata fields
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [reportType, setReportType] = useState<Report['type']>('Research')
  const [tags, setTags]             = useState('')

  // Upload options
  const [blobName, setBlobName] = useState('')
  const [expiryMs, setExpiryMs] = useState(EXPIRY_PRESETS[1].ms)
  const [network, setNetwork]   = useState<'shelbynet' | 'testnet'>('testnet')
  const [access, setAccess]     = useState<'free' | 'premium'>('free')
  const [price, setPrice]       = useState('')

  // State
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [txHash, setTxHash]     = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)
  const [premiumUploadsAvailable, setPremiumUploadsAvailable] = useState(HAS_REGISTRY_V2)

  const inputRef  = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const isUploading = progress !== null && progress.step !== 'done' && progress.step !== 'error'
  const isDone      = progress?.step === 'done'
  const isError     = progress?.step === 'error'
  const fileInfo    = file ? ACCEPTED_TYPES[file.type] : null

  // Focus trap
  useEffect(() => {
    if (!dialogRef.current) return
    const el = dialogRef.current
    const focusable = () => el.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    focusable()[0]?.focus()

    function trap(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const nodes = focusable()
      const first = nodes[0]
      const last  = nodes[nodes.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus() }
      }
    }

    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [onClose, file, progress])

  useEffect(() => {
    let cancelled = false
    fetch('/api/system/capabilities', { cache: 'no-store' })
      .then(async (response) => response.ok ? await response.json() as UploadCapabilities : null)
      .then((capabilities) => {
        if (!cancelled) setPremiumUploadsAvailable(Boolean(capabilities?.uploads?.premium))
      })
      .catch(() => {
        if (!cancelled) setPremiumUploadsAvailable(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!premiumUploadsAvailable && access === 'premium' && !isUploading) {
      setAccess('free')
      setPrice('')
    }
  }, [access, isUploading, premiumUploadsAvailable])

  function handleFile(f: File) {
    setFile(f)
    setProgress(null)
    setTxHash(null)
    setAccess('free')
    setPrice('')
    const ext   = f.name.split('.').pop() ?? ''
    const owner = account?.address?.toString().slice(0, 8) ?? 'me'
    const base  = f.name.replace(`.${ext}`, '')
    setBlobName(`${owner}/${slugify(base)}.${ext}`)
    // Pre-fill title from filename
    if (!title) setTitle(base.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, title])

  async function handleUpload() {
    if (!file || !connected || !account) return

    const selectedFile = file
    setProgress({ step: 'reading', uploadedBytes: 0, totalBytes: selectedFile.size })
    const walletAddress = account.address.toString()
    const parsedPrice  = access === 'premium' ? parseFloat(price) : 0
    const priceOctas   = isNaN(parsedPrice) || parsedPrice <= 0 ? 0 : Math.round(parsedPrice * 1e8)
    const parsedTags   = tags.split(',').map(t => t.trim()).filter(Boolean)
    const displayTitle = title.trim() || selectedFile.name.replace(/\.[^.]+$/, '')
    const authorName   = `${walletAddress.slice(0, 10)}…`
    const fileType     = MIME_TO_FILE_TYPE[selectedFile.type] ?? 'pdf'

    async function uploadFreeDirectly() {
      const result = await uploadToShelby({
        file: selectedFile,
        blobName,
        expirationMs: expiryMs,
        network,
        walletAddress,
        signAndSubmit: (payload) =>
          signAndSubmitTransaction(payload as Parameters<typeof signAndSubmitTransaction>[0]),
        onProgress: setProgress,
      })

      setProgress({ step: 'publishing', uploadedBytes: 0, totalBytes: 0 })
      const legacyPayload = registerLegacyReportPayload({
        blobAccount: walletAddress,
        blobName: result.blobName,
        network,
        title: displayTitle,
        description: description.trim(),
        reportType,
        priceOctas: 0,
        fileType,
        tags: parsedTags,
        author: authorName,
      })
      const registration = legacyPayload
        ? await signAndSubmitTransaction({ data: legacyPayload })
        : null
      const transactionHash = registration?.hash ?? result.id

      setTxHash(transactionHash)
      setProgress({ step: 'done', uploadedBytes: selectedFile.size, totalBytes: selectedFile.size })
      onUploadComplete({
        id: `${result.blobAccount}/${result.blobName}`,
        title: displayTitle,
        description: description.trim(),
        type: reportType,
        access: 'free',
        likes: 0,
        downloads: 0,
        author: authorName,
        authorAddress: walletAddress,
        createdAt: new Date().toISOString(),
        onChain: Boolean(legacyPayload),
        fileType,
        tags: parsedTags,
        blobAccount: result.blobAccount,
        blobName: result.blobName,
        network,
      })
    }

    async function uploadPremiumWithAce() {
      if (!premiumUploadsAvailable) throw new Error('Paid uploads require Registry V2 and ACE to be configured.')

      const reportId = crypto.randomUUID()

      setProgress({ step: 'generating', uploadedBytes: 0, totalBytes: selectedFile.size })
      const plaintext = new Uint8Array(await selectedFile.arrayBuffer())
      const ciphertext = await encryptReportWithAce({ reportId, plaintext })
      const cipherHash = await sha256Base64(ciphertext)
      const uploadBlobName = `${blobName}.ace`
      const uploadFile = new File([toArrayBuffer(ciphertext)], `${selectedFile.name}.ace`, { type: 'application/octet-stream' })

      const result = await uploadToShelby({
        file: uploadFile,
        blobName: uploadBlobName,
        expirationMs: expiryMs,
        network,
        walletAddress,
        signAndSubmit: (payload) =>
          signAndSubmitTransaction(payload as Parameters<typeof signAndSubmitTransaction>[0]),
        onProgress: setProgress,
      })

      setProgress({ step: 'publishing', uploadedBytes: 0, totalBytes: 0 })
      const registration = await signAndSubmitTransaction({ data: registerReportPayload({
        id: reportId,
        blobName: result.blobName,
        network,
        title: displayTitle,
        description: description.trim(),
        reportType,
        access: 'premium',
        priceOctas,
        fileType,
        tags: parsedTags,
        cipherHash,
        encryptionVersion: 2,
      }) })

      await verifyReportRegistration({
        transactionHash: registration.hash,
        reportId,
        ownerAddress: walletAddress,
        blobName: result.blobName,
        access: 'premium',
        priceOctas,
        cipherHash,
        encryptionVersion: 2,
      })

      const now = new Date().toISOString()
      setTxHash(registration.hash)
      setProgress({ step: 'done', uploadedBytes: selectedFile.size, totalBytes: selectedFile.size })
      onUploadComplete({
        id: reportId,
        title: displayTitle,
        description: description.trim(),
        type: reportType,
        access: 'premium',
        price: priceOctas / 1e8,
        likes: 0,
        downloads: 0,
        author: authorName,
        authorAddress: walletAddress,
        createdAt: now,
        onChain: true,
        fileType,
        tags: parsedTags,
        blobAccount: walletAddress,
        blobName: result.blobName,
        network,
        encryptionVersion: 'ace-ibe-v1',
        cipherHash,
        owned: true,
        active: true,
      })
    }

    let secureStage: 'auth' | 'prepare' | 'encrypt' | 'upload' | 'publish' | 'finalize' = 'auth'

    try {
      if (access === 'premium') {
        await uploadPremiumWithAce()
        return
      }

      if (access === 'free' && !HAS_REGISTRY_V2) {
        await uploadFreeDirectly()
        return
      }

      secureStage = 'auth'
      await authenticate()
      secureStage = 'prepare'
      const prepared = await prepareReport({
        title: displayTitle, description: description.trim(), reportType, access,
        priceOctas, fileType, tags: parsedTags, network,
      })

      secureStage = 'upload'
      const result = await uploadToShelby({
        file: selectedFile,
        blobName,
        expirationMs: expiryMs,
        network,
        walletAddress,
        signAndSubmit: (payload) =>
          signAndSubmitTransaction(payload as Parameters<typeof signAndSubmitTransaction>[0]),
        onProgress: setProgress,
      })

      secureStage = 'publish'
      setProgress({ step: 'publishing', uploadedBytes: 0, totalBytes: 0 })
      const registration = await signAndSubmitTransaction({ data: registerReportPayload({
        id: prepared.id, blobName: result.blobName, network, title: displayTitle,
        description: description.trim(), reportType, access, priceOctas, fileType,
        tags: parsedTags, encryptionVersion: 0,
      }) })
      secureStage = 'finalize'
      const report = await finalizeReport(prepared.id, {
        blobName: result.blobName, transactionHash: registration.hash,
      })
      setTxHash(registration.hash)
      setProgress({ step: 'done', uploadedBytes: selectedFile.size, totalBytes: selectedFile.size })
      onUploadComplete(report)
    } catch (err: unknown) {
      if (access === 'free' && (secureStage === 'auth' || secureStage === 'prepare')) {
        try {
          await uploadFreeDirectly()
          return
        } catch (fallbackError: unknown) {
          const msg = fallbackError instanceof Error ? fallbackError.message : 'Unexpected error'
          setProgress((p) => p ? { ...p, step: 'error', errorMessage: msg } : null)
          return
        }
      }

      const msg = err instanceof Error ? err.message : 'Unexpected error'
      setProgress((p) => p ? { ...p, step: 'error', errorMessage: msg } : null)
    }
  }

  function handleCopyHash() {
    if (!txHash) return
    navigator.clipboard.writeText(txHash).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const canSubmit =
    !!file &&
    blobName.trim().length > 0 &&
    title.trim().length > 0 &&
    !isUploading &&
    !(access === 'premium' && !premiumUploadsAvailable) &&
    !(access === 'premium' && (!price || parseFloat(price) <= 0))

  return (
    <div
      className={layout.modalBackdrop}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        className="bg-background border border-divider rounded-2xl shadow-2xl shadow-black/60 w-full max-w-md flex flex-col gap-5 p-6 max-h-[90vh] overflow-y-auto animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 id="upload-modal-title" className="text-sm font-semibold text-text-primary">Upload File</h2>
            <p className="text-xs text-text-muted mt-0.5">Published on Shelby · indexed on-chain</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        {!isDone && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop file here or click to browse"
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() }
            }}
            className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              dragging
                ? 'border-pink bg-pink-light'
                : file
                ? 'border-positive bg-positive/5'
                : 'border-divider hover:border-pink/50 hover:bg-surface'
            }`}
          >
            <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="sr-only" onChange={handleInputChange} tabIndex={-1} />
            {file ? (
              <>
                <FileTypeIcon mimeType={file.type} />
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary line-clamp-1">{file.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">{fileInfo?.label ?? 'File'} · {formatBytes(file.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setBlobName(''); setTitle('') }}
                  className="text-xs text-text-muted hover:text-negative transition-colors"
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-surface border border-divider flex items-center justify-center">
                  <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary">Drop file here</p>
                  <p className="text-xs text-text-muted mt-0.5">or click to browse</p>
                </div>
                <div className="flex flex-wrap justify-center gap-1">
                  {['PDF', 'MD', 'CSV', 'JSON', 'MP4', 'MP3', 'WAV'].map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded text-xs bg-surface border border-divider text-text-muted">{t}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Form fields */}
        {file && !isDone && (
          <>
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-title" className="text-xs font-medium text-text-primary">
                Title <span className="text-negative">*</span>
              </label>
              <input
                id="report-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Report title"
                maxLength={120}
                disabled={isUploading}
                className="h-9 px-3 text-sm bg-surface border border-divider rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pink transition-colors disabled:opacity-50"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-description" className="text-xs font-medium text-text-primary">Description</label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of this report…"
                rows={2}
                maxLength={500}
                disabled={isUploading}
                className="px-3 py-2 text-sm bg-surface border border-divider rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pink transition-colors resize-none disabled:opacity-50"
              />
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-primary">Type</span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Report type">
                {REPORT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setReportType(t)}
                    disabled={isUploading}
                    aria-pressed={reportType === t}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
                      reportType === t
                        ? 'bg-pink text-white border-pink'
                        : 'bg-surface text-text-secondary border-divider hover:border-pink hover:text-pink'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-tags" className="text-xs font-medium text-text-primary">Tags</label>
              <input
                id="report-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="DeFi, Aptos, Research"
                disabled={isUploading}
                className="h-9 px-3 text-sm bg-surface border border-divider rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pink transition-colors disabled:opacity-50"
              />
              <p className="text-xs text-text-muted">Comma-separated</p>
            </div>

            {/* Blob name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="blob-name-input" className="text-xs font-medium text-text-primary">Blob name</label>
              <input
                id="blob-name-input"
                type="text"
                value={blobName}
                onChange={(e) => setBlobName(e.target.value)}
                placeholder="account/folder/filename.ext"
                className="h-9 px-3 text-sm bg-surface border border-divider rounded-lg text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-pink transition-colors"
                disabled={isUploading}
              />
              <p className="text-xs text-text-muted">Path on the Shelby network</p>
            </div>

            {/* Expiration */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-primary">Expiration</span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Expiration preset">
                {EXPIRY_PRESETS.map((p) => (
                  <button
                    key={p.ms}
                    onClick={() => setExpiryMs(p.ms)}
                    disabled={isUploading}
                    aria-pressed={expiryMs === p.ms}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
                      expiryMs === p.ms
                        ? 'bg-pink text-white border-pink'
                        : 'bg-surface text-text-secondary border-divider hover:border-pink hover:text-pink'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-muted">
                Expires: {new Date(Date.now() + expiryMs).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>

            {/* Network */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-primary">Network</span>
              <div className="flex gap-1.5" role="group" aria-label="Network selection">
                {(['testnet', 'shelbynet'] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setNetwork(n)}
                    disabled={isUploading}
                    aria-pressed={network === n}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
                      network === n
                        ? 'bg-pink text-white border-pink'
                        : 'bg-surface text-text-secondary border-divider hover:border-pink'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${n === 'shelbynet' ? 'bg-positive' : 'bg-warning'}`} />
                    {n === 'testnet' ? 'Testnet' : 'ShelbyNet'}
                  </button>
                ))}
              </div>
            </div>

            {/* Access / Pricing */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-primary">Access</span>
              <div className="flex gap-1.5" role="group" aria-label="Access level">
                <button
                  onClick={() => { setAccess('free'); setPrice('') }}
                  disabled={isUploading}
                  aria-pressed={access === 'free'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
                    access === 'free'
                      ? 'bg-positive text-white border-positive'
                      : 'bg-surface text-text-secondary border-divider hover:border-positive hover:text-positive'
                  }`}
                >
                  Free
                </button>
                <button
                  onClick={() => setAccess('premium')}
                  disabled={isUploading || !premiumUploadsAvailable}
                  aria-pressed={access === 'premium'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
                    access === 'premium'
                      ? 'bg-pink text-white border-pink'
                      : 'bg-surface text-text-secondary border-divider hover:border-pink hover:text-pink'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Paid
                </button>
              </div>
              {!premiumUploadsAvailable && (
                <p className="text-xs text-text-muted">
                  Paid uploads are temporarily disabled until Registry V2 and ACE are configured. Use Free to upload now.
                </p>
              )}
              {access === 'premium' && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="relative flex-1">
                    <label htmlFor="price-input" className="sr-only">Price in APT</label>
                    <input
                      id="price-input"
                      type="number" min="0.01" step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      disabled={isUploading}
                      className="w-full h-9 pl-3 pr-12 text-sm bg-surface border border-divider rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-pink transition-colors disabled:opacity-50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted" aria-hidden="true">APT</span>
                  </div>
                  <p className="text-xs text-text-muted whitespace-nowrap">price to unlock</p>
                </div>
              )}
              {access === 'free' && (
                <p className="text-xs text-text-muted">Anyone can view and download this file</p>
              )}
            </div>

            {/* Progress */}
            {progress && (
              <div className="flex flex-col gap-3 p-4 bg-surface rounded-xl border border-divider" aria-live="polite" aria-atomic="true">
                <div className="flex items-center gap-1">
                  {UPLOAD_STEPS.map((s, i) => {
                    const currentIdx = UPLOAD_STEPS.indexOf(progress.step as UploadStep)
                    const done    = i < currentIdx || progress.step === 'done'
                    const active  = s === progress.step
                    const upcoming = i > currentIdx && progress.step !== 'done'
                    return (
                      <div key={s} className="flex items-center gap-1 flex-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          done ? 'bg-positive text-white' : active ? 'bg-pink text-white' : upcoming ? 'bg-divider text-text-muted' : ''
                        }`}>
                          {done ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : active ? (
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          ) : (
                            <span>{i + 1}</span>
                          )}
                        </div>
                        {i < UPLOAD_STEPS.length - 1 && (
                          <div className={`h-px flex-1 ${done ? 'bg-positive' : 'bg-divider'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className={`text-xs font-medium ${isError ? 'text-negative' : 'text-text-primary'}`}>
                  {STEP_LABELS[progress.step]}
                </p>
                {progress.step === 'uploading' && progress.totalBytes > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="h-1.5 bg-divider rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((progress.uploadedBytes / progress.totalBytes) * 100)}>
                      <div
                        className="h-full bg-pink rounded-full transition-all duration-300"
                        style={{ width: `${Math.round((progress.uploadedBytes / progress.totalBytes) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-muted text-right">
                      {formatBytes(progress.uploadedBytes)} / {formatBytes(progress.totalBytes)}
                    </p>
                  </div>
                )}
                {isError && progress.errorMessage && (
                  <p className="text-xs text-negative">{progress.errorMessage}</p>
                )}
              </div>
            )}

            {/* Wallet gate / submit */}
            {!connected ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-text-muted text-center">Connect your wallet to upload</p>
                {wallets.map((w) => (
                  <button
                    key={w.name}
                    onClick={() => connect(w.name)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-divider hover:bg-surface text-sm text-text-primary transition-colors"
                  >
                    {w.icon && <Image src={w.icon} alt="" width={20} height={20} unoptimized className="w-5 h-5 rounded" />}
                    {w.name}
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={handleUpload}
                disabled={!canSubmit}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-pink text-white hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading…' : `Upload to ${network === 'testnet' ? 'Testnet' : 'ShelbyNet'}`}
              </button>
            )}
          </>
        )}

        {/* Success state */}
        {isDone && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-positive/10 flex items-center justify-center animate-bounce-in">
              <svg className="w-6 h-6 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center animate-fade-up">
              <p className="text-sm font-semibold text-text-primary">Upload Successful</p>
              <p className="text-xs text-text-muted mt-1">
                Your file is live on Shelby {network === 'testnet' ? 'Testnet' : 'ShelbyNet'} and indexed on-chain
              </p>
            </div>
            {txHash && (
              <div className="flex flex-col gap-2 w-full">
                <p className="text-xs text-text-muted text-center">Transaction</p>
                <div className="flex items-center gap-2 bg-surface border border-divider rounded-lg px-3 py-2">
                  <a
                    href={`https://explorer.aptoslabs.com/txn/${txHash}?network=${network}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-xs font-mono text-pink truncate hover:underline"
                    title={txHash}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {txHash.slice(0, 14)}…{txHash.slice(-10)}
                  </a>
                  <button
                    onClick={handleCopyHash}
                    className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
                    aria-label={copied ? 'Copied!' : 'Copy transaction hash'}
                  >
                    {copied ? (
                      <svg className="w-4 h-4 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <a
                    href={`https://explorer.aptoslabs.com/txn/${txHash}?network=${network}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
                    aria-label="View on Aptos Explorer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            )}
            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  setFile(null); setBlobName(''); setTitle(''); setDescription('')
                  setTags(''); setReportType('Research'); setProgress(null)
                  setTxHash(null); setAccess('free'); setPrice('')
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-divider text-text-secondary hover:bg-surface transition-colors"
              >
                Upload another
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-pink text-white hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
