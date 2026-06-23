import { describe, expect, it } from 'vitest'
import { canAccessPremiumReport } from '@/server/reports/access'

describe('premium report authorization', () => {
  it('allows the author', () => {
    expect(canAccessPremiumReport({ walletAddress: '0xa', ownerAddress: '0xa', indexedPurchase: false, onChainPurchase: false })).toBe(true)
  })

  it('allows either indexed or directly verified purchase proof', () => {
    expect(canAccessPremiumReport({ walletAddress: '0xb', ownerAddress: '0xa', indexedPurchase: true, onChainPurchase: false })).toBe(true)
    expect(canAccessPremiumReport({ walletAddress: '0xb', ownerAddress: '0xa', indexedPurchase: false, onChainPurchase: true })).toBe(true)
  })

  it('denies unrelated wallets', () => {
    expect(canAccessPremiumReport({ walletAddress: '0xb', ownerAddress: '0xa', indexedPurchase: false, onChainPurchase: false })).toBe(false)
  })
})
