import { NextResponse } from 'next/server'
import { destroySession, getOptionalSession } from '@/server/auth/session'
import { apiError } from '@/server/http/errors'

export async function GET() {
  try {
    const session = await getOptionalSession()
    return NextResponse.json({ authenticated: Boolean(session), walletAddress: session?.walletAddress ?? null })
  } catch (error) { return apiError(error) }
}

export async function DELETE() {
  try {
    await destroySession()
    return NextResponse.json({ authenticated: false })
  } catch (error) { return apiError(error) }
}
