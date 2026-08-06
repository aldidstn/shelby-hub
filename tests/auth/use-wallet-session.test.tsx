import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const walletState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('@aptos-labs/wallet-adapter-react', () => ({
  useWallet: () => walletState.current,
}))

vi.mock('@/features/auth/services/wallet-session', () => ({
  authenticateWalletSession: vi.fn(),
}))

vi.mock('@/features/network/NetworkProvider', () => ({
  useShelbyNetwork: () => ({ network: 'shelbynet' }),
}))

vi.mock('@/features/network/wallet-network', () => ({
  ensureWalletNetwork: vi.fn(),
}))

describe('useWalletSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    walletState.current = { account: null, wallet: null, network: null, signIn: vi.fn(), changeNetwork: vi.fn() }
  })

  it('keeps authenticate stable when wallet adapter objects change identity', async () => {
    const { useWalletSession } = await import('@/features/auth/useWalletSession')
    const { result, rerender } = renderHook(() => useWalletSession())
    const first = result.current.authenticate

    walletState.current = { account: null, wallet: null, network: null, signIn: vi.fn(), changeNetwork: vi.fn() }
    rerender()

    expect(result.current.authenticate).toBe(first)
  })

  it('switches to the selected network before starting SIWA', async () => {
    const { authenticateWalletSession } = await import('@/features/auth/services/wallet-session')
    const { ensureWalletNetwork } = await import('@/features/network/wallet-network')
    vi.mocked(authenticateWalletSession).mockResolvedValue('0x2')
    walletState.current = {
      account: { address: { toString: () => '0x2' } },
      wallet: { name: 'Petra' },
      network: { name: 'testnet', chainId: 2 },
      signIn: vi.fn(),
      changeNetwork: vi.fn(),
    }

    const { useWalletSession } = await import('@/features/auth/useWalletSession')
    const { result } = renderHook(() => useWalletSession())
    await act(async () => { await result.current.authenticate() })

    expect(ensureWalletNetwork).toHaveBeenCalledWith(expect.objectContaining({
      target: 'shelbynet',
      currentNetwork: { name: 'testnet', chainId: 2 },
    }))
    expect(authenticateWalletSession).toHaveBeenCalledWith(expect.objectContaining({
      network: 'shelbynet',
      walletName: 'Petra',
    }))
  })
})
