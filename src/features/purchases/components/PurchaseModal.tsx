'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { type Report } from '@/features/reports/types/report'
import { useWalletSession } from '@/features/auth/useWalletSession'
import { confirmPurchase } from '../services/api'
import { purchaseReportPayload } from '../services/registry'
import layout from '@/styles/layout.module.css'

type PurchaseState = 'idle' | 'confirm' | 'pending' | 'success' | 'error'

interface PurchaseModalProps {
  report: Report | null
  onClose: () => void
  onPurchaseComplete?: (report: Report) => void
}

export function PurchaseModal({ report, onClose, onPurchaseComplete }: PurchaseModalProps) {
  const { connected, account, signAndSubmitTransaction, wallets, connect } = useWallet()
  const [state, setState] = useState<PurchaseState>('confirm')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [walletPickerOpen, setWalletPickerOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const { authenticate } = useWalletSession()

  // Focus trap: lock Tab/Shift-Tab within the modal, focus first element on open
  useEffect(() => {
    if (!report || !dialogRef.current) return
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
  }, [report, state, onClose])

  if (!report) return null

  async function handlePurchase() {
    if (!connected || !account) {
      setWalletPickerOpen(true)
      return
    }

    setState('pending')
    setErrorMsg(null)

    try {
      await authenticate()
      const response = await signAndSubmitTransaction({
        data: purchaseReportPayload(report!.id),
      })
      await confirmPurchase(report!.id, response.hash)
      setTxHash(response.hash)
      setState('success')
      onPurchaseComplete?.(report!)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction failed'
      setErrorMsg(message)
      setState('error')
    }
  }

  return (
    <div
      className={layout.modalBackdrop}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-modal-title"
        className="bg-background border border-divider rounded-2xl shadow-2xl shadow-black/60 w-full max-w-sm mx-4 p-6 flex flex-col gap-5 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="purchase-modal-title" className="text-sm font-semibold text-text-primary">Purchase Report</h2>
            <p className="text-xs text-text-muted mt-0.5">Pay with APT to unlock full access</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Report summary */}
        <div className="flex flex-col gap-1 p-3 bg-surface rounded-xl border border-divider">
          <span className="text-xs text-text-muted">{report.type}</span>
          <span className="text-sm font-medium text-text-primary line-clamp-2">{report.title}</span>
          <span className="text-xs text-text-secondary">by {report.author}</span>
        </div>

        {/* States */}
        {state === 'confirm' && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Price</span>
              <span className="font-semibold text-text-primary">{report.price} APT</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Network fee</span>
              <span className="text-text-muted">~0.001 APT</span>
            </div>
            <div className="h-px bg-divider" />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-text-primary">Total</span>
              <span className="font-bold text-pink">≈ {(report.price! + 0.001).toFixed(3)} APT</span>
            </div>

            {!connected && (
              <p className="text-xs text-text-muted text-center">
                Connect your wallet to proceed
              </p>
            )}

            <button
              onClick={handlePurchase}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-pink text-white hover:opacity-90 active:opacity-80 transition-opacity"
            >
              {connected ? `Pay ${report.price} APT` : 'Connect Wallet & Pay'}
            </button>
          </>
        )}

        {state === 'pending' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-8 h-8 border-2 border-pink border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-secondary">Waiting for wallet confirmation…</p>
            <p className="text-xs text-text-muted">Please approve the transaction in your wallet</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-full bg-positive/10 flex items-center justify-center animate-bounce-in">
              <svg className="w-5 h-5 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-text-primary animate-fade-up">Purchase Successful</p>
            <p className="text-xs text-text-muted text-center">You now have full access to this report</p>
            {txHash && (
              <span className="text-xs font-mono text-text-muted bg-surface px-2 py-1 rounded border border-divider">
                {txHash.slice(0, 10)}…{txHash.slice(-6)}
              </span>
            )}
            <p className="text-xs text-text-muted">Opening report…</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-full bg-negative/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-negative" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-text-primary">Transaction Failed</p>
            <p className="text-xs text-text-muted text-center">{errorMsg}</p>
            <button
              onClick={() => setState('confirm')}
              className="w-full py-2.5 rounded-lg text-sm font-semibold border border-divider text-text-primary hover:bg-surface transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Inline wallet picker (shown when not connected) */}
        {walletPickerOpen && (
          <div className="flex flex-col gap-2 pt-2 border-t border-divider">
            <p className="text-xs text-text-muted">Choose a wallet</p>
            {wallets.length === 0 && (
              <p className="text-xs text-text-muted">No Aptos wallets detected. Install Petra.</p>
            )}
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => { connect(wallet.name); setWalletPickerOpen(false) }}
                className="flex items-center gap-3 px-3 py-2 rounded-md border border-divider hover:bg-surface text-sm text-text-primary transition-colors"
              >
                {wallet.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={wallet.icon} alt="" className="w-5 h-5 rounded" />
                )}
                {wallet.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
