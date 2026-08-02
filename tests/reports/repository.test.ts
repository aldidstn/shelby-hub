import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Report } from '@/features/reports/types/report'

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  listLegacyReports: vi.fn(),
}))

vi.mock('@/server/db/client', () => ({ getDb: mocks.getDb }))
vi.mock('@/server/reports/legacy-registry', () => ({
  findLegacyReport: vi.fn(),
  listLegacyReports: mocks.listLegacyReports,
}))
vi.mock('@/server/reports/registry-v2', () => ({ findRegistryV2Report: vi.fn() }))

import { listReports, mergeCatalogReports } from '@/server/reports/repository'

const legacyReport: Report = {
  id: '0x1/legacy.pdf',
  title: 'Legacy report',
  description: 'Still readable from Registry V1',
  type: 'Research',
  access: 'free',
  likes: 0,
  downloads: 0,
  author: 'Legacy author',
  authorAddress: '0x1',
  createdAt: '2026-01-01T00:00:00.000Z',
  onChain: true,
  fileType: 'pdf',
  tags: [],
  blobAccount: '0x1',
  blobName: 'legacy.pdf',
  network: 'testnet',
  active: true,
}

const databaseRow = {
  id: 'report-v2',
  ownerAddress: '0x2',
  blobAccount: '0x2',
  blobName: 'current.pdf',
  network: 'testnet',
  title: 'Current report',
  description: 'Indexed from Registry V2',
  reportType: 'Research',
  access: 'free',
  priceOctas: 0,
  fileType: 'pdf',
  tags: [],
  cipherHash: null,
  encryptionVersion: null,
  encryptionIv: null,
  source: 'v2',
  status: 'active',
  active: true,
  chainVersion: 1,
  createdAt: new Date('2026-02-01T00:00:00.000Z'),
  updatedAt: new Date('2026-02-01T00:00:00.000Z'),
}

function databaseReturning(rows: typeof databaseRow[]) {
  const query = {
    from: vi.fn(() => query),
    where: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    limit: vi.fn(async () => rows),
  }
  return { select: vi.fn(() => query) }
}

describe('report catalog repository', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://configured'
    mocks.getDb.mockReturnValue(databaseReturning([databaseRow]))
    mocks.listLegacyReports.mockResolvedValue([legacyReport])
  })

  afterEach(() => {
    delete process.env.DATABASE_URL
    vi.clearAllMocks()
  })

  it('keeps legacy reports visible when the database contains active reports', async () => {
    const result = await listReports({})

    expect(result.map((report) => report.title)).toEqual(['Current report', 'Legacy report'])
    expect(mocks.listLegacyReports).toHaveBeenCalledOnce()
  })

  it('deduplicates imported legacy rows by their Shelby storage location', () => {
    const imported = {
      ...legacyReport,
      id: 'legacy:hashed-id',
      title: 'Database projection',
    }

    expect(mergeCatalogReports([imported], [legacyReport])).toEqual([imported])
  })
})
