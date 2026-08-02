import { deserializeSignInOutput, type SerializedAptosSignInOutput } from '@aptos-labs/siwa'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSession } from '@/server/auth/session'
import { getDb } from '@/server/db/client'
import { authNonces } from '@/server/db/schema'
import { apiError, HttpError } from '@/server/http/errors'
import { normalizeAddress } from '@/lib/aptos/client'
import { expectedSignInInput, verifyWalletSignIn } from '@/server/auth/siwa'

const bodySchema = z.object({ output: z.record(z.string(), z.unknown()) })

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      throw new HttpError(503, 'Wallet sessions require DATABASE_URL to be configured')
    }

    const { output } = bodySchema.parse(await request.json())
    const decoded = await deserializeSignInOutput(output as SerializedAptosSignInOutput)
    const nonce = decoded.input.nonce
    const [record] = await getDb().select().from(authNonces).where(and(
      eq(authNonces.nonce, nonce), isNull(authNonces.usedAt), gt(authNonces.expiresAt, new Date()),
    )).limit(1)
    if (!record) throw new HttpError(401, 'Challenge expired or already used')
    const verification = await verifyWalletSignIn(decoded, expectedSignInInput(record, request.nextUrl.origin))
    if (!verification.valid) {
      console.warn('SIWA verification rejected', {
        stage: verification.stage,
        errors: verification.errors,
        scheme: decoded.type,
      })
      throw new HttpError(401, verification.stage === 'signature'
        ? 'Invalid wallet signature'
        : 'Wallet sign-in challenge did not match')
    }
    const consumed = await getDb().update(authNonces).set({ usedAt: new Date() }).where(and(
      eq(authNonces.nonce, nonce), isNull(authNonces.usedAt),
    )).returning({ nonce: authNonces.nonce })
    if (consumed.length !== 1) throw new HttpError(409, 'Challenge was already consumed')
    const walletAddress = normalizeAddress(decoded.input.address)
    const expiresAt = await createSession(walletAddress)
    return NextResponse.json({ walletAddress, expiresAt })
  } catch (error) { return apiError(error) }
}
