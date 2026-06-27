import { AnyPublicKey, Ed25519PrivateKey, Ed25519PublicKey } from '@aptos-labs/ts-sdk'
import { describe, expect, it } from 'vitest'
import { normalizeAcePublicKey } from '@/lib/ace/reports'

describe('ACE public key normalization', () => {
  it('keeps SDK public key instances supported by ACE', () => {
    const publicKey = Ed25519PrivateKey.generate().publicKey()
    expect(normalizeAcePublicKey(publicKey)).toBe(publicKey)
  })

  it('converts raw Ed25519 bytes into a local SDK public key instance', () => {
    const publicKey = Ed25519PrivateKey.generate().publicKey()
    const normalized = normalizeAcePublicKey(publicKey.toUint8Array())
    expect(normalized).toBeInstanceOf(Ed25519PublicKey)
    expect(normalized.toString()).toBe(publicKey.toString())
  })

  it('converts BCS AnyPublicKey bytes from wallet-standard shaped objects', () => {
    const publicKey = new AnyPublicKey(Ed25519PrivateKey.generate().publicKey())
    const normalized = normalizeAcePublicKey({ toUint8Array: () => publicKey.toUint8Array() })
    expect(normalized).toBeInstanceOf(AnyPublicKey)
    expect(normalized.toString()).toBe(publicKey.toString())
  })

  it('converts BCS hex strings from public key objects', () => {
    const publicKey = new AnyPublicKey(Ed25519PrivateKey.generate().publicKey())
    const normalized = normalizeAcePublicKey({ bcsToHex: () => publicKey.bcsToHex() })
    expect(normalized).toBeInstanceOf(AnyPublicKey)
    expect(normalized.toString()).toBe(publicKey.toString())
  })
})
