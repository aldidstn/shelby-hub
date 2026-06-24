export const REPORT_TYPES = ['Research', 'Analysis', 'Intel', 'Document', 'Report'] as const
export const REPORT_ACCESS = ['free', 'premium'] as const
export const SHELBY_NETWORKS = ['testnet', 'shelbynet'] as const

export type ReportType = typeof REPORT_TYPES[number]
export type ReportAccess = typeof REPORT_ACCESS[number]
export type ShelbyNetwork = typeof SHELBY_NETWORKS[number]

export interface Report {
  id: string
  title: string
  description: string
  type: ReportType
  access: ReportAccess
  price?: number
  likes: number
  downloads: number
  author: string
  authorAddress: string
  createdAt: string
  onChain: boolean
  fileType: 'pdf' | 'md' | 'csv' | 'json' | 'mp4' | 'webm' | 'mov' | 'mp3' | 'wav' | 'ogg' | 'txt'
  tags: string[]
  blobAccount?: string
  blobName?: string
  network?: ShelbyNetwork
  encryptionVersion?: 'aes-256-gcm-v1' | 'ace-ibe-v1'
  encryptionIv?: string
  cipherHash?: string
  purchased?: boolean
  owned?: boolean
  active?: boolean
}
