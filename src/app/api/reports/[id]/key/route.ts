import { and, eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/server/auth/session'
import { getDb } from '@/server/db/client'
import { encryptionKeys, purchases, reports } from '@/server/db/schema'
import { apiError, HttpError } from '@/server/http/errors'
import { unwrapReportDataKey } from '@/server/encryption/keys'
import { hasPurchasedOnChain } from '@/lib/aptos/registry-v2'
import { canAccessPremiumReport } from '@/server/reports/access'

interface Context { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const session = await requireSession()
    const [report] = await getDb().select().from(reports).where(and(eq(reports.id, id), eq(reports.status, 'active'), eq(reports.active, true))).limit(1)
    if (!report) throw new HttpError(404, 'Report not found')
    if (report.access !== 'premium') throw new HttpError(400, 'Report is not encrypted premium content')
    if (report.encryptionVersion !== 'aes-256-gcm-v1') throw new HttpError(409, 'This report uses a different encryption provider')
    let indexedPurchase = false
    if (report.ownerAddress !== session.walletAddress) {
      const [receipt] = await getDb().select({ id: purchases.id }).from(purchases).where(and(
        eq(purchases.reportId, id), eq(purchases.buyerAddress, session.walletAddress),
      )).limit(1)
      indexedPurchase = Boolean(receipt)
    }
    const onChainPurchase = report.ownerAddress === session.walletAddress || indexedPurchase
      ? false
      : await hasPurchasedOnChain(session.walletAddress, id, report.network as 'testnet' | 'shelbynet')
    const authorized = canAccessPremiumReport({
      walletAddress: session.walletAddress, ownerAddress: report.ownerAddress, indexedPurchase, onChainPurchase,
    })
    if (!authorized) throw new HttpError(403, 'Purchase required')
    const [key] = await getDb().select().from(encryptionKeys).where(eq(encryptionKeys.reportId, id)).limit(1)
    if (!key || !report.encryptionIv) throw new HttpError(503, 'Encryption material is unavailable')
    let dataKey
    try {
      dataKey = await unwrapReportDataKey(id, key.wrappedKey, key.wrappingKeyId)
    } catch (error) {
      console.error('Premium data-key unwrap failed', { reportId: id, error })
      throw new HttpError(503, 'The premium key service is temporarily unavailable')
    }
    return NextResponse.json({ dataKey, iv: report.encryptionIv, algorithm: 'AES-GCM' }, {
      headers: { 'Cache-Control': 'no-store, private' },
    })
  } catch (error) { return apiError(error) }
}
