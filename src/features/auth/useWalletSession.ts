'use client'

import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { useCallback, useEffect, useRef } from 'react'
import { authenticateWalletSession } from '@/features/auth/services/wallet-session'
import { useShelbyNetwork } from '@/features/network/NetworkProvider'
import { ensureWalletNetwork } from '@/features/network/wallet-network'

export function useWalletSession() {
  const { network: selectedNetwork } = useShelbyNetwork()
  const { account, wallet, network: walletNetwork, signIn, changeNetwork } = useWallet()
  const walletRef = useRef({ account, wallet, walletNetwork, signIn, changeNetwork, selectedNetwork })
  useEffect(() => {
    walletRef.current = { account, wallet, walletNetwork, signIn, changeNetwork, selectedNetwork }
  }, [account, wallet, walletNetwork, signIn, changeNetwork, selectedNetwork])

  const authenticate = useCallback(async () => {
    const current = walletRef.current
    if (!current.account || !current.wallet) throw new Error('Connect your wallet first')
    await ensureWalletNetwork({
      target: current.selectedNetwork,
      currentNetwork: current.walletNetwork,
      wallet: current.wallet,
      changeNetwork: current.changeNetwork,
    })
    return authenticateWalletSession({
      accountAddress: current.account.address.toString(),
      walletName: current.wallet.name,
      signIn: current.signIn,
      network: current.selectedNetwork,
    })
  }, [])

  return { authenticate }
}
