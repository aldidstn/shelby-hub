export function canAccessPremiumReport(input: {
  walletAddress: string
  ownerAddress: string
  indexedPurchase: boolean
  onChainPurchase: boolean
}) {
  return input.walletAddress.toLowerCase() === input.ownerAddress.toLowerCase()
    || input.indexedPurchase
    || input.onChainPurchase
}
