'use client'

import { serializeSignInOutput } from '@aptos-labs/siwa'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { useCallback } from 'react'

export function useWalletSession() {
  const { account, wallet, signIn } = useWallet()

  const authenticate = useCallback(async () => {
    if (!account || !wallet) throw new Error('Connect your wallet first')
    const currentResponse = await fetch('/api/auth/session', { cache: 'no-store' })
    if (currentResponse.ok) {
      const current = await currentResponse.json() as { authenticated: boolean; walletAddress: string | null }
      if (current.authenticated && current.walletAddress === account.address.toString()) return current.walletAddress
    }
    const challengeResponse = await fetch('/api/auth/challenge', { method: 'POST' })
    const challenge = await challengeResponse.json() as { input?: Parameters<typeof signIn>[0]['input']; error?: string }
    if (!challengeResponse.ok || !challenge.input) throw new Error(challenge.error ?? 'Could not create sign-in challenge')
    const output = await signIn({ walletName: wallet.name, input: challenge.input })
    if (!output) throw new Error('Wallet did not return a sign-in proof')
    const response = await fetch('/api/auth/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ output: serializeSignInOutput(output) }),
    })
    const result = await response.json() as { walletAddress?: string; error?: string }
    if (!response.ok) throw new Error(result.error ?? 'Wallet sign-in failed')
    return result.walletAddress!
  }, [account, wallet, signIn])

  return { authenticate }
}
