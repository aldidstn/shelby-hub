import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/server/auth/session'
import { getDb } from '@/server/db/client'
import { purchases } from '@/server/db/schema'
import { apiError, HttpError } from '@/server/http/errors'
import { findReport } from '@/server/reports/repository'
import { normalizeAddress } from '@/lib/aptos/client'
import { verifyRegistryEvent } from '@/lib/aptos/registry-v2'

const schema = z.object({ transactionHash: z.string().regex(/^0x[0-9a-fA-F]+$/), reportId: z.string().min(1).max(96) })

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const input = schema.parse(await request.json())
    const report = await findReport(input.reportId, session.walletAddress)
    if (!report) throw new HttpError(404, 'Report not found')
    const reportNetwork = report.network ?? 'testnet'
    const event = await verifyRegistryEvent(input.transactionHash, 'ReportPurchased', reportNetwork)
    const buyer = normalizeAddress(session.walletAddress)
    const expectedAmount = Math.round((report.price ?? 0) * 1e8)
    if (event.sender !== buyer || normalizeAddress(event.data.buyer ?? '0x0') !== buyer) throw new HttpError(403, 'Purchase buyer mismatch')
    if (event.data.report_id !== input.reportId || normalizeAddress(event.data.seller ?? '0x0') !== normalizeAddress(report.authorAddress)) throw new HttpError(409, 'Purchase report mismatch')
    if (Number(event.data.amount) !== expectedAmount) throw new HttpError(409, 'Purchase amount mismatch')
    await getDb().insert(purchases).values({
      reportId: input.reportId, buyerAddress: buyer, sellerAddress: normalizeAddress(report.authorAddress),
      network: reportNetwork,
      amountOctas: expectedAmount, transactionHash: event.transactionHash,
      transactionVersion: event.transactionVersion, eventIndex: event.eventIndex, purchasedAt: event.timestamp,
    }).onConflictDoNothing()
    return NextResponse.json({ data: { reportId: input.reportId, purchased: true } })
  } catch (error) { return apiError(error) }
}
