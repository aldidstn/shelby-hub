import { describe, expect, it, vi } from 'vitest'
import type { WalletContextState } from '@aptos-labs/wallet-adapter-react'
import { normalizeAddress } from '@/lib/aptos/client'

vi.mock('@aptos-labs/siwa', () => ({
  serializeSignInOutput: (output: unknown) => output,
}))

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('wallet session authentication', () => {
  it('shares one challenge and wallet prompt across concurrent callers', async () => {
    const { authenticateWalletSession } = await import('@/features/auth/services/wallet-session')
    const address = normalizeAddress('0x2')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ database: { configured: true } }))
      .mockResolvedValueOnce(jsonResponse({ authenticated: false, walletAddress: null }))
      .mockResolvedValueOnce(jsonResponse({ input: { domain: 'example.com', nonce: 'nonce-1' } }))
      .mockResolvedValueOnce(jsonResponse({ walletAddress: address }))
    vi.stubGlobal('fetch', fetchMock)

    const signIn = vi.fn().mockResolvedValue({ signature: 'signed' }) as unknown as WalletContextState['signIn']
    const input = { accountAddress: address, walletName: 'Petra', signIn, network: 'shelbynet' as const }
    const results = await Promise.all([
      authenticateWalletSession(input),
      authenticateWalletSession(input),
      authenticateWalletSession(input),
    ])

    expect(results).toEqual([address, address, address])
    expect(signIn).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/auth/challenge')).toHaveLength(1)
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/auth/verify')).toHaveLength(1)
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ network: 'shelbynet' }),
    })
  })
})
