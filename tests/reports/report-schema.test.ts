import { describe, expect, it } from 'vitest'
import { finalizeReportSchema, prepareReportSchema } from '@/features/reports/schemas/report'

const base = { title: 'Alpha', description: '', reportType: 'Research', fileType: 'pdf', tags: [], network: 'testnet' }

describe('report preparation validation', () => {
  it('accepts a free report with zero price', () => {
    expect(prepareReportSchema.parse({ ...base, access: 'free', priceOctas: 0 }).access).toBe('free')
  })

  it('rejects premium reports without a positive price', () => {
    expect(() => prepareReportSchema.parse({ ...base, access: 'premium', priceOctas: 0 })).toThrow()
  })

  it('rejects metadata beyond contract limits', () => {
    expect(() => prepareReportSchema.parse({ ...base, title: 'x'.repeat(161), access: 'free', priceOctas: 0 })).toThrow()
  })
})

describe('report finalization validation', () => {
  const baseFinalize = { blobName: 'owner/report.pdf.enc', transactionHash: '0x1234' }

  it('accepts AES-GCM integrity metadata', () => {
    const result = finalizeReportSchema.parse({
      ...baseFinalize,
      cipherHash: Buffer.alloc(32, 1).toString('base64'),
      encryptionIv: Buffer.alloc(12, 2).toString('base64'),
    })
    expect(result.encryptionIv).toBe(Buffer.alloc(12, 2).toString('base64'))
  })

  it('rejects malformed encryption metadata', () => {
    expect(() => finalizeReportSchema.parse({
      ...baseFinalize,
      cipherHash: 'not-a-sha256-hash',
      encryptionIv: 'too-short',
    })).toThrow()
  })
})
