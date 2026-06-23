import { NextRequest, NextResponse } from 'next/server'
import { apiError, HttpError } from '@/server/http/errors'
import { cleanupExpiredState, importLegacyRegistry, syncRegistryV2 } from '@/server/indexer/sync'

async function run(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) throw new HttpError(401, 'Unauthorized')
    const legacyImported = await importLegacyRegistry()
    const eventsProcessed = await syncRegistryV2()
    await cleanupExpiredState()
    return NextResponse.json({ legacyImported, eventsProcessed })
  } catch (error) { return apiError(error) }
}

export const GET = run
export const POST = run
