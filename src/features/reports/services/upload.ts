import { SHELBY_DEPLOYER, ShelbyBlobClient, ShelbyMetadataClient, ShelbyRPCClient } from '@shelby-protocol/sdk/browser'
import {
  createDefaultErasureCodingProvider,
  generateCommitments,
  expectedTotalChunksets,
  defaultErasureCodingConfig,
} from '@shelby-protocol/sdk/browser'
import { Network } from '@aptos-labs/ts-sdk'
import type { PutBlobChunksetsProgress } from '@shelby-protocol/sdk/browser'
import {
  createDefaultErasureCodingProvider as createLegacyErasureCodingProvider,
  defaultErasureCodingConfig as legacyErasureCodingConfig,
  expectedTotalChunksets as legacyExpectedTotalChunksets,
  generateCommitments as generateLegacyCommitments,
  ShelbyBlobClient as LegacyShelbyBlobClient,
  ShelbyRPCClient as LegacyShelbyRPCClient,
} from '@shelby-protocol/sdk-legacy/browser'
import type { PutBlobProgress as LegacyPutBlobProgress, ShelbyNetwork as LegacyShelbyNetwork } from '@shelby-protocol/sdk-legacy/browser'
import { aptosForNetwork } from '@/lib/aptos/client'

export type UploadStep =
  | 'idle'
  | 'reading'
  | 'generating'
  | 'registering'
  | 'uploading'
  | 'publishing'   // registering metadata in the on-chain report registry
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

async function uploadToShelbyTestnet(params: UploadParams): Promise<UploadResult> {
  const { file, blobName, expirationMs, walletAddress, signAndSubmit, onProgress } = params
  const rpcClient = new LegacyShelbyRPCClient({ network: Network.TESTNET as LegacyShelbyNetwork })
  const erasureConfig = legacyErasureCodingConfig()

  onProgress({ step: 'reading', uploadedBytes: 0, totalBytes: file.size })
  const blobData = new Uint8Array(await file.arrayBuffer())
  onProgress({ step: 'generating', uploadedBytes: 0, totalBytes: file.size })
  const commitments = await generateLegacyCommitments(await createLegacyErasureCodingProvider(), blobData)

  onProgress({ step: 'registering', uploadedBytes: 0, totalBytes: file.size })
  const { AccountAddress } = await import('@aptos-labs/ts-sdk')
  const registration = await signAndSubmit({
    data: LegacyShelbyBlobClient.createRegisterBlobPayload({
      account: AccountAddress.from(walletAddress),
      blobName,
      expirationMicros: (Date.now() + expirationMs) * 1000,
      blobMerkleRoot: commitments.blob_merkle_root,
      numChunksets: legacyExpectedTotalChunksets(blobData.length),
      blobSize: blobData.length,
      encoding: erasureConfig.enumIndex,
    }),
    options: { maxGasAmount: REGISTER_BLOB_MAX_GAS },
  })

  onProgress({ step: 'uploading', uploadedBytes: 0, totalBytes: file.size })
  await rpcClient.putBlob({
    account: walletAddress,
    blobName,
    blobData,
    onProgress: (progress: LegacyPutBlobProgress) => onProgress({
      step: 'uploading',
      uploadedBytes: progress.uploadedBytes,
      totalBytes: progress.totalBytes,
    }),
  })

  return { id: registration.hash, blobAccount: walletAddress, blobName }
}

async function activeShelbyNetLocation() {
  const locations = await new ShelbyMetadataClient({ network: Network.SHELBYNET }).getLocationNames()
  if (!locations[0]) throw new Error('ShelbyNet has no active storage location')
  return locations[0]
}

async function uploadToShelbyNet(params: UploadParams): Promise<UploadResult> {
  const { file, blobName, expirationMs, walletAddress, signAndSubmit, onProgress } = params
  const rpcClient = new ShelbyRPCClient({ network: Network.SHELBYNET })
  const erasureConfig = defaultErasureCodingConfig()

  // Step 1 — Read file into memory
  onProgress({ step: 'reading', uploadedBytes: 0, totalBytes: file.size })
  const arrayBuffer = await file.arrayBuffer()
  const blobData = new Uint8Array(arrayBuffer)

  // Step 2 — Generate commitments (erasure coding, local computation)
  onProgress({ step: 'generating', uploadedBytes: 0, totalBytes: file.size })
  const provider = await createDefaultErasureCodingProvider()
  const commitments = await generateCommitments(provider, blobData)
  const locationHint = await activeShelbyNetLocation()

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
    locationHint,
  })

  const txResponse = await signAndSubmit({
    data: payload,
    options: { maxGasAmount: REGISTER_BLOB_MAX_GAS },
  })

  const aptos = aptosForNetwork('shelbynet')
  const registerTransaction = await aptos.waitForTransaction({ transactionHash: txResponse.hash })
  if (!('events' in registerTransaction) || !registerTransaction.success) {
    throw new Error('Shelby blob registration transaction failed')
  }
  const deployer = AccountAddress.from(SHELBY_DEPLOYER)
  const registered = ShelbyBlobClient.registeredBlobUids(registerTransaction.events, deployer)
  if (registered.length !== 1) throw new Error('Shelby did not return a blob UID after registration')

  // Step 4 — Upload blob data to Shelby nodes
  onProgress({ step: 'uploading', uploadedBytes: 0, totalBytes: file.size })
  const { spAcks } = await rpcClient.putBlobChunksets({
    accountAddress: walletAddress,
    uid: registered[0].uid,
    blobData,
    commitments,
    onProgress: (p: PutBlobChunksetsProgress) => {
      onProgress({ step: 'uploading', uploadedBytes: p.uploadedBytes, totalBytes: p.totalBytes })
    },
  })

  // Step 5 — Bind the uploaded bytes to the registered object name.
  onProgress({ step: 'publishing', uploadedBytes: file.size, totalBytes: file.size })
  const commitResponse = await signAndSubmit({
    data: ShelbyBlobClient.createCommitObjectPayload({
      uid: registered[0].uid,
      blobName,
      overwrite: false,
      storageProviderAcks: spAcks,
    }),
    options: { maxGasAmount: REGISTER_BLOB_MAX_GAS },
  })
  const commitTransaction = await aptos.waitForTransaction({ transactionHash: commitResponse.hash })
  if (!('events' in commitTransaction) || !commitTransaction.success) {
    throw new Error('Shelby blob commit transaction failed')
  }
  const rejection = ShelbyBlobClient.findObjectCommitRejection(
    commitTransaction.events,
    deployer,
    registered[0].uid,
  )
  if (rejection) throw new Error(`Shelby rejected the blob commit: ${rejection}`)

  return { id: commitResponse.hash, blobAccount: walletAddress, blobName }
}

export async function uploadToShelby(params: UploadParams): Promise<UploadResult> {
  return params.network === 'testnet' ? uploadToShelbyTestnet(params) : uploadToShelbyNet(params)
}
