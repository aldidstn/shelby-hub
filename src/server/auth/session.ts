import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { getDb } from '@/server/db/client'
import { sessions } from '@/server/db/schema'
import { HttpError } from '@/server/http/errors'

const COOKIE_NAME = 'shelby_session'
const SESSION_AGE_MS = 30 * 24 * 60 * 60 * 1000

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(walletAddress: string) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_AGE_MS)
  await getDb().insert(sessions).values({ tokenHash: hashToken(token), walletAddress, expiresAt })
  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
  return expiresAt
}

export async function requireSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) throw new HttpError(401, 'Wallet authentication required')
  const [session] = await getDb().select().from(sessions).where(and(
    eq(sessions.tokenHash, hashToken(token)),
    gt(sessions.expiresAt, new Date()),
  )).limit(1)
  if (!session) throw new HttpError(401, 'Session expired')
  return session
}

export async function getOptionalSession() {
  try { return await requireSession() } catch { return null }
}

export async function destroySession() {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  try {
    if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
  } finally {
    jar.delete(COOKIE_NAME)
  }
}
