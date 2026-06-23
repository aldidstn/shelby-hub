const BASE_URLS: Record<'shelbynet' | 'testnet', string> = {
  shelbynet: 'https://api.shelbynet.shelby.xyz/shelby/v1/blobs',
  testnet:   'https://api.testnet.shelby.xyz/shelby/v1/blobs',
}

export type DownloadStatus = 'idle' | 'loading' | 'success' | 'error'

export interface DownloadResult {
  status: 'success' | 'error'
  message?: string
}

/** Returns the public REST URL for inline reading (text fetch / media src). */
export function getBlobReadUrl(
  blobAccount: string,
  blobName: string,
  network: 'shelbynet' | 'testnet' = 'testnet',
): string {
  return `${BASE_URLS[network]}/${blobAccount}/${blobName}`
}

/**
 * Downloads a blob from the Shelby network via the public REST API.
 * GET /shelby/v1/blobs/<account>/<blob-name> — no auth required.
 */
export async function downloadShelbyBlob(
  blobAccount: string,
  blobName: string,
  fileName: string,
  network: 'shelbynet' | 'testnet' = 'testnet',
): Promise<DownloadResult> {
  const url = getBlobReadUrl(blobAccount, blobName, network)
  const response = await fetch(url)

  if (!response.ok) {
    return { status: 'error', message: `HTTP ${response.status} ${response.statusText}` }
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)

  return { status: 'success' }
}
