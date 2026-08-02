'use client'

import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { useCallback, useEffect, useRef } from 'react'
import { authenticateWalletSession } from '@/features/auth/services/wallet-session'

export function useWalletSession() {
  const { account, wallet, signIn } = useWallet()
  const walletRef = useRef({ account, wallet, signIn })
  useEffect(() => {
    walletRef.current = { account, wallet, signIn }
  }, [account, wallet, signIn])

  const authenticate = useCallback(async () => {
    const current = walletRef.current
    if (!current.account || !current.wallet) throw new Error('Connect your wallet first')
    return authenticateWalletSession({
      accountAddress: current.account.address.toString(),
      walletName: current.wallet.name,
      signIn: current.signIn,
    })
  }, [])

  return { authenticate }
}
