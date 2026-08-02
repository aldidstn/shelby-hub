import { serializeSignInOutput } from '@aptos-labs/siwa'
import type { WalletContextState } from '@aptos-labs/wallet-adapter-react'
import { normalizeAddress } from '@/lib/aptos/client'

type WalletSignIn = WalletContextState['signIn']

interface AuthenticateWalletSessionInput {
  accountAddress: string
  walletName: string
  signIn: WalletSignIn
}

let databaseSessionSupport: boolean | null = null
const authenticationInFlight = new Map<string, Promise<string>>()

async function hasDatabaseBackedSessions() {
  if (databaseSessionSupport !== null) return databaseSessionSupport
  try {
    const response = await fetch('/api/system/capabilities', { cache: 'no-store' })
    if (!response.ok) return true
    const capabilities = await response.json() as { database?: { configured?: boolean } }
    databaseSessionSupport = Boolean(capabilities.database?.configured)
  } catch {
    return true
  }
  return databaseSessionSupport
}

async function performAuthentication(input: AuthenticateWalletSessionInput) {
  if (!await hasDatabaseBackedSessions()) {
    throw new Error('Wallet sessions are disabled until PostgreSQL is configured. ACE report access still uses direct wallet signatures.')
  }

  const expectedAddress = normalizeAddress(input.accountAddress)
  const currentResponse = await fetch('/api/auth/session', { cache: 'no-store' })
  if (currentResponse.ok) {
    const current = await currentResponse.json() as { authenticated: boolean; walletAddress: string | null }
    if (current.authenticated && current.walletAddress && normalizeAddress(current.walletAddress) === expectedAddress) {
      return expectedAddress
    }
  }

  const challengeResponse = await fetch('/api/auth/challenge', { method: 'POST' })
  const challenge = await challengeResponse.json() as { input?: Parameters<WalletSignIn>[0]['input']; error?: string }
  if (!challengeResponse.ok || !challenge.input) throw new Error(challenge.error ?? 'Could not create sign-in challenge')

  const output = await input.signIn({ walletName: input.walletName, input: challenge.input })
  if (!output) throw new Error('Wallet did not return a sign-in proof')

  const response = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ output: serializeSignInOutput(output) }),
  })
  const result = await response.json() as { walletAddress?: string; error?: string }
  if (!response.ok || !result.walletAddress) throw new Error(result.error ?? 'Wallet sign-in failed')

  const verifiedAddress = normalizeAddress(result.walletAddress)
  if (verifiedAddress !== expectedAddress) throw new Error('Wallet sign-in returned a different account')
  return verifiedAddress
}

export function authenticateWalletSession(input: AuthenticateWalletSessionInput) {
  const address = normalizeAddress(input.accountAddress)
  const existing = authenticationInFlight.get(address)
  if (existing) return existing

  const request = performAuthentication(input).finally(() => {
    if (authenticationInFlight.get(address) === request) authenticationInFlight.delete(address)
  })
  authenticationInFlight.set(address, request)
  return request
}
