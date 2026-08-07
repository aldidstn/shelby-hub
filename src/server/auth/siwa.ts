import {
  verifySignInMessage,
  verifySignInSignature,
  type AptosSignInInput,
  type DeserializedAptosSignInOutput,
} from '@aptos-labs/siwa'
import type { ShelbyNetwork } from '@/features/reports/types/report'
import { aptosForNetwork } from '@/lib/aptos/client'

export const SIWA_CHAIN_IDS = {
  testnet: 'aptos:testnet',
  shelbynet: 'aptos:shelbynet',
} as const satisfies Record<ShelbyNetwork, string>
export const SIWA_STATEMENT = 'Sign in to Shelby Scribe'

export function siwaChainIdForNetwork(network: ShelbyNetwork) {
  return SIWA_CHAIN_IDS[network]
}

export function encodeSignInChallengeContext(domain: string, network: ShelbyNetwork) {
  return JSON.stringify({ version: 1, domain, chainId: siwaChainIdForNetwork(network) })
}

function decodeSignInChallengeContext(value: string) {
  try {
    const parsed = JSON.parse(value) as { version?: unknown; domain?: unknown; chainId?: unknown }
    if (
      parsed.version === 1
      && typeof parsed.domain === 'string'
      && typeof parsed.chainId === 'string'
    ) {
      networkForSiwaChainId(parsed.chainId)
      return { domain: parsed.domain, chainId: parsed.chainId }
    }
  } catch {
    // Challenges created before network selection were always bound to Testnet.
  }
  return { domain: value, chainId: SIWA_CHAIN_IDS.testnet }
}

function networkForSiwaChainId(chainId: string): ShelbyNetwork {
  if (chainId === SIWA_CHAIN_IDS.shelbynet) return 'shelbynet'
  if (chainId === SIWA_CHAIN_IDS.testnet) return 'testnet'
  throw new Error(`Unsupported SIWA chain ID: ${chainId}`)
}

interface ChallengeRecord {
  domain: string
  nonce: string
  createdAt: Date
  expiresAt: Date
}

export function expectedSignInInput(record: ChallengeRecord, origin: string): AptosSignInInput & { domain: string } {
  const context = decodeSignInChallengeContext(record.domain)
  return {
    domain: context.domain,
    nonce: record.nonce,
    uri: origin,
    version: '1',
    chainId: context.chainId,
    statement: SIWA_STATEMENT,
    issuedAt: record.createdAt.toISOString(),
    expirationTime: record.expiresAt.toISOString(),
  }
}

export async function verifyWalletSignIn(
  decoded: DeserializedAptosSignInOutput,
  expected: AptosSignInInput & { domain: string },
) {
  const aptos = aptosForNetwork(networkForSiwaChainId(expected.chainId ?? ''))
  const signature = await verifySignInSignature(decoded, { aptos })
  if (!signature.valid) return { valid: false as const, stage: 'signature' as const, errors: signature.errors }

  const message = await verifySignInMessage({
    publicKey: decoded.publicKey,
    input: decoded.input,
    expected,
  }, { aptos })
  if (!message.valid) return { valid: false as const, stage: 'message' as const, errors: message.errors }

  return { valid: true as const }
}
