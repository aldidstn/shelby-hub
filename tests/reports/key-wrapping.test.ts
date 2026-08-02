import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createReportDataKey,
  isPremiumEncryptionConfigured,
  unwrapReportDataKey,
} from '@/server/encryption/keys'

const KEY_V1 = Buffer.alloc(32, 17).toString('base64')
const KEY_V2 = Buffer.alloc(32, 29).toString('base64')

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('PREMIUM_MASTER_KEY_VERSION', '1')
  vi.stubEnv('PREMIUM_MASTER_KEY_V1', KEY_V1)
})

describe('premium report key wrapping', () => {
  it('wraps and unwraps a unique report data key', async () => {
    const generated = await createReportDataKey('report-1')
    const unwrapped = await unwrapReportDataKey('report-1', generated.wrappedKey, generated.wrappingKeyId)

    expect(generated.wrappingKeyId).toBe('vercel-env:v1')
    expect(generated.keyVersion).toBe('1')
    expect(Buffer.from(unwrapped, 'base64')).toHaveLength(32)
    expect(unwrapped).toBe(generated.plaintextKey)
    expect(generated.wrappedKey).not.toContain(generated.plaintextKey)
  })

  it('uses fresh data keys and wrapping IVs', async () => {
    const first = await createReportDataKey('report-1')
    const second = await createReportDataKey('report-1')

    expect(first.plaintextKey).not.toBe(second.plaintextKey)
    expect(first.wrappedKey).not.toBe(second.wrappedKey)
  })

  it('binds wrapped keys to the canonical report ID', async () => {
    const generated = await createReportDataKey('report-1')
    await expect(unwrapReportDataKey('report-2', generated.wrappedKey, generated.wrappingKeyId)).rejects.toThrow()
  })

  it('rejects modified wrapped keys', async () => {
    const generated = await createReportDataKey('report-1')
    const parts = generated.wrappedKey.split('.')
    parts[3] = `${parts[3].slice(0, -1)}${parts[3].endsWith('A') ? 'B' : 'A'}`

    await expect(unwrapReportDataKey('report-1', parts.join('.'), generated.wrappingKeyId)).rejects.toThrow()
  })

  it('keeps old reports readable after rotating the active key', async () => {
    const generatedWithV1 = await createReportDataKey('report-1')
    vi.stubEnv('PREMIUM_MASTER_KEY_VERSION', '2')
    vi.stubEnv('PREMIUM_MASTER_KEY_V2', KEY_V2)

    const generatedWithV2 = await createReportDataKey('report-2')
    const oldKey = await unwrapReportDataKey('report-1', generatedWithV1.wrappedKey, generatedWithV1.wrappingKeyId)

    expect(generatedWithV2.wrappingKeyId).toBe('vercel-env:v2')
    expect(oldKey).toBe(generatedWithV1.plaintextKey)
  })

  it('stays disabled for a missing or malformed master key', async () => {
    vi.stubEnv('PREMIUM_MASTER_KEY_V1', 'not-a-key')

    expect(isPremiumEncryptionConfigured()).toBe(false)
    await expect(createReportDataKey('report-1')).rejects.toThrow('base64-encoded 32-byte key')
  })
})
