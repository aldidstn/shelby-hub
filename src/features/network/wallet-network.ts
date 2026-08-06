import { Network } from '@aptos-labs/ts-sdk'
import type { ShelbyNetwork } from '@/features/reports/types/report'

export const SHELBYNET_CHAIN_ID = 118
export const SHELBYNET_FULLNODE_URL = 'https://api.shelbynet.shelby.xyz/v1'

type WalletNetwork = { name?: string; chainId?: number } | null
type ChangeNetwork = (network: Network) => Promise<unknown>
type StandardWallet = {
  name?: string
  features?: Record<string, unknown>
} | null

type ChangeNetworkFeature = {
  changeNetwork: (input: { name: Network; chainId: number; url: string }) => Promise<{
    status: string
    args?: { success?: boolean; reason?: string }
  }>
}

export async function ensureWalletNetwork(input: {
  target: ShelbyNetwork
  currentNetwork: WalletNetwork
  wallet: StandardWallet
  changeNetwork: ChangeNetwork
}) {
  const targetChainId = input.target === 'shelbynet' ? SHELBYNET_CHAIN_ID : 2
  if (input.currentNetwork?.name === input.target || input.currentNetwork?.chainId === targetChainId) return

  if (input.target === 'testnet') {
    await input.changeNetwork(Network.TESTNET)
    return
  }

  const feature = input.wallet?.features?.['aptos:changeNetwork'] as ChangeNetworkFeature | undefined
  if (!feature) throw new Error(`${input.wallet?.name ?? 'This wallet'} cannot switch to ShelbyNet. Use a wallet with Aptos network switching support.`)

  const response = await feature.changeNetwork({
    name: Network.SHELBYNET,
    chainId: SHELBYNET_CHAIN_ID,
    url: SHELBYNET_FULLNODE_URL,
  })
  if (response.status !== 'Approved' || response.args?.success !== true) {
    throw new Error(response.args?.reason ?? 'Wallet network switch to ShelbyNet was rejected')
  }
}
