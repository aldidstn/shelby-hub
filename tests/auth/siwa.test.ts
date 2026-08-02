import { Account } from '@aptos-labs/ts-sdk'
import {
  createSignInMessage,
  createSignInSigningMessage,
  type AptosSignInBoundFields,
  type AptosSignInInput,
  type DeserializedAptosSignInOutput,
} from '@aptos-labs/siwa'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { aptos } from '@/lib/aptos/client'
import {
  expectedSignInInput,
  SIWA_CHAIN_ID,
  SIWA_STATEMENT,
  verifyWalletSignIn,
} from '@/server/auth/siwa'

afterEach(() => vi.restoreAllMocks())

describe('SIWA verification', () => {
  it('binds the exact challenge timestamps and verifies a testnet proof', async () => {
    const account = Account.generate()
    const createdAt = new Date('2026-08-02T02:30:00.000Z')
    const expiresAt = new Date('2026-08-02T02:35:00.000Z')
    const expected = expectedSignInInput({
      domain: 'shelbyscribe.vercel.app',
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
    vi.spyOn(aptos, 'getAccountInfo').mockResolvedValue({
      authentication_key: account.accountAddress.toString(),
    } as Awaited<ReturnType<typeof aptos.getAccountInfo>>)

    expect(expected).toMatchObject({
      chainId: SIWA_CHAIN_ID,
      statement: SIWA_STATEMENT,
      issuedAt: createdAt.toISOString(),
      expirationTime: expiresAt.toISOString(),
    })
    await expect(verifyWalletSignIn(decoded, expected)).resolves.toEqual({ valid: true })
    expect(aptos.getAccountInfo).toHaveBeenCalledWith({ accountAddress: account.accountAddress.toString() })
  })
})
