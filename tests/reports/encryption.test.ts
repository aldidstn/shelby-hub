import { beforeAll, describe, expect, it } from 'vitest'
import { webcrypto } from 'node:crypto'
import { decryptReportBlob, encryptReportFile } from '@/features/reports/services/encryption'

beforeAll(() => { Object.defineProperty(globalThis, 'crypto', { value: webcrypto }) })

describe('premium report encryption', () => {
  it('round trips content with AES-GCM', async () => {
    const key = Buffer.alloc(32, 7).toString('base64')
    const encrypted = await encryptReportFile(new File(['classified'], 'report.txt'), key)
    const plaintext = await decryptReportBlob(encrypted.file, key, encrypted.iv)
    expect(new TextDecoder().decode(plaintext)).toBe('classified')
  })

  it('rejects a modified key', async () => {
    const encrypted = await encryptReportFile(new File(['classified'], 'report.txt'), Buffer.alloc(32, 7).toString('base64'))
    await expect(decryptReportBlob(encrypted.file, Buffer.alloc(32, 8).toString('base64'), encrypted.iv)).rejects.toThrow()
  })

  it('uses a fresh IV for every encryption', async () => {
    const key = Buffer.alloc(32, 7).toString('base64')
    const first = await encryptReportFile(new File(['same'], 'report.txt'), key)
    const second = await encryptReportFile(new File(['same'], 'report.txt'), key)
    expect(first.iv).not.toBe(second.iv)
    expect(first.cipherHash).not.toBe(second.cipherHash)
  })
})
