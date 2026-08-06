import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectedSignInInput, SIWA_CHAIN_IDS } from '@/server/auth/siwa'

const db = vi.hoisted(() => {
  const values = vi.fn().mockResolvedValue(undefined)
  return { values, insert: vi.fn(() => ({ values })) }
})

vi.mock('@/server/db/client', () => ({
  getDb: () => ({ insert: db.insert }),
}))

afterEach(() => {
  vi.clearAllMocks()
  delete process.env.DATABASE_URL
})

describe('POST /api/auth/challenge', () => {
  it('binds the stored challenge and Petra request to ShelbyNet', async () => {
    process.env.DATABASE_URL = 'postgres://configured'
    const { POST } = await import('@/app/api/auth/challenge/route')
    const response = await POST(new NextRequest('https://shelbyscribe.vercel.app/api/auth/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ network: 'shelbynet' }),
    }))
    const body = await response.json() as { input: { chainId: string; domain: string; nonce: string } }

    expect(response.status).toBe(200)
    expect(body.input).toMatchObject({
      chainId: SIWA_CHAIN_IDS.shelbynet,
      domain: 'shelbyscribe.vercel.app',
    })
    expect(db.values).toHaveBeenCalledTimes(1)

    const record = db.values.mock.calls[0]?.[0] as {
      domain: string
      nonce: string
      createdAt: Date
      expiresAt: Date
    }
    expect(expectedSignInInput(record, 'https://shelbyscribe.vercel.app')).toMatchObject({
      chainId: SIWA_CHAIN_IDS.shelbynet,
      domain: 'shelbyscribe.vercel.app',
      nonce: body.input.nonce,
    })
  })
})
