import { NextResponse } from 'next/server'

export async function GET() {
  const hasDatabase = Boolean(process.env.DATABASE_URL)
  const hasRegistryV2 = Boolean(process.env.NEXT_PUBLIC_REGISTRY_V2_ADDRESS)
  const hasAce = hasRegistryV2 && Boolean(
    process.env.NEXT_PUBLIC_ACE_DEPLOYMENT_NAME
      || (
        process.env.NEXT_PUBLIC_ACE_API_ENDPOINT
        && process.env.NEXT_PUBLIC_ACE_CONTRACT_ADDRESS
        && process.env.NEXT_PUBLIC_ACE_KEYPAIR_ID
        && process.env.NEXT_PUBLIC_ACE_CHAIN_ID
      ),
  )

  return NextResponse.json({
    uploads: {
      free: true,
      premium: hasAce,
    },
    ace: {
      configured: hasAce,
    },
    database: {
      configured: hasDatabase,
    },
  }, {
    headers: { 'Cache-Control': 'no-store, private' },
  })
}
