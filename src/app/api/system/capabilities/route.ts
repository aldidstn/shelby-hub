import { NextResponse } from 'next/server'
import { isKmsConfigured } from '@/server/kms/keys'

export async function GET() {
  const hasDatabase = Boolean(process.env.DATABASE_URL)
  const hasRegistryV2 = Boolean(process.env.NEXT_PUBLIC_REGISTRY_V2_ADDRESS)
  const hasKms = isKmsConfigured()
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
      premium: hasDatabase && hasRegistryV2 && hasKms,
    },
    premiumEncryption: {
      configured: hasDatabase && hasRegistryV2 && hasKms,
      provider: 'aws-kms',
    },
    ace: {
      configured: hasAce,
      legacyReadOnly: true,
    },
    database: {
      configured: hasDatabase,
    },
  }, {
    headers: { 'Cache-Control': 'no-store, private' },
  })
}
