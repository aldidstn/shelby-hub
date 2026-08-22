import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Report } from '@/features/reports/types/report'

const { sendGAEvent } = vi.hoisted(() => ({ sendGAEvent: vi.fn() }))

vi.mock('@next/third-parties/google', () => ({ sendGAEvent }))

import {
  trackReportDownloaded,
  trackReportPurchased,
  trackReportShared,
  trackReportUploaded,
  trackWalletConnected,
} from '@/lib/analytics'

const report: Report = {
  id: 'private-report-id',
  title: 'Private report title',
  description: 'Private description',
  type: 'Research',
  access: 'premium',
  price: 1.25,
  likes: 0,
  downloads: 0,
  author: '0xprivate',
  authorAddress: '0xprivate-wallet-address',
  createdAt: '2026-08-22T00:00:00.000Z',
  onChain: true,
  fileType: 'pdf',
  tags: ['private-tag'],
  blobAccount: '0xprivate-wallet-address',
  blobName: 'private-file.pdf.enc',
  network: 'shelbynet',
}

describe('analytics events', () => {
  beforeEach(() => {
    sendGAEvent.mockClear()
    window.dataLayer = []
  })

  it('sends the supported product event taxonomy without identifying report data', () => {
    trackWalletConnected('Petra')
    trackReportShared(report)
    trackReportUploaded(report)
    trackReportPurchased(report)
    trackReportDownloaded(report, 'purchaser')

    expect(sendGAEvent).toHaveBeenCalledTimes(5)
    expect(sendGAEvent.mock.calls).toEqual([
      ['event', 'login', { method: 'petra' }],
      ['event', 'share', {
        method: 'copy_link', content_type: 'report', access_type: 'premium', file_type: 'pdf', report_type: 'research', storage_network: 'shelbynet',
      }],
      ['event', 'report_upload', {
        access_type: 'premium', file_type: 'pdf', report_type: 'research', storage_network: 'shelbynet',
      }],
      ['event', 'report_purchase', {
        access_type: 'premium', file_type: 'pdf', report_type: 'research', storage_network: 'shelbynet', price_apt: 1.25,
      }],
      ['event', 'report_download', {
        access_type: 'premium', file_type: 'pdf', report_type: 'research', storage_network: 'shelbynet', entitlement: 'purchaser',
      }],
    ])

    expect(JSON.stringify(sendGAEvent.mock.calls)).not.toContain(report.id)
    expect(JSON.stringify(sendGAEvent.mock.calls)).not.toContain(report.title)
    expect(JSON.stringify(sendGAEvent.mock.calls)).not.toContain(report.authorAddress)
    expect(JSON.stringify(sendGAEvent.mock.calls)).not.toContain(report.blobName)
  })

  it('does nothing before the production data layer is initialized', () => {
    delete window.dataLayer
    trackReportUploaded(report)
    expect(sendGAEvent).not.toHaveBeenCalled()
  })
})
