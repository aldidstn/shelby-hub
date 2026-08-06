import { Account } from '@aptos-labs/ts-sdk'
import {
  createSignInMessage,
  createSignInSigningMessage,
  type AptosSignInBoundFields,
  type AptosSignInInput,
  type DeserializedAptosSignInOutput,
} from '@aptos-labs/siwa'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { aptosForNetwork } from '@/lib/aptos/client'
import {
  encodeSignInChallengeContext,
  expectedSignInInput,
  SIWA_CHAIN_IDS,
  SIWA_STATEMENT,
  verifyWalletSignIn,
} from '@/server/auth/siwa'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('SIWA verification', () => {
  it('keeps unexpired legacy challenges bound to Testnet', () => {
    const createdAt = new Date('2026-08-02T02:30:00.000Z')
    const expected = expectedSignInInput({
      domain: 'shelbyscribe.vercel.app',
      nonce: 'legacy-nonce',
      createdAt,
      expiresAt: new Date('2026-08-02T02:35:00.000Z'),
    }, 'https://shelbyscribe.vercel.app')

    expect(expected).toMatchObject({
      domain: 'shelbyscribe.vercel.app',
      chainId: SIWA_CHAIN_IDS.testnet,
    })
  })

  it.each([
    ['testnet', SIWA_CHAIN_IDS.testnet],
    ['shelbynet', SIWA_CHAIN_IDS.shelbynet],
  ] as const)('binds and verifies a %s proof against its selected chain', async (network, chainId) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-02T02:31:00.000Z'))
    const account = Account.generate()
    const createdAt = new Date('2026-08-02T02:30:00.000Z')
    const expiresAt = new Date('2026-08-02T02:35:00.000Z')
    const expected = expectedSignInInput({
      domain: encodeSignInChallengeContext('shelbyscribe.vercel.app', network),
      nonce: 'nonce-1',
      createdAt,
      expiresAt,
    }, 'https://shelbyscribe.vercel.app')
    const input: AptosSignInInput & AptosSignInBoundFields = {
      ...expected,
      address: account.accountAddress.toString(),
      uri: expected.uri!,
      version: expected.version!,
      chainId: expected.chainId!,
    }
    const signature = account.sign(createSignInSigningMessage(createSignInMessage(input)))
    const decoded: DeserializedAptosSignInOutput = {
      version: '3',
      type: 'ed25519',
      publicKey: account.publicKey,
      signature,
      input,
    }
    const aptos = aptosForNetwork(network)
    vi.spyOn(aptos, 'getAccountInfo').mockResolvedValue({
      authentication_key: account.accountAddress.toString(),
    } as Awaited<ReturnType<typeof aptos.getAccountInfo>>)

    expect(expected).toMatchObject({
      chainId,
      statement: SIWA_STATEMENT,
      issuedAt: createdAt.toISOString(),
      expirationTime: expiresAt.toISOString(),
    })
    await expect(verifyWalletSignIn(decoded, expected)).resolves.toEqual({ valid: true })
    expect(aptos.getAccountInfo).toHaveBeenCalledWith({ accountAddress: account.accountAddress.toString() })
  })
})
