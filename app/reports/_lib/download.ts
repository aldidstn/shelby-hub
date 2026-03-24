const SHELBY_API_BASE = 'https://api.shelbynet.shelby.xyz/shelby/v1/blobs'

export type DownloadStatus = 'idle' | 'loading' | 'success' | 'error'

export interface DownloadResult {
  status: 'success' | 'error'
  message?: string
}

/**
 * Downloads a blob from the Shelby network using the public REST endpoint.
 * REST pattern: GET /shelby/v1/blobs/<account>/<blob-name>
 * No auth headers required for cross-account access.
 */
export async function downloadShelbyBlob(
  blobAccount: string,
  blobName: string,
  fileName: string,
): Promise<DownloadResult> {
  const url = `${SHELBY_API_BASE}/${blobAccount}/${blobName}`

  const response = await fetch(url)

  if (!response.ok) {
    return {
      status: 'error',
      message: `Failed to fetch blob: ${response.status} ${response.statusText}`,
    }
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
