import { deserializeSignInOutput, verifySignInMessage, verifySignInSignature, type SerializedAptosSignInOutput } from '@aptos-labs/siwa'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSession } from '@/server/auth/session'
import { getDb } from '@/server/db/client'
import { authNonces } from '@/server/db/schema'
import { apiError, HttpError } from '@/server/http/errors'
import { normalizeAddress } from '@/lib/aptos/client'

const bodySchema = z.object({ output: z.record(z.string(), z.unknown()) })

export async function POST(request: NextRequest) {
  try {
    const { output } = bodySchema.parse(await request.json())
    const decoded = await deserializeSignInOutput(output as SerializedAptosSignInOutput)
    const nonce = decoded.input.nonce
    const [record] = await getDb().select().from(authNonces).where(and(
      eq(authNonces.nonce, nonce), isNull(authNonces.usedAt), gt(authNonces.expiresAt, new Date()),
    )).limit(1)
    if (!record) throw new HttpError(401, 'Challenge expired or already used')
    const signature = await verifySignInSignature(decoded)
    const message = await verifySignInMessage({
      publicKey: decoded.publicKey,
      input: decoded.input,
      expected: {
        domain: record.domain,
        nonce,
        uri: request.nextUrl.origin,
        version: '1',
        chainId: 'aptos:testnet',
        statement: 'Sign in to Shelby Research',
      },
    })
    if (!signature.valid || !message.valid) throw new HttpError(401, 'Invalid wallet signature')
    const consumed = await getDb().update(authNonces).set({ usedAt: new Date() }).where(and(
      eq(authNonces.nonce, nonce), isNull(authNonces.usedAt),
    )).returning({ nonce: authNonces.nonce })
    if (consumed.length !== 1) throw new HttpError(409, 'Challenge was already consumed')
    const walletAddress = normalizeAddress(decoded.input.address)
    const expiresAt = await createSession(walletAddress)
    return NextResponse.json({ walletAddress, expiresAt })
  } catch (error) { return apiError(error) }
}
