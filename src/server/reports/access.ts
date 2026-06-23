export function canAccessPremiumReport(input: {
  walletAddress: string
  ownerAddress: string
  indexedPurchase: boolean
  onChainPurchase: boolean
}) {
  return input.walletAddress === input.ownerAddress || input.indexedPurchase || input.onChainPurchase
}
