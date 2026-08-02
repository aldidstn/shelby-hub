import {
  verifySignInMessage,
  verifySignInSignature,
  type AptosSignInInput,
  type DeserializedAptosSignInOutput,
} from '@aptos-labs/siwa'
import { aptos } from '@/lib/aptos/client'

export const SIWA_CHAIN_ID = 'aptos:testnet'
export const SIWA_STATEMENT = 'Sign in to Shelby Research'

interface ChallengeRecord {
  domain: string
  nonce: string
  createdAt: Date
  expiresAt: Date
}

export function expectedSignInInput(record: ChallengeRecord, origin: string): AptosSignInInput & { domain: string } {
  return {
    domain: record.domain,
    nonce: record.nonce,
    uri: origin,
    version: '1',
    chainId: SIWA_CHAIN_ID,
    statement: SIWA_STATEMENT,
    issuedAt: record.createdAt.toISOString(),
    expirationTime: record.expiresAt.toISOString(),
  }
}

export async function verifyWalletSignIn(
  decoded: DeserializedAptosSignInOutput,
  expected: AptosSignInInput & { domain: string },
) {
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
