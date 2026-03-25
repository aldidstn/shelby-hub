export type ReportType = 'Research' | 'Analysis' | 'Intel' | 'Document' | 'Report'

export type ReportAccess = 'free' | 'premium'

export interface Report {
  id: string
  title: string
  description: string
  type: ReportType
  access: ReportAccess
  price?: number        // APT amount, only for premium
  likes: number
  downloads: number
  author: string
  authorAddress: string
  createdAt: string     // ISO date string
  onChain: boolean
  fileType: 'pdf' | 'md' | 'csv' | 'json' | 'mp4' | 'webm' | 'mov' | 'mp3' | 'wav' | 'ogg' | 'txt'
  tags: string[]
  // Shelby blob info — present when file is stored on-chain
  blobAccount?: string                    // Shelby account that uploaded the file
  blobName?: string                       // Blob name on the Shelby network
  network?: 'shelbynet' | 'testnet'       // Which Shelby network the blob lives on
}
