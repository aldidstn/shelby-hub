import { describe, expect, it } from 'vitest'
import { prepareReportSchema } from '@/features/reports/schemas/report'

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
