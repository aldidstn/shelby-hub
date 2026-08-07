import type { Metadata } from 'next'
import { LandingPage } from '@/features/landing/components/LandingPage'

export const metadata: Metadata = {
  title: { absolute: 'Shelby Scribe — Independent crypto intelligence' },
  description: 'Discover independent research, smart-money datasets, and on-chain intelligence delivered through Shelby Protocol and Aptos.',
}

export default function HomePage() {
  return <LandingPage />
}
