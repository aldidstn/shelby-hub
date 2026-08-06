import type { ShelbyNetwork } from '@/features/reports/types/report'
import { aptosForNetwork, normalizeAddress } from '@/lib/aptos/client'

const MIN_APT_OCTAS = 1_000_000
const MIN_SHELBY_USD_UNITS = 100_000_000
const SHELBY_USD_METADATA = '0x1b18363a9f1fe5e6ebf247daba5cc1c18052bb232efdc4c50f556053922d98e1'

export type SecureUploadStage = 'auth' | 'network' | 'prepare' | 'encrypt' | 'upload' | 'publish' | 'finalize'

const STAGE_LABELS: Record<SecureUploadStage, string> = {
  auth: 'Wallet authentication failed',
  network: 'Network setup failed',
  prepare: 'Upload preparation failed',
  encrypt: 'File encryption failed',
  upload: 'Shelby storage upload failed',
  publish: 'Report registration failed',
  finalize: 'Upload finalization failed',
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>
    for (const key of ['message', 'error', 'reason']) {
      if (typeof value[key] === 'string' && value[key]) return value[key]
    }
  }
  return 'The wallet or network rejected the request'
}

export function describeUploadFailure(error: unknown, stage: SecureUploadStage) {
  return `${STAGE_LABELS[stage]}: ${errorText(error)}`
}

export function uploadFundingUrls(address: string, network: ShelbyNetwork) {
  const query = new URLSearchParams({ address, network })
  return {
    apt: `https://docs.shelby.xyz/apis/faucet/aptos?${query}`,
    shelbyUsd: `https://docs.shelby.xyz/apis/faucet/shelbyusd?${query}`,
  }
}

export async function assertUploadFunding(network: ShelbyNetwork, address: string) {
  const client = aptosForNetwork(network)
  let aptOctas: number
  let shelbyUsdUnits: number

  try {
    const [apt, balances] = await Promise.all([
      client.getAccountAPTAmount({ accountAddress: address }),
      client.getCurrentFungibleAssetBalances({ options: { where: {
        owner_address: { _eq: normalizeAddress(address) },
        asset_type: { _eq: SHELBY_USD_METADATA },
      } } }),
    ])
    aptOctas = Number(apt)
    shelbyUsdUnits = Number(balances[0]?.amount ?? 0)
  } catch {
    // A temporary indexer failure should not block the wallet from trying the transaction.
    return
  }

  const missing: string[] = []
  if (aptOctas < MIN_APT_OCTAS) missing.push('APT for gas')
  if (shelbyUsdUnits < MIN_SHELBY_USD_UNITS) missing.push('at least 1 ShelbyUSD for storage')
  if (missing.length > 0) {
    throw new Error(`Fund this ${network === 'shelbynet' ? 'ShelbyNet' : 'Testnet'} wallet with ${missing.join(' and ')} before uploading.`)
  }
}
