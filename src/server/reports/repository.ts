import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { purchases, reports } from '@/server/db/schema'
import { findLegacyReport, listLegacyReports } from '@/server/reports/legacy-registry'
import { findRegistryV2Report } from '@/server/reports/registry-v2'
import type { Report } from '@/features/reports/types/report'

export function toReport(row: typeof reports.$inferSelect, walletAddress?: string | null, purchased = false): Report {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.reportType as Report['type'],
    access: row.access as Report['access'],
    price: row.priceOctas > 0 ? row.priceOctas / 1e8 : undefined,
    likes: 0,
    downloads: 0,
    author: `${row.ownerAddress.slice(0, 10)}…`,
    authorAddress: row.ownerAddress,
    createdAt: row.createdAt.toISOString(),
    onChain: row.source !== 'pending',
    fileType: row.fileType as Report['fileType'],
    tags: row.tags,
    blobAccount: row.blobAccount,
    blobName: row.blobName ?? undefined,
    network: row.network as Report['network'],
    encryptionVersion: row.encryptionVersion as Report['encryptionVersion'],
    encryptionIv: row.encryptionIv ?? undefined,
    cipherHash: row.cipherHash ?? undefined,
    purchased,
    owned: walletAddress === row.ownerAddress,
    active: row.active,
  }
}

function withWalletFlags(report: Report, walletAddress?: string | null): Report {
  if (!walletAddress) return report
  const owned = report.authorAddress.toLowerCase() === walletAddress.toLowerCase()
  return { ...report, owned, purchased: report.purchased ?? false }
}

export async function listReports(input: { query?: string; owner?: string; walletAddress?: string | null }) {
  if (!process.env.DATABASE_URL) {
    const legacy = await listLegacyReports({ query: input.query, owner: input.owner })
    return legacy.map((report) => withWalletFlags(report, input.walletAddress))
  }

  try {
    const filters = [eq(reports.status, 'active'), eq(reports.active, true)]
    if (input.owner) filters.push(eq(reports.ownerAddress, input.owner))
    if (input.query) {
      const query = `%${input.query}%`
      const search = or(ilike(reports.title, query), ilike(reports.description, query))
      if (search) filters.push(search)
    }
    const rows = await getDb().select().from(reports).where(and(...filters)).orderBy(desc(reports.createdAt)).limit(100)
    if (rows.length === 0) {
      const legacy = await listLegacyReports({ query: input.query, owner: input.owner })
      return legacy.map((report) => withWalletFlags(report, input.walletAddress))
    }
    if (!input.walletAddress) return rows.map((row) => toReport(row))
    const ownedPurchases = await getDb().select({ reportId: purchases.reportId }).from(purchases).where(eq(purchases.buyerAddress, input.walletAddress))
    const purchasedIds = new Set(ownedPurchases.map((item) => item.reportId))
    return rows.map((row) => toReport(row, input.walletAddress, purchasedIds.has(row.id)))
  } catch (error) {
    console.warn('Falling back to legacy registry reports:', error)
    const legacy = await listLegacyReports({ query: input.query, owner: input.owner })
    return legacy.map((report) => withWalletFlags(report, input.walletAddress))
  }
}

export async function findReport(id: string, walletAddress?: string | null) {
  if (!process.env.DATABASE_URL) {
    const report = await findRegistryV2Report(id, walletAddress) ?? await findLegacyReport(id)
    return report ? withWalletFlags(report, walletAddress) : null
  }

  try {
    const [row] = await getDb().select().from(reports).where(eq(reports.id, id)).limit(1)
    if (!row) {
      const report = await findRegistryV2Report(id, walletAddress) ?? await findLegacyReport(id)
      return report ? withWalletFlags(report, walletAddress) : null
    }
    let purchased = false
    if (walletAddress) {
      const [receipt] = await getDb().select({ id: purchases.id }).from(purchases).where(and(
        eq(purchases.reportId, id), eq(purchases.buyerAddress, walletAddress),
      )).limit(1)
      purchased = Boolean(receipt)
    }
    return toReport(row, walletAddress, purchased)
  } catch (error) {
    console.warn('Falling back to legacy registry report:', error)
    const report = await findRegistryV2Report(id, walletAddress) ?? await findLegacyReport(id)
    return report ? withWalletFlags(report, walletAddress) : null
  }
}
