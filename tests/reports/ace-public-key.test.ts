import {
  AnyPublicKey,
  AnySignature,
  Ed25519PrivateKey,
  Ed25519PublicKey,
  Ed25519Signature,
} from '@aptos-labs/ts-sdk'
import { describe, expect, it } from 'vitest'
import { normalizeAcePublicKey, normalizeAceSignature } from '@/lib/ace/reports'

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

describe('ACE signature normalization', () => {
  it('keeps SDK signature instances supported by ACE', () => {
    const signature = Ed25519PrivateKey.generate().sign('0x1234')
    expect(normalizeAceSignature(signature)).toBe(signature)
  })

  it('converts raw Ed25519 signature bytes into a local SDK signature instance', () => {
    const signature = Ed25519PrivateKey.generate().sign('0x1234')
    const normalized = normalizeAceSignature(signature.toUint8Array())
    expect(normalized).toBeInstanceOf(Ed25519Signature)
    expect(normalized.toString()).toBe(signature.toString())
  })

  it('converts BCS AnySignature bytes from wallet-standard shaped objects', () => {
    const signature = new AnySignature(Ed25519PrivateKey.generate().sign('0x1234'))
    const normalized = normalizeAceSignature({ bcsToBytes: () => signature.bcsToBytes() })
    expect(normalized).toBeInstanceOf(AnySignature)
    expect(normalized.toString()).toBe(signature.toString())
  })

  it('converts BCS hex strings from signature objects', () => {
    const signature = new AnySignature(Ed25519PrivateKey.generate().sign('0x1234'))
    const normalized = normalizeAceSignature({ bcsToHex: () => signature.bcsToHex() })
    expect(normalized).toBeInstanceOf(AnySignature)
    expect(normalized.toString()).toBe(signature.toString())
  })
})
