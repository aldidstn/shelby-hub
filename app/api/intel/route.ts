import { NextResponse } from 'next/server'

const POOL    = '0x06da0fd433c1a5d7a4faa01111c044910a184553'
const NETWORK = 'eth'
const API_KEY = process.env.COINGECKO_API_KEY ?? ''

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/onchain/networks/${NETWORK}/pools/${POOL}/trades?token=base`,
      {
        headers: { 'x-cg-demo-api-key': API_KEY },
        next: { revalidate: 0 },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `CoinGecko error: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Fetch failed' },
      { status: 500 }
    )
  }
}
