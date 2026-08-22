import { sendGAEvent } from '@next/third-parties/google'
import type { Report } from '@/features/reports/types/report'

type AnalyticsValue = boolean | number | string
type ReportEntitlement = 'authorized' | 'free' | 'owner' | 'purchaser'

function sendEvent(name: string, parameters: Record<string, AnalyticsValue | undefined> = {}) {
  if (typeof window === 'undefined' || !window.dataLayer) return

  const definedParameters = Object.fromEntries(
    Object.entries(parameters).filter((entry): entry is [string, AnalyticsValue] => entry[1] !== undefined),
  )
  sendGAEvent('event', name, definedParameters)
}

function reportParameters(report: Report) {
  return {
    access_type: report.access,
    file_type: report.fileType,
    report_type: report.type.toLowerCase(),
    storage_network: report.network ?? 'testnet',
  }
}

export function trackWalletConnected(walletName: string) {
  sendEvent('login', { method: walletName.toLowerCase() })
}

export function trackReportShared(report: Report) {
  sendEvent('share', {
    method: 'copy_link',
    content_type: 'report',
    ...reportParameters(report),
  })
}

export function trackReportDownloaded(report: Report, entitlement: ReportEntitlement) {
  sendEvent('report_download', {
    ...reportParameters(report),
    entitlement,
  })
}

export function trackReportPurchased(report: Report) {
  sendEvent('report_purchase', {
    ...reportParameters(report),
    price_apt: report.price,
  })
}

export function trackReportUploaded(report: Report) {
  sendEvent('report_upload', reportParameters(report))
}
