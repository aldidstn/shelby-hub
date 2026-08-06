import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAccountAPTAmount: vi.fn(),
  getCurrentFungibleAssetBalances: vi.fn(),
}))

vi.mock('@/lib/aptos/client', () => ({
  aptosForNetwork: () => mocks,
  normalizeAddress: (value: string) => value,
}))

import {
  assertUploadFunding,
  describeUploadFailure,
  uploadFundingUrls,
} from '@/features/reports/services/upload-prerequisites'

describe('upload prerequisites', () => {
  beforeEach(() => {
    mocks.getAccountAPTAmount.mockResolvedValue(2_000_000)
    mocks.getCurrentFungibleAssetBalances.mockResolvedValue([{ amount: 100_000_000 }])
  })

  it('accepts a wallet funded for gas and Shelby storage', async () => {
    await expect(assertUploadFunding('shelbynet', '0x1')).resolves.toBeUndefined()
  })

  it('explains every missing upload asset', async () => {
    mocks.getAccountAPTAmount.mockResolvedValue(0)
    mocks.getCurrentFungibleAssetBalances.mockResolvedValue([])

    await expect(assertUploadFunding('shelbynet', '0x1')).rejects.toThrow(
      'Fund this ShelbyNet wallet with APT for gas and at least 1 ShelbyUSD for storage before uploading.',
    )
  })

  it('does not turn a temporary balance-indexer outage into a hard block', async () => {
    mocks.getCurrentFungibleAssetBalances.mockRejectedValue(new Error('Indexer unavailable'))
    await expect(assertUploadFunding('shelbynet', '0x1')).resolves.toBeUndefined()
  })

  it('preserves wallet error objects and the failed stage', () => {
    expect(describeUploadFailure({ reason: 'User rejected' }, 'network')).toBe(
      'Network setup failed: User rejected',
    )
  })

  it('builds official faucet links for the selected network', () => {
    expect(uploadFundingUrls('0x1', 'shelbynet')).toEqual({
      apt: 'https://docs.shelby.xyz/apis/faucet/aptos?address=0x1&network=shelbynet',
      shelbyUsd: 'https://docs.shelby.xyz/apis/faucet/shelbyusd?address=0x1&network=shelbynet',
    })
  })
})
