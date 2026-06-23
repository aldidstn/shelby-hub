'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { useWalletSession } from '@/features/auth/useWalletSession'

export function LockedReport({ title }: { title: string }) {
  const router = useRouter()
  const { connected } = useWallet()
  const { authenticate } = useWalletSession()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function unlock() {
    setLoading(true)
    setError(null)
    try { await authenticate(); router.refresh() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to verify wallet') }
    finally { setLoading(false) }
  }

  return <div className="max-w-2xl mx-auto px-6 py-20 text-center">
    <p className="text-xs uppercase tracking-widest text-pink">Encrypted report</p>
    <h1 className="text-2xl font-bold text-brown mt-3">{title}</h1>
    <p className="text-sm text-text-secondary mt-3">Verify the wallet that owns or purchased this report to unlock it on this device.</p>
    <div className="flex justify-center gap-3 mt-6">
      <Link href="/reports" className="inline-flex px-4 py-2 rounded-lg border border-divider text-text-secondary text-sm">Back to library</Link>
      <button disabled={!connected || loading} onClick={unlock} className="inline-flex px-4 py-2 rounded-lg bg-pink text-white text-sm font-semibold disabled:opacity-40">
        {loading ? 'Verifying…' : connected ? 'Unlock with wallet' : 'Connect wallet to unlock'}
      </button>
    </div>
    {error && <p className="text-xs text-negative mt-4">{error}</p>}
  </div>
}
