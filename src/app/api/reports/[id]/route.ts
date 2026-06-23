import { and, eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { getOptionalSession, requireSession } from '@/server/auth/session'
import { getDb } from '@/server/db/client'
import { reports } from '@/server/db/schema'
import { apiError, HttpError } from '@/server/http/errors'
import { findReport } from '@/server/reports/repository'
import { finalizeReportSchema } from '@/features/reports/schemas/report'
import { normalizeAddress, registryAddress } from '@/lib/aptos/client'
import { verifyRegistryEvent } from '@/lib/aptos/registry-v2'

interface Context { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const session = await getOptionalSession()
    const report = await findReport(id, session?.walletAddress)
    if (!report || report.active === false) throw new HttpError(404, 'Report not found')
    return NextResponse.json({ data: report })
  } catch (error) { return apiError(error) }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params
    const session = await requireSession()
    const input = finalizeReportSchema.parse(await request.json())
    const [pending] = await getDb().select().from(reports).where(and(
      eq(reports.id, id), eq(reports.ownerAddress, session.walletAddress), eq(reports.status, 'pending'),
    )).limit(1)
    if (!pending) throw new HttpError(404, 'Pending report not found')
    const event = await verifyRegistryEvent(input.transactionHash, 'ReportRegistered')
    if (event.sender !== normalizeAddress(session.walletAddress) || normalizeAddress(event.data.owner ?? '0x0') !== normalizeAddress(session.walletAddress)) throw new HttpError(403, 'Registration owner mismatch')
    if (event.data.report_id !== id || event.data.blob_name !== input.blobName) throw new HttpError(409, 'Registration metadata mismatch')
    const metadataMatches = event.data.network === pending.network
      && event.data.title === pending.title
      && (event.data.description ?? '') === pending.description
      && event.data.report_type === pending.reportType
      && event.data.access === pending.access
      && Number(event.data.price ?? 0) === pending.priceOctas
      && event.data.file_type === pending.fileType
      && JSON.stringify(event.data.tags ?? []) === JSON.stringify(pending.tags)
      && (event.data.cipher_hash ?? '') === (input.cipherHash ?? '')
      && Number(event.data.encryption_version ?? 0) === (pending.access === 'premium' ? 1 : 0)
    if (!metadataMatches) throw new HttpError(409, 'Registration metadata does not match the prepared report')
    if (!event.data.owner || registryAddress().length === 0) throw new HttpError(409, 'Invalid registry event')
    await getDb().update(reports).set({
      blobName: input.blobName,
      cipherHash: input.cipherHash ?? null,
      encryptionIv: input.encryptionIv ?? null,
      encryptionVersion: pending.access === 'premium' ? 'aes-256-gcm-v1' : null,
      status: 'active', source: 'v2', chainVersion: event.transactionVersion, updatedAt: new Date(),
    }).where(eq(reports.id, id))
    return NextResponse.json({ data: await findReport(id, session.walletAddress) })
  } catch (error) { return apiError(error) }
}
