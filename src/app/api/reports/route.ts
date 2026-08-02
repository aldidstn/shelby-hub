import { NextRequest, NextResponse } from 'next/server'
import { getOptionalSession, requireSession } from '@/server/auth/session'
import { getDb } from '@/server/db/client'
import { encryptionKeys, reports } from '@/server/db/schema'
import { apiError, HttpError } from '@/server/http/errors'
import { createReportDataKey, isPremiumEncryptionConfigured } from '@/server/encryption/keys'
import { listReports } from '@/server/reports/repository'
import { prepareReportSchema } from '@/features/reports/schemas/report'

export async function GET(request: NextRequest) {
  try {
    const session = await getOptionalSession()
    const query = request.nextUrl.searchParams.get('q') ?? undefined
    const mine = request.nextUrl.searchParams.get('mine') === '1'
    const data = await listReports({ query, owner: mine ? session?.walletAddress : undefined, walletAddress: session?.walletAddress })
    return NextResponse.json({ data })
  } catch (error) { return apiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const input = prepareReportSchema.parse(await request.json())
    if (input.access === 'premium' && !isPremiumEncryptionConfigured()) {
      throw new HttpError(503, 'Paid uploads are unavailable until premium encryption is configured')
    }
    const id = crypto.randomUUID()
    let plaintextKey: string | undefined
    await getDb().transaction(async (tx) => {
      await tx.insert(reports).values({
        id, ownerAddress: session.walletAddress, blobAccount: session.walletAddress, title: input.title, description: input.description,
        reportType: input.reportType, access: input.access, priceOctas: input.priceOctas,
        fileType: input.fileType, tags: input.tags, network: input.network, status: 'pending', source: 'pending',
      })
      if (input.access === 'premium') {
        let key
        try {
          key = await createReportDataKey(id)
        } catch (error) {
          console.error('Premium data-key generation failed', error)
          throw new HttpError(503, 'The premium encryption service is temporarily unavailable')
        }
        plaintextKey = key.plaintextKey
        await tx.insert(encryptionKeys).values({
          reportId: id,
          wrappedKey: key.wrappedKey,
          wrappingKeyId: key.wrappingKeyId,
          keyVersion: key.keyVersion,
        })
      }
    })
    return NextResponse.json({ id, dataKey: plaintextKey, encryptionVersion: plaintextKey ? 'aes-256-gcm-v1' : undefined }, {
      status: 201, headers: { 'Cache-Control': 'no-store, private' },
    })
  } catch (error) { return apiError(error) }
}
