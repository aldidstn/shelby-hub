import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const walletState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('@aptos-labs/wallet-adapter-react', () => ({
  useWallet: () => walletState.current,
}))

vi.mock('@/features/auth/services/wallet-session', () => ({
  authenticateWalletSession: vi.fn(),
}))

describe('useWalletSession', () => {
  beforeEach(() => {
    walletState.current = { account: null, wallet: null, signIn: vi.fn() }
  })

  it('keeps authenticate stable when wallet adapter objects change identity', async () => {
    const { useWalletSession } = await import('@/features/auth/useWalletSession')
    const { result, rerender } = renderHook(() => useWalletSession())
    const first = result.current.authenticate

    walletState.current = { account: null, wallet: null, signIn: vi.fn() }
    rerender()

    expect(result.current.authenticate).toBe(first)
  })
})
