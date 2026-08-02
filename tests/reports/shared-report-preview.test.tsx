import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Report } from '@/features/reports/types/report'

const wallet = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('@aptos-labs/wallet-adapter-react', () => ({
  useWallet: () => wallet.current,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/features/auth/useWalletSession', () => ({
  useWalletSession: () => ({ authenticate: vi.fn() }),
}))
vi.mock('@/features/reports/services/download', () => ({
  downloadErrorMessage: (error: unknown) => error instanceof Error ? error.message : 'Download failed',
  downloadReport: vi.fn(),
}))

import { SharedReportPreview } from '@/features/reports/components/SharedReportPreview'

const report: Report = {
  id: 'shared-report',
  title: 'Smart Money Q2',
  description: 'Wallet movement research.',
  type: 'Research',
  access: 'free',
  likes: 0,
  downloads: 0,
  author: 'Shelby Analyst',
  authorAddress: '0x1234567890abcdef1234567890abcdef',
  createdAt: '2026-06-27T10:00:00.000Z',
  onChain: true,
  fileType: 'pdf',
  tags: [],
  blobAccount: '0x123',
  blobName: 'smart-money.pdf',
  network: 'testnet',
  active: true,
}

describe('shared report preview', () => {
  afterEach(cleanup)

  beforeEach(() => {
    wallet.current = { account: null, connected: false, signMessage: vi.fn() }
  })

  it('shows the accepted metadata and download action for a free file', () => {
    render(<SharedReportPreview report={report} />)

    expect(screen.getByRole('dialog', { name: 'Smart Money Q2' })).toBeInTheDocument()
    expect(screen.getByText('PDF', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('Research', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('Free', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('June 27, 2026')).toBeInTheDocument()
    expect(screen.getByText('Shelby Analyst')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download file' })).toBeInTheDocument()
  })

  it('offers purchase for a paid file without verified access', () => {
    render(<SharedReportPreview report={{ ...report, access: 'premium', price: 2.5 }} />)

    expect(screen.getByText('2.5 APT', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Purchase for 2.5 APT' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download file' })).not.toBeInTheDocument()
  })

  it('allows a verified purchaser to download a paid file', () => {
    render(<SharedReportPreview report={{ ...report, access: 'premium', price: 2.5, purchased: true }} />)

    expect(screen.getByRole('button', { name: 'Download file' })).toBeInTheDocument()
  })
})
