import { generateNonce } from '@aptos-labs/siwa'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/server/db/client'
import { authNonces } from '@/server/db/schema'
import { apiError, HttpError } from '@/server/http/errors'
import { encodeSignInChallengeContext, siwaChainIdForNetwork, SIWA_STATEMENT } from '@/server/auth/siwa'
import { z } from 'zod'

const bodySchema = z.object({
  network: z.enum(['testnet', 'shelbynet']).default('testnet'),
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      throw new HttpError(503, 'Wallet sessions require DATABASE_URL to be configured')
    }

    const { network } = bodySchema.parse(await request.json().catch(() => ({})))
    const chainId = siwaChainIdForNetwork(network)
    const nonce = generateNonce()
    const issuedAt = new Date()
    const expiresAt = new Date(issuedAt.getTime() + 5 * 60 * 1000)
    const domain = request.nextUrl.host
    await getDb().insert(authNonces).values({
      nonce,
      domain: encodeSignInChallengeContext(domain, network),
      expiresAt,
      createdAt: issuedAt,
    })
    return NextResponse.json({
      input: {
        domain,
        nonce,
        uri: request.nextUrl.origin,
        version: '1',
        chainId,
        statement: SIWA_STATEMENT,
        issuedAt: issuedAt.toISOString(),
        expirationTime: expiresAt.toISOString(),
      },
    })
  } catch (error) { return apiError(error) }
}
