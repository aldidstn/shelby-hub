import { ShelbyBlobClient, ShelbyRPCClient } from '@shelby-protocol/sdk/browser'
import {
  createDefaultErasureCodingProvider,
  generateCommitments,
  expectedTotalChunksets,
  defaultErasureCodingConfig,
} from '@shelby-protocol/sdk/browser'
import type { ShelbyNetwork } from '@shelby-protocol/sdk/browser'
import { Network } from '@aptos-labs/ts-sdk'
import type { PutBlobProgress } from '@shelby-protocol/sdk/browser'

export type UploadStep =
  | 'idle'
  | 'reading'
  | 'generating'
  | 'registering'
  | 'uploading'
  | 'done'
  | 'error'

export interface UploadProgress {
  step: UploadStep
  uploadedBytes: number
  totalBytes: number
  errorMessage?: string
}

export interface UploadParams {
  file: File
  blobName: string
  expirationMs: number
  network: 'shelbynet' | 'testnet'
  walletAddress: string
  signAndSubmit: (payload: { data: unknown; options?: { maxGasAmount?: number; gasUnitPrice?: number } }) => Promise<{ hash: string }>
  onProgress: (p: UploadProgress) => void
}

export interface UploadResult {
  id: string          // tx hash
  blobAccount: string // uploader's wallet address
  blobName: string    // key on the Shelby network
}

const REGISTER_BLOB_MAX_GAS = 500_000

const NETWORK_MAP: Record<string, ShelbyNetwork> = {
  shelbynet: Network.SHELBYNET as ShelbyNetwork,
  testnet:   Network.TESTNET   as ShelbyNetwork,
}

export async function uploadToShelby(params: UploadParams): Promise<UploadResult> {
  const { file, blobName, expirationMs, network, walletAddress, signAndSubmit, onProgress } = params

  const shelbyNetwork = NETWORK_MAP[network] ?? Network.TESTNET
  const rpcClient = new ShelbyRPCClient({ network: shelbyNetwork })
  const erasureConfig = defaultErasureCodingConfig()

  // Step 1 — Read file into memory
  onProgress({ step: 'reading', uploadedBytes: 0, totalBytes: file.size })
  const arrayBuffer = await file.arrayBuffer()
  const blobData = new Uint8Array(arrayBuffer)

  // Step 2 — Generate commitments (erasure coding, local computation)
  onProgress({ step: 'generating', uploadedBytes: 0, totalBytes: file.size })
  const provider = await createDefaultErasureCodingProvider()
  const commitments = await generateCommitments(provider, blobData)

  const expirationMicros = (Date.now() + expirationMs) * 1000

  // Step 3 — Register blob on-chain via wallet
  onProgress({ step: 'registering', uploadedBytes: 0, totalBytes: file.size })
  const { AccountAddress } = await import('@aptos-labs/ts-sdk')
  const payload = ShelbyBlobClient.createRegisterBlobPayload({
    account: AccountAddress.from(walletAddress),
    blobName,
    expirationMicros,
    blobMerkleRoot: commitments.blob_merkle_root,
    numChunksets: expectedTotalChunksets(blobData.length),
    blobSize: blobData.length,
    encoding: erasureConfig.enumIndex,
  })

  const txResponse = await signAndSubmit({
    data: payload,
    options: { maxGasAmount: REGISTER_BLOB_MAX_GAS },
  })

  // Step 4 — Upload blob data to Shelby nodes
  onProgress({ step: 'uploading', uploadedBytes: 0, totalBytes: file.size })
  await rpcClient.putBlob({
    account: walletAddress,
    blobName,
    blobData,
    onProgress: (p: PutBlobProgress) => {
      onProgress({ step: 'uploading', uploadedBytes: p.uploadedBytes, totalBytes: p.totalBytes })
    },
  })

  return { id: txResponse.hash, blobAccount: walletAddress, blobName }
}
